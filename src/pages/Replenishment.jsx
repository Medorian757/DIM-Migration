import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dim as base44 } from "@/api/dimDataClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle, TrendingUp, Package, Clock, RefreshCw,
  ChevronUp, ChevronDown, CheckCircle2, Info, ShoppingCart, Pencil, X, Check
} from "lucide-react";

const URGENCY = {
  critical: { label: "Critical", color: "bg-rose-100 text-rose-700 border-rose-200", dot: "bg-rose-500", order: 0 },
  high:     { label: "High",     color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500", order: 1 },
  medium:   { label: "Medium",   color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500", order: 2 },
  low:      { label: "Low",      color: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500", order: 3 },
};

function calcSuggestion(item) {
  const stock = item.case_quantity || 0;
  const unitsPerCase = item.units_per_case || 1;
  const totalUnits = stock * unitsPerCase;
  const velocity = item.daily_sales_velocity || 0; // units/day
  const leadDays = item.lead_time_days || 7;
  const minCases = item.min_cases || 0;
  const minUnits = minCases * unitsPerCase;

  // Days of stock remaining (avoid division by zero)
  const daysOfStock = velocity > 0 ? totalUnits / velocity : Infinity;

  // Units needed during lead time + safety buffer (50% of lead time demand)
  const leadTimeDemand = velocity * leadDays;
  const safetyStock = leadTimeDemand * 0.5;
  const reorderPoint = leadTimeDemand + safetyStock + minUnits;

  // Suggested order qty: enough to cover 30 days of demand + safety, at least reorder_quantity
  const coverageDays = 30;
  const suggestedUnits = Math.max(
    velocity * coverageDays + safetyStock - totalUnits,
    (item.reorder_quantity || 0) * unitsPerCase
  );
  const suggestedCases = Math.ceil(Math.max(suggestedUnits, 0) / unitsPerCase);

  // Urgency scoring
  let urgency = null;
  const needsReorder = totalUnits <= reorderPoint || stock <= minCases;

  if (needsReorder || stock === 0) {
    if (stock === 0 || daysOfStock <= leadDays * 0.5) urgency = "critical";
    else if (daysOfStock <= leadDays) urgency = "high";
    else if (daysOfStock <= leadDays * 2) urgency = "medium";
    else urgency = "low";
  }

  return { daysOfStock, leadTimeDemand, reorderPoint, suggestedCases, urgency, needsReorder, totalUnits };
}

function EditableCell({ value, onSave, prefix = "", suffix = "", type = "number" }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  const handleSave = () => {
    onSave(parseFloat(val) || 0);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={val}
          onChange={e => setVal(e.target.value)}
          className="h-7 w-20 text-xs px-2"
          autoFocus
          onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
        />
        <button onClick={handleSave} aria-label="Save" className="text-emerald-600 hover:text-emerald-700 min-h-[44px] min-w-[44px] flex items-center justify-center"><Check className="h-3.5 w-3.5" /></button>
        <button onClick={() => setEditing(false)} aria-label="Cancel" className="text-slate-400 hover:text-slate-600 min-h-[44px] min-w-[44px] flex items-center justify-center"><X className="h-3.5 w-3.5" /></button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setVal(value); setEditing(true); }}
      className="flex items-center gap-1 text-slate-700 hover:text-indigo-600 group"
    >
      <span className="text-sm">{prefix}{typeof value === "number" ? (value % 1 === 0 ? value : value.toFixed(1)) : value}{suffix}</span>
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
    </button>
  );
}

export default function Replenishment() {
  const [sortField, setSortField] = useState("urgency");
  const [sortDir, setSortDir] = useState("asc");
  const [filter, setFilter] = useState("all"); // all | needs_reorder | critical
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["items"],
    queryFn: () => base44.entities.InventoryItem.list()
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.Category.list()
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InventoryItem.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["items"] });
      const prev = queryClient.getQueryData(["items"]);
      queryClient.setQueryData(["items"], old => (old || []).map(item => item.id === id ? { ...item, ...data } : item));
      return { prev };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(["items"], ctx.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["items"] })
  });

  const catMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);

  const analyzed = useMemo(() => {
    return items.map(item => ({ ...item, _calc: calcSuggestion(item) }));
  }, [items]);

  const filtered = useMemo(() => {
    let list = analyzed;
    if (filter === "needs_reorder") list = list.filter(i => i._calc.needsReorder);
    if (filter === "critical") list = list.filter(i => i._calc.urgency === "critical");
    return list;
  }, [analyzed, filter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av, bv;
      if (sortField === "urgency") {
        av = a._calc.urgency ? URGENCY[a._calc.urgency].order : 99;
        bv = b._calc.urgency ? URGENCY[b._calc.urgency].order : 99;
      } else if (sortField === "name") {
        av = a.name; bv = b.name;
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      } else if (sortField === "stock") {
        av = a.case_quantity || 0; bv = b.case_quantity || 0;
      } else if (sortField === "days") {
        av = a._calc.daysOfStock === Infinity ? 9999 : a._calc.daysOfStock;
        bv = b._calc.daysOfStock === Infinity ? 9999 : b._calc.daysOfStock;
      } else if (sortField === "suggest") {
        av = a._calc.suggestedCases; bv = b._calc.suggestedCases;
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [filtered, sortField, sortDir]);

  const summary = useMemo(() => {
    const needsReorder = analyzed.filter(i => i._calc.needsReorder);
    const critical = needsReorder.filter(i => i._calc.urgency === "critical");
    const totalReorderCost = needsReorder.reduce((s, i) => s + i._calc.suggestedCases * (i.units_per_case || 1) * (i.unit_cost || 0), 0);
    return { needsReorder: needsReorder.length, critical: critical.length, totalReorderCost, total: analyzed.length };
  }, [analyzed]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronUp className="h-3.5 w-3.5 text-slate-300" />;
    return sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-indigo-500" /> : <ChevronDown className="h-3.5 w-3.5 text-indigo-500" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-56" />
          <div className="grid grid-cols-3 gap-4">
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Replenishment</h1>
            <p className="text-slate-500 mt-1">AI-powered reorder suggestions based on stock, velocity & lead times</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <Info className="h-4 w-4 text-indigo-400 shrink-0" />
            Click velocity or lead time values to edit them inline
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-rose-50 shrink-0">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{summary.critical}</p>
                <p className="text-sm text-slate-500">Critical — order now</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-50 shrink-0">
                <ShoppingCart className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{summary.needsReorder}</p>
                <p className="text-sm text-slate-500">Items to reorder</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-50 shrink-0">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  ${summary.totalReorderCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-slate-500">Estimated reorder cost</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {[
            { key: "all", label: `All Items (${summary.total})` },
            { key: "needs_reorder", label: `Needs Reorder (${summary.needsReorder})` },
            { key: "critical", label: `Critical (${summary.critical})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              aria-pressed={filter === tab.key}
              className={`px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-all ${filter === tab.key ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <Card className="border-0 shadow-sm bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  {[
                    { field: "urgency", label: "Urgency" },
                    { field: "name", label: "Item" },
                    { field: "stock", label: "In Stock" },
                    { field: "days", label: "Days Left" },
                    { field: null, label: "Velocity (units/day)" },
                    { field: null, label: "Lead Time" },
                    { field: "suggest", label: "Suggested Order" },
                    { field: null, label: "Est. Cost" },
                    { field: null, label: "Location" },
                  ].map(({ field, label }) => (
                    <th
                      key={label}
                      onClick={() => field && toggleSort(field)}
                      className={`px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${field ? "cursor-pointer hover:text-slate-700 select-none" : ""}`}
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        {field && <SortIcon field={field} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-slate-400">
                      <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-200 mb-3" />
                      <p className="font-medium text-slate-500">All stocked up!</p>
                      <p className="text-xs mt-1">No items need reordering right now.</p>
                    </td>
                  </tr>
                )}
                {sorted.map(item => {
                  const { urgency, daysOfStock, suggestedCases, totalUnits } = item._calc;
                  const u = urgency ? URGENCY[urgency] : null;
                  const estCost = suggestedCases * (item.units_per_case || 1) * (item.unit_cost || 0);
                  const cat = catMap[item.category_id];
                  const daysLabel = daysOfStock === Infinity ? "∞" : daysOfStock < 1 ? "<1" : Math.round(daysOfStock).toString();

                  return (
                    <tr key={item.id} className={`hover:bg-slate-50/60 transition-colors ${urgency === "critical" ? "bg-rose-50/30" : ""}`}>
                      {/* Urgency */}
                      <td className="px-4 py-3.5">
                        {u ? (
                          <div className="flex items-center gap-1.5">
                            <div className={`h-2 w-2 rounded-full ${u.dot}`} />
                            <Badge className={`text-xs border ${u.color}`}>{u.label}</Badge>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-emerald-400" />
                            <Badge className="text-xs border bg-emerald-50 text-emerald-700 border-emerald-200">OK</Badge>
                          </div>
                        )}
                      </td>

                      {/* Item */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                              <Package className="h-4 w-4 text-indigo-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-slate-900">{item.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {cat && (
                                <span className="text-xs text-slate-400">{cat.name}</span>
                              )}
                              {item.supplier_name && (
                                <span className="text-xs text-slate-400">· {item.supplier_name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* In Stock */}
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="font-semibold text-slate-900">{item.case_quantity || 0} {item.case_unit || "cases"}</p>
                          <p className="text-xs text-slate-400">{totalUnits.toLocaleString()} units</p>
                        </div>
                      </td>

                      {/* Days Left */}
                      <td className="px-4 py-3.5">
                        <span className={`font-semibold ${daysOfStock < (item.lead_time_days || 7) ? "text-rose-600" : daysOfStock < (item.lead_time_days || 7) * 2 ? "text-amber-600" : "text-slate-700"}`}>
                          {daysLabel}
                        </span>
                        <span className="text-slate-400 text-xs ml-1">days</span>
                      </td>

                      {/* Velocity */}
                      <td className="px-4 py-3.5">
                        <EditableCell
                          value={item.daily_sales_velocity || 0}
                          suffix=" /day"
                          onSave={v => updateItem.mutate({ id: item.id, data: { daily_sales_velocity: v } })}
                        />
                      </td>

                      {/* Lead Time */}
                      <td className="px-4 py-3.5">
                        <EditableCell
                          value={item.lead_time_days || 7}
                          suffix=" days"
                          onSave={v => updateItem.mutate({ id: item.id, data: { lead_time_days: v } })}
                        />
                      </td>

                      {/* Suggested Order */}
                      <td className="px-4 py-3.5">
                        {suggestedCases > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5">
                              <ShoppingCart className="h-3.5 w-3.5 text-indigo-500" />
                              <span className="font-bold text-indigo-700">{suggestedCases}</span>
                              <span className="text-indigo-500 text-xs">{item.case_unit || "cases"}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Est. Cost */}
                      <td className="px-4 py-3.5">
                       {estCost > 0 ? (
                         <span className="font-medium text-slate-700">
                           ${estCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                         </span>
                       ) : (
                         <span className="text-slate-400 text-xs">—</span>
                       )}
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3.5">
                       {item.location ? (
                         <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 rounded-md px-2 py-1 font-medium">
                           📍 {item.location}
                         </span>
                       ) : (
                         <span className="text-slate-400 text-xs">—</span>
                       )}
                      </td>
                      </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-500 pb-4">
          <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-rose-500" /> Critical: stock runs out before order arrives</span>
          <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-orange-500" /> High: within lead time window</span>
          <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-amber-500" /> Medium: within 2× lead time</span>
          <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-blue-500" /> Low: approaching reorder point</span>
        </div>

      </div>
    </div>
  );
}