import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, CheckSquare, MapPin, ChevronDown } from "lucide-react";
import { dim as base44 } from "@/api/dimDataClient";

export default function BulkUpdateBar({ selectedIds, allItems, categories, suppliers, locationRecords = [], onDone, onClear }) {
  const [updating, setUpdating] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [locPopoverOpen, setLocPopoverOpen] = useState(false);

  const count = selectedIds.length;

  // Build hierarchical location list: parent → children
  const parentLocations = locationRecords.filter(l => !l.parent_location_id);
  const childrenOf = (parentId) => locationRecords.filter(l => l.parent_location_id === parentId);
  const standalone = locationRecords.filter(l => !l.parent_location_id && childrenOf(l.id).length === 0);

  const toggleLocation = (name) => {
    setSelectedLocations(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleApply = async () => {
    if (!categoryId && !supplierId && selectedLocations.length === 0) return;
    setUpdating(true);
    const updates = {};
    if (categoryId) updates.category_id = categoryId === "__none__" ? null : categoryId;
    if (supplierId) updates.supplier_id = supplierId === "__none__" ? null : supplierId;
    if (selectedLocations.length > 0) updates.locations = selectedLocations;

    for (const id of selectedIds) {
      await base44.entities.InventoryItem.update(id, updates);
    }
    setUpdating(false);
    setCategoryId("");
    setSupplierId("");
    setSelectedLocations([]);
    onDone();
  };

  const hasChanges = categoryId || supplierId || selectedLocations.length > 0;

  return (
    <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <CheckSquare className="h-4 w-4 text-indigo-400" />
          <span className="text-sm font-semibold">{count} selected</span>
          <button onClick={onClear} className="ml-1 text-slate-400 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 flex-1">
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700 text-white w-36">
              <SelectValue placeholder="Set Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— No Category —</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700 text-white w-36">
              <SelectValue placeholder="Set Supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— No Supplier —</SelectItem>
              {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Multi-location picker */}
          <Popover open={locPopoverOpen} onOpenChange={setLocPopoverOpen}>
            <PopoverTrigger asChild>
              <button className="h-8 text-xs bg-slate-800 border border-slate-700 text-white rounded-md px-3 flex items-center gap-1.5 hover:bg-slate-700 transition-colors">
                <MapPin className="h-3 w-3" />
                {selectedLocations.length === 0
                  ? "Set Locations"
                  : `${selectedLocations.length} location${selectedLocations.length > 1 ? "s" : ""}`}
                <ChevronDown className="h-3 w-3 ml-0.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start" side="top" sideOffset={8}>
              <p className="text-xs text-slate-500 px-2 pb-2 font-medium">Select locations</p>
              <div className="max-h-56 overflow-y-auto space-y-0.5">
                {locationRecords.length === 0 && (
                  <p className="text-xs text-slate-400 px-2 py-1">No locations defined</p>
                )}
                {parentLocations.map(parent => {
                  const children = childrenOf(parent.id);
                  return (
                    <div key={parent.id}>
                      {children.length > 0 ? (
                        <>
                          {/* Parent as selectable row + group header */}
                          <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
                            <Checkbox
                              checked={selectedLocations.includes(parent.name)}
                              onCheckedChange={() => toggleLocation(parent.name)}
                            />
                            <span className="text-sm font-semibold text-slate-700">{parent.name}</span>
                          </label>
                          {children.map(child => (
                            <label key={child.id} className="flex items-center gap-2 pl-6 pr-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
                              <Checkbox
                                checked={selectedLocations.includes(child.name)}
                                onCheckedChange={() => toggleLocation(child.name)}
                              />
                              <span className="text-sm text-slate-600">{child.name}</span>
                            </label>
                          ))}
                        </>
                      ) : (
                        <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
                          <Checkbox
                            checked={selectedLocations.includes(parent.name)}
                            onCheckedChange={() => toggleLocation(parent.name)}
                          />
                          <span className="text-sm">{parent.name}</span>
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
              {selectedLocations.length > 0 && (
                <button
                  onClick={() => setSelectedLocations([])}
                  className="w-full mt-2 text-xs text-slate-400 hover:text-slate-600 text-center py-1"
                >
                  Clear selection
                </button>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <Button
          size="sm"
          disabled={!hasChanges || updating}
          onClick={handleApply}
          className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white h-8 text-xs"
        >
          {updating ? "Applying..." : "Apply"}
        </Button>
      </div>
    </div>
  );
}