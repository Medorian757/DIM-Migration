import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dim as base44 } from "@/api/dimDataClient";
import { usePermissions } from "../components/usePermissions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Search, Pencil, Trash2, Truck, Phone, Mail, Globe,
  MapPin, Clock, Package, FileText, Loader2, AlertTriangle } from
"lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function SupplierForm({ open, onClose, supplier, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useState(() => {
    setForm(supplier ? {
      name: supplier.name || "",
      contact_name: supplier.contact_name || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      website: supplier.website || "",
      lead_time_days: supplier.lead_time_days ?? 7,
      payment_terms: supplier.payment_terms || "",
      notes: supplier.notes || "",
      status: supplier.status || "active"
    } : {
      name: "", contact_name: "", email: "", phone: "",
      address: "", website: "", lead_time_days: 7,
      payment_terms: "", notes: "", status: "active"
    });
  }, [supplier, open]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form, supplier);
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white text-slate-900">
        <DialogHeader>
          <DialogTitle>{supplier ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Company Name *</Label>
            <Input value={form.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="Acme Corp" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input value={form.contact_name || ""} onChange={(e) => set("contact_name", e.target.value)} placeholder="Jane Smith" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status || "active"} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className="bg-white text-slate-900"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white text-slate-900">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email || ""} onChange={(e) => set("email", e.target.value)} placeholder="orders@supplier.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555-0100" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input value={form.website || ""} onChange={(e) => set("website", e.target.value)} placeholder="https://supplier.com" />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={form.address || ""} onChange={(e) => set("address", e.target.value)} placeholder="123 Main St, City, State" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lead Time (days)</Label>
              <Input type="number" min="0" value={form.lead_time_days ?? 7} onChange={(e) => set("lead_time_days", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Input value={form.payment_terms || ""} onChange={(e) => set("payment_terms", e.target.value)} placeholder="Net 30" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder="Additional notes about this supplier..." rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="text-white">Cancel</Button>
            <Button type="submit" disabled={saving || !form.name} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : supplier ? "Update" : "Add Supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>);

}

function DeleteDialog({ open, supplier, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const handle = async () => {setDeleting(true);await onConfirm();setDeleting(false);onClose();};
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Delete Supplier</DialogTitle></DialogHeader>
        <div className="flex items-center gap-3 p-4 bg-rose-50 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <p className="text-sm text-slate-700">Delete <strong>{supplier?.name}</strong>? This won't remove linked items.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handle} disabled={deleting}>
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);

}

export default function Suppliers() {
  const qc = useQueryClient();
  const { isAdmin } = usePermissions();
  const [search, setSearch] = useState("");
  const [recentOnly, setRecentOnly] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list("-created_date")
  });

  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: () => base44.entities.InventoryItem.list()
  });

  const createSupplier = useMutation({
    mutationFn: (d) => base44.entities.Supplier.create(d),
    onMutate: async (newData) => {
      await qc.cancelQueries({ queryKey: ["suppliers"] });
      const prev = qc.getQueryData(["suppliers"]);
      qc.setQueryData(["suppliers"], (old = []) => [
        { ...newData, id: `temp-${Date.now()}`, created_date: new Date().toISOString(), updated_date: new Date().toISOString() },
        ...old,
      ]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(["suppliers"], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  const updateSupplier = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ["suppliers"] });
      const prev = qc.getQueryData(["suppliers"]);
      qc.setQueryData(["suppliers"], (old = []) =>
        old.map((s) => (s.id === id ? { ...s, ...data } : s))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(["suppliers"], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  const deleteSupplier = useMutation({
    mutationFn: (id) => base44.entities.Supplier.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  const itemCountBySupplierId = useMemo(() => {
    const map = {};
    items.forEach((i) => {if (i.supplier_id) map[i.supplier_id] = (map[i.supplier_id] || 0) + 1;});
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return suppliers.filter((s) => {
      if (recentOnly && new Date(s.updated_date).getTime() < thirtyDaysAgo) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return s.name?.toLowerCase().includes(q) || s.contact_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
    });
  }, [suppliers, search, recentOnly]);

  const handleSave = async (data, existing) => {
    if (existing) await updateSupplier.mutateAsync({ id: existing.id, data });else
    await createSupplier.mutateAsync(data);
    setEditing(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Suppliers</h1>
            <p className="text-slate-500 mt-1">Manage supplier contacts, lead times, and notes</p>
          </div>
          {isAdmin &&
          <Button variant="outline" onClick={() => {setEditing(null);setFormOpen(true);}} className="bg-white text-slate-900">
              <Plus className="h-4 w-4 mr-2" />Add Supplier
            </Button>
          }
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-50"><Truck className="h-5 w-5 text-indigo-600" /></div>
              <div><p className="text-2xl font-bold text-slate-900">{suppliers.length}</p><p className="text-sm text-slate-500">Total suppliers</p></div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-50"><Package className="h-5 w-5 text-emerald-600" /></div>
              <div><p className="text-2xl font-bold text-slate-900">{suppliers.filter((s) => s.status === "active").length}</p><p className="text-sm text-slate-500">Active</p></div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white hidden sm:block">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-50"><Clock className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {suppliers.length ? Math.round(suppliers.reduce((s, sup) => s + (sup.lead_time_days || 7), 0) / suppliers.length) : 0}d
                </p>
                <p className="text-sm text-slate-500">Avg lead time</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers..." className="pl-10 bg-white text-slate-900 placeholder:text-slate-400" />
          </div>
          <button
            onClick={() => setRecentOnly((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${recentOnly ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
          >
            <Clock className="h-4 w-4" />
            Updated last 30 days
          </button>
        </div>

        {/* List */}
        {isLoading ?
        <div className="space-y-3">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
          </div> :
        filtered.length === 0 ?
        <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <Truck className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">{search ? "No results found" : "No suppliers yet"}</h3>
            <p className="text-slate-500 text-sm mb-4">{search ? "Try a different search term" : "Add your first supplier to get started"}</p>
            {!search && isAdmin &&
          <Button onClick={() => {setEditing(null);setFormOpen(true);}} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />Add Supplier
              </Button>
          }
          </div> :

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((supplier, idx) =>
            <motion.div key={supplier.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.03 }}>
                  <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow h-full">
                    <CardContent className="p-5 flex flex-col gap-3 h-full">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                            <Truck className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{supplier.name}</p>
                            {supplier.contact_name && <p className="text-xs text-slate-500 truncate">{supplier.contact_name}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge className={supplier.status === "active" ? "bg-emerald-100 text-emerald-700 border-0 text-xs" : "bg-slate-100 text-slate-600 border-0 text-xs"}>
                            {supplier.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-1.5 flex-1">
                        {supplier.email &&
                    <a href={`mailto:${supplier.email}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 transition-colors">
                            <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{supplier.email}</span>
                          </a>
                    }
                        {supplier.phone &&
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span>{supplier.phone}</span>
                          </div>
                    }
                        {supplier.website &&
                    <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 transition-colors">
                            <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{supplier.website.replace(/^https?:\/\//, "")}</span>
                          </a>
                    }
                        {supplier.address &&
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{supplier.address}</span>
                          </div>
                    }
                      </div>

                      {/* Meta */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{supplier.lead_time_days ?? 7}d lead</span>
                          {supplier.payment_terms && <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{supplier.payment_terms}</span>}
                          <span className="flex items-center gap-1"><Package className="h-3 w-3" />{itemCountBySupplierId[supplier.id] || 0} items</span>
                        </div>
                        {isAdmin &&
                    <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {setEditing(supplier);setFormOpen(true);}}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => setDeleting(supplier)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                    }
                      </div>

                      {/* Notes */}
                      {supplier.notes &&
                  <p className="text-xs text-slate-400 italic line-clamp-2 border-t border-slate-50 pt-2">{supplier.notes}</p>
                  }
                    </CardContent>
                  </Card>
                </motion.div>
            )}
            </AnimatePresence>
          </div>
        }
      </div>

      <SupplierForm open={formOpen} onClose={() => {setFormOpen(false);setEditing(null);}} supplier={editing} onSave={handleSave} />
      <DeleteDialog open={!!deleting} supplier={deleting} onClose={() => setDeleting(null)} onConfirm={() => deleteSupplier.mutateAsync(deleting.id)} />
    </div>);

}