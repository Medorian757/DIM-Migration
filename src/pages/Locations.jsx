import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dim as base44 } from "@/api/dimDataClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Plus, Edit2, Trash2, ChevronRight } from "lucide-react";
import { usePermissions } from "../components/usePermissions";

function LocationForm({ open, onClose, location, locations, parentId, onSave }) {
  const [name, setName] = useState(location?.name || "");
  const [description, setDescription] = useState(location?.description || "");
  const [parentLocationId, setParentLocationId] = useState(location?.parent_location_id || parentId || "none");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(location?.name || "");
      setDescription(location?.description || "");
      setParentLocationId(location?.parent_location_id || parentId || "none");
    }
  }, [open, location?.id, parentId]);

  // Top-level locations only (can't nest more than one level for simplicity)
  const topLevelLocations = locations.filter(l => !l.parent_location_id && l.id !== location?.id);

  const toTitleCase = (str) => str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      name: toTitleCase(name.trim()),
      description,
      parent_location_id: parentLocationId === "none" ? null : parentLocationId
    }, location);
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-white text-black [&_label]:text-black [&_p]:text-black">
        <DialogHeader>
          <DialogTitle>{location ? "Edit Location" : "Add Location"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Parent Location</Label>
            <Select value={parentLocationId} onValueChange={setParentLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="None (top-level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (top-level)</SelectItem>
                {topLevelLocations.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc-name">Location Name *</Label>
            <Input
              id="loc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Shelf A, Warehouse B"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc-desc">Description</Label>
            <Input
              id="loc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="text-white">Cancel</Button>
            <Button type="submit" disabled={saving || !name} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? "Saving..." : location ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Locations() {
  const queryClient = useQueryClient();
  const { isAdmin } = usePermissions();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [defaultParentId, setDefaultParentId] = useState(null);

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: () => base44.entities.Location.list("name"),
  });

  const createLocation = useMutation({
    mutationFn: (data) => base44.entities.Location.create(data),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["locations"] }),
  });

  const updateLocation = useMutation({
    mutationFn: async ({ id, data, oldName }) => {
      await base44.entities.Location.update(id, data);
      // Cascade name change to inventory items that reference the old name
      if (oldName && data.name && oldName !== data.name) {
        const allItems = await base44.entities.InventoryItem.list();
        const toUpdate = allItems.filter(item =>
          item.location === oldName ||
          (Array.isArray(item.locations) && item.locations.includes(oldName))
        );
        await Promise.all(toUpdate.map(item => {
          const updates = {};
          if (item.location === oldName) updates.location = data.name;
          if (Array.isArray(item.locations) && item.locations.includes(oldName)) {
            updates.locations = item.locations.map(l => l === oldName ? data.name : l);
          }
          return base44.entities.InventoryItem.update(item.id, updates);
        }));
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });

  const deleteLocation = useMutation({
    mutationFn: (id) => base44.entities.Location.delete(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["locations"] }),
  });

  const handleSave = async (data, existing) => {
    if (existing) {
      await updateLocation.mutateAsync({ id: existing.id, data, oldName: existing.name });
    } else {
      await createLocation.mutateAsync(data);
    }
    setEditing(null);
    setDefaultParentId(null);
  };

  const openEdit = (loc) => { setEditing(loc); setDefaultParentId(null); setFormOpen(true); };
  const openAdd = (parentId = null) => { setEditing(null); setDefaultParentId(parentId); setFormOpen(true); };

  // Build tree: top-level locations with their children
  const topLevel = locations.filter(l => !l.parent_location_id);
  const getChildren = (parentId) => locations.filter(l => l.parent_location_id === parentId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Locations</h1>
            <p className="text-slate-500 mt-1">Manage storage locations for your inventory</p>
          </div>
          {isAdmin && (
            <Button variant="outline" onClick={() => openAdd()} className="bg-white text-slate-900">
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <MapPin className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No locations yet</h3>
            <p className="text-slate-500 mb-4">Add locations to organize your inventory</p>
            {isAdmin && (
              <Button variant="outline" onClick={() => openAdd()} className="bg-white text-slate-900">
                <Plus className="h-4 w-4 mr-2" />
                Add First Location
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {topLevel.map((loc) => {
              const children = getChildren(loc.id);
              return (
                <div key={loc.id}>
                  {/* Parent location */}
                  <Card
                    className="flex items-center gap-4 px-5 py-4 bg-white border-0 shadow-sm cursor-pointer hover:shadow-md hover:bg-indigo-50/40 transition-all"
                    onClick={() => navigate(`/Inventory?location=${encodeURIComponent(loc.name)}`)}
                  >
                    <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{loc.name}</p>
                      {loc.description && <p className="text-sm text-slate-500 truncate">{loc.description}</p>}
                      {children.length > 0 && (
                        <p className="text-xs text-indigo-400 mt-0.5">{children.length} sub-location{children.length !== 1 ? "s" : ""}</p>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" title="Add sub-location" onClick={(e) => { e.stopPropagation(); openAdd(loc.id); }} className="h-9 w-9">
                          <Plus className="h-4 w-4 text-slate-400" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(loc); }} className="h-9 w-9">
                          <Edit2 className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteLocation.mutate(loc.id); }} className="h-9 w-9 hover:bg-rose-50">
                          <Trash2 className="h-4 w-4 text-slate-500 hover:text-rose-500" />
                        </Button>
                      </div>
                    )}
                  </Card>

                  {/* Sub-locations */}
                  {children.length > 0 && (
                    <div className="ml-6 mt-1 space-y-1 border-l-2 border-indigo-100 pl-4">
                      {children.map((child) => (
                        <Card
                          key={child.id}
                          className="flex items-center gap-3 px-4 py-3 bg-white border-0 shadow-sm cursor-pointer hover:shadow-md hover:bg-indigo-50/40 transition-all"
                          onClick={() => navigate(`/Inventory?location=${encodeURIComponent(child.name)}`)}
                        >
                          <ChevronRight className="h-4 w-4 text-indigo-300 shrink-0" />
                          <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                            <MapPin className="h-4 w-4 text-indigo-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 text-sm">{child.name}</p>
                            {child.description && <p className="text-xs text-slate-500 truncate">{child.description}</p>}
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(child); }} className="h-8 w-8">
                                <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteLocation.mutate(child.id); }} className="h-8 w-8 hover:bg-rose-50">
                                <Trash2 className="h-3.5 w-3.5 text-slate-500 hover:text-rose-500" />
                              </Button>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <LocationForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); setDefaultParentId(null); }}
        location={editing}
        locations={locations}
        parentId={defaultParentId}
        onSave={handleSave}
      />
    </div>
  );
}