import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { Upload, X, Loader2, DollarSign, Package, MapPin, Tag, Hash, ScanLine, Wrench, CalendarClock } from "lucide-react";
import { dim as base44 } from "@/api/dimDataClient";
import BarcodeScanner from "./BarcodeScanner";

function LocationCheckboxList({ locations, selected, onChange }) {
  const parents = useMemo(() => locations.filter(l => !l.parent_location_id), [locations]);
  const childrenByParent = useMemo(() => {
    const map = {};
    locations.filter(l => l.parent_location_id).forEach(c => {
      if (!map[c.parent_location_id]) map[c.parent_location_id] = [];
      map[c.parent_location_id].push(c);
    });
    return map;
  }, [locations]);
  const orphans = useMemo(() =>
    locations.filter(l => l.parent_location_id && !parents.find(p => p.id === l.parent_location_id)),
    [locations, parents]
  );

  // `selected` is an array of location IDs stored on the item.
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  useEffect(() => {
    if (locations.length === 0) return;
    // Support both legacy name-based and new ID-based storage
    const ids = new Set();
    selected.forEach(val => {
      // If val is an ID that exists, use it directly
      if (locations.find(l => l.id === val)) {
        ids.add(val);
      } else {
        // Legacy: val is a name, resolve to ID (first match)
        const match = locations.find(l => l.name === val);
        if (match) ids.add(match.id);
      }
    });
    setSelectedIds(ids);
  }, [selected.join(","), locations.length]);

  const commitIds = (ids) => {
    setSelectedIds(ids);
    // Store IDs (not names) to uniquely identify locations
    onChange(Array.from(ids));
  };

  const toggle = (loc) => {
    const newIds = new Set(selectedIds);
    if (newIds.has(loc.id)) {
      newIds.delete(loc.id);
    } else {
      newIds.add(loc.id);
      // When selecting a sub-location, also select its parent
      if (loc.parent_location_id) {
        newIds.add(loc.parent_location_id);
      }
    }
    commitIds(newIds);
  };

  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-white max-h-48 overflow-y-auto space-y-0.5">
      {parents.map(parent => (
        <div key={parent.id}>
          <label className="flex items-center gap-2 cursor-pointer py-1 hover:bg-slate-50 rounded px-1">
            <input
              type="checkbox"
              checked={selectedIds.has(parent.id)}
              onChange={() => toggle(parent)}
              className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
            />
            <span className="text-sm font-semibold text-slate-800">{parent.name}</span>
          </label>
          {(childrenByParent[parent.id] || []).map(sub => (
            <label key={sub.id} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-slate-50 rounded px-1 pl-6">
              <input
                type="checkbox"
                checked={selectedIds.has(sub.id)}
                onChange={() => toggle(sub)}
                className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
              />
              <span className="text-sm text-slate-600">↳ {sub.name}</span>
            </label>
          ))}
        </div>
      ))}
      {orphans.map(loc => (
        <label key={loc.id} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-slate-50 rounded px-1">
          <input
            type="checkbox"
            checked={selectedIds.has(loc.id)}
            onChange={() => toggle(loc)}
            className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
          />
          <span className="text-sm text-slate-800">{loc.name}</span>
        </label>
      ))}
    </div>
  );
}

export default function ItemForm({ open, onClose, item, categories, suppliers = [], onSave, isAdmin = true }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    barcode: "",
    category_id: "",
    supplier_id: "",
    case_quantity: 0,
    case_unit: "cases",
    units_per_case: "",
    unit: "pieces",
    min_cases: 0,
    max_cases: 0,
    unit_cost: 0,
    location: "",
    locations: [],
    notes: "",
    image_url: "",
    tags: [],
    out_for_repair: false,
    repair_return_date: "",
    repair_notes: "",
    non_trusted: false,
    expiration_date: ""
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: () => base44.entities.Location.list("name"),
  });
  
  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || "",
        description: item.description || "",
        sku: item.sku || "",
        barcode: item.barcode || "",
        category_id: item.category_id || "",
        supplier_id: item.supplier_id || "",
        case_quantity: item.case_quantity || 0,
        case_unit: item.case_unit || "cases",
        units_per_case: item.units_per_case ?? "",
        unit: item.unit || "pieces",
        min_cases: item.min_cases || 0,
        max_cases: item.max_cases || 0,
        unit_cost: item.unit_cost || 0,
        location: item.location || "",
        locations: item.locations || (item.location ? [item.location] : []),
        notes: item.notes || "",
        image_url: item.image_url || "",
        tags: item.tags || [],
        out_for_repair: item.out_for_repair || false,
        repair_return_date: item.repair_return_date || "",
        repair_notes: item.repair_notes || "",
        non_trusted: item.non_trusted || false,
        expiration_date: item.expiration_date || ""
      });
    } else {
      setFormData({
        name: "",
        description: "",
        sku: "",
        barcode: "",
        category_id: "",
        supplier_id: "",
        case_quantity: 0,
        case_unit: "cases",
        units_per_case: 1,
        min_cases: 0,
        max_cases: 0,
        unit_cost: 0,
        location: "",
    locations: [],
        notes: "",
        image_url: "",
        tags: [],
        out_for_repair: false,
        repair_return_date: "",
        repair_notes: "",
        non_trusted: false,
        expiration_date: ""
      });
    }
  }, [item, open]);
  
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, image_url: file_url }));
    setUploading(false);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(formData, item);
    setSaving(false);
    onClose();
  };

  const handleBarcodeDetected = (code) => {
    setFormData(prev => ({ ...prev, barcode: code }));
  };
  
  const totalUnits = (formData.case_quantity || 0) * (formData.units_per_case || 0);
  const totalValue = totalUnits * (formData.unit_cost || 0);
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-slate-900">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {item?.id ? "Edit Item" : "Add New Item"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {!isAdmin && item?.id && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <span className="font-medium">Staff mode:</span> You can only update the stock count for this item.
            </div>
          )}

          {/* Image Upload */}
          {isAdmin && <div className="space-y-2">
            <Label>Item Image</Label>
            <div className="flex items-start gap-4">
              <div className="h-32 w-32 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-200">
                {formData.image_url ? (
                  <img src={formData.image_url} alt="Preview" className="h-full w-full object-cover" />
                ) : uploading ? (
                  <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                ) : (
                  <Package className="h-8 w-8 text-slate-300" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("image-upload").click()}
                  disabled={uploading}
                  className="bg-white text-slate-900 border-slate-200"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload Image"}
                </Button>
                {formData.image_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, image_url: "" }))}
                    className="text-slate-900"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>}
          
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => (isAdmin || !item?.id) && setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter item name"
                required
                readOnly={!isAdmin && !!item?.id}
                className={!isAdmin && item?.id ? "bg-slate-50 text-slate-600 cursor-default" : ""}
              />
            </div>
            
            <div className="col-span-2 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sku">Product ID</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="Product ID"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode ID</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="barcode"
                      value={formData.barcode || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                      placeholder="Enter barcode"
                      className="pl-10 font-mono"
                    />
                  </div>
                  <Button type="button" variant="outline" onClick={() => setScannerOpen(true)} aria-label="Scan barcode" className="bg-white text-slate-900 border-slate-200 gap-2">
                    <ScanLine className="h-4 w-4" />
                    Scan
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger className="bg-white text-slate-900">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900">
                  <SelectItem value={null}>No Category</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: cat.color || "#94a3b8" }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {suppliers.length > 0 && (
              <div className="col-span-2 space-y-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Select
                  value={formData.supplier_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: value }))}
                >
                  <SelectTrigger className="bg-white text-slate-900">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900">
                    <SelectItem value={null}>No Supplier</SelectItem>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter item description"
              rows={3}
            />
          </div>
          
          {/* Cases / Bags — Main Count */}
          <div className="p-4 rounded-xl bg-slate-50 space-y-3">
            <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-500" />
              Stock Count
            </h3>
            <div className="grid grid-cols-[minmax(5rem,1fr)_1fr_2fr] gap-4">
              <div className="space-y-2">
                <Label htmlFor="case_quantity">Count</Label>
                <Input
                  id="case_quantity"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.case_quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, case_quantity: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="case_unit">Type</Label>
                <Select
                  value={formData.case_unit}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, case_unit: value }))}
                >
                  <SelectTrigger className="bg-white text-slate-900">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900">
                    <SelectItem value="cases">Cases</SelectItem>
                    <SelectItem value="boxes">Boxes</SelectItem>
                    <SelectItem value="packs">Packs</SelectItem>
                    <SelectItem value="bags">Bags</SelectItem>
                    <SelectItem value="bottles">Bottles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="units_per_case">Units per {formData.case_unit || 'case'} <span className="text-xs font-normal text-slate-400">(optional)</span></Label>
                <div className="flex gap-2">
                  <Input
                    id="units_per_case"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.units_per_case}
                    onChange={(e) => setFormData(prev => ({ ...prev, units_per_case: e.target.value === "" ? "" : parseFloat(e.target.value) }))}
                    placeholder="1"
                    className="min-w-[5rem] w-full"
                  />
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
                  >
                    <SelectTrigger className="w-28 shrink-0 bg-white text-slate-900">
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-slate-900">
                      <SelectItem value="pieces">Pieces</SelectItem>
                      <SelectItem value="each">Each</SelectItem>
                      <SelectItem value="bottles">Bottles</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="oz">oz</SelectItem>
                      <SelectItem value="lbs">lbs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          
          {/* Min/Max Cases & Location */}
          <div className="grid grid-cols-3 gap-4 items-start">
            <div className="space-y-2">
              <Label htmlFor="min_cases">Min. {formData.case_unit || 'Cases'}</Label>
              <Input
                id="min_cases"
                type="number"
                min="0"
                step="1"
                value={formData.min_cases}
                onChange={(e) => setFormData(prev => ({ ...prev, min_cases: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_cases">Max. {formData.case_unit || 'Cases'}</Label>
              <Input
                id="max_cases"
                type="number"
                min="0"
                step="1"
                value={formData.max_cases}
                onChange={(e) => setFormData(prev => ({ ...prev, max_cases: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            
            <div className="col-span-3 space-y-2">
              <Label>Locations <span className="text-xs font-normal text-slate-400">(select all that apply)</span></Label>
              {locations.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No locations defined yet</p>
              ) : (
                <LocationCheckboxList
                  locations={locations}
                  selected={formData.locations || []}
                  onChange={(locs) => setFormData(prev => ({ ...prev, locations: locs, location: locs[0] || "" }))}
                />
              )}
              {(formData.locations || []).length > 0 && (() => {
                const selectedLocs = (formData.locations || []).map(id => locations.find(l => l.id === id)).filter(Boolean);
                const bubbles = [];
                // Group children by parent
                const byParent = {};
                selectedLocs.forEach(loc => {
                  if (loc.parent_location_id) {
                    if (!byParent[loc.parent_location_id]) byParent[loc.parent_location_id] = [];
                    byParent[loc.parent_location_id].push(loc);
                  }
                });
                // Standalone parents (no selected children) and standalone locations (no parent)
                selectedLocs.forEach(loc => {
                  if (!loc.parent_location_id && !byParent[loc.id]) {
                    bubbles.push({ key: loc.id, label: loc.name });
                  }
                });
                // One bubble per parent with selected children
                Object.entries(byParent).forEach(([parentId, children]) => {
                  const parent = locations.find(l => l.id === parentId);
                  const parentName = parent ? parent.name : parentId;
                  const childNames = children.map(c => c.name).join(', ');
                  bubbles.push({ key: parentId, label: `${parentName} › ${childNames}` });
                });
                return (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {bubbles.map(b => (
                      <span key={b.key} className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                        <MapPin className="h-3 w-3" />{b.label}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
          
          {/* Pricing — optional for all users */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 space-y-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-indigo-600" />
              Pricing <span className="text-xs font-normal text-slate-500">(optional)</span>
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="unit_cost">Cost per {formData.unit || 'unit'}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <Input
                  id="unit_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>
            {totalValue > 0 && (
              <div className="pt-3 border-t border-indigo-100 text-center">
                <p className="text-sm text-slate-600">Total Stock Value</p>
                <p className="text-lg font-bold text-slate-900">${totalValue.toFixed(2)}</p>
              </div>
            )}
          </div>
          
          {/* Out for Repair */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-amber-600" />
                Out for Repair <span className="text-xs font-normal text-slate-500">(optional)</span>
              </h3>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.out_for_repair}
                  onChange={(e) => setFormData(prev => ({ ...prev, out_for_repair: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-amber-600"
                />
                <span className="text-sm font-medium text-slate-700">Mark as out for repair</span>
              </label>
            </div>
            {formData.out_for_repair && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="repair_return_date">Expected Return Date</Label>
                  <Input
                    id="repair_return_date"
                    type="date"
                    value={formData.repair_return_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, repair_return_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repair_notes">Repair Notes</Label>
                  <Input
                    id="repair_notes"
                    value={formData.repair_notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, repair_notes: e.target.value }))}
                    placeholder="e.g. Sent to vendor for fix"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Non-Trusted */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <input
              type="checkbox"
              id="non_trusted"
              checked={formData.non_trusted}
              onChange={(e) => setFormData(prev => ({ ...prev, non_trusted: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300"
            />
            <div>
              <Label htmlFor="non_trusted" className="cursor-pointer font-medium text-slate-800">Non-Trusted Item <span className="text-xs font-normal text-slate-500">(optional)</span></Label>
              <p className="text-xs text-slate-500">Flag this item as non-trusted for additional review</p>
            </div>
          </div>

          {/* Expiration Date */}
          <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 space-y-2">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-orange-500" />
              Expiration Date <span className="text-xs font-normal text-slate-500">(optional)</span>
            </h3>
            <Input
              id="expiration_date"
              type="date"
              value={formData.expiration_date}
              onChange={(e) => setFormData(prev => ({ ...prev, expiration_date: e.target.value }))}
            />
            {formData.expiration_date && (() => {
              const today = new Date();
              const exp = new Date(formData.expiration_date);
              const daysLeft = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
              if (daysLeft < 0) return <p className="text-xs text-rose-600 font-medium">⚠️ This item has already expired.</p>;
              if (daysLeft <= 30) return <p className="text-xs text-orange-600 font-medium">⚠️ Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}.</p>;
              return <p className="text-xs text-green-600">Expires in {daysLeft} days.</p>;
            })()}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional notes..."
              rows={2}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="bg-white text-slate-900 border-slate-200">
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !formData.name} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                item?.id ? "Update Item" : "Add Item"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onBarcodeDetected={handleBarcodeDetected}
      />
    </Dialog>
  );
}