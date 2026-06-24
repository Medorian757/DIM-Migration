import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import PullToRefresh from "../components/PullToRefresh";
import { dim as base44 } from "@/api/dimDataClient";
import { usePermissions } from "../components/usePermissions";
import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area } from
"recharts";
import {
  Package, DollarSign, TrendingUp, AlertTriangle, ArrowUp, ArrowDown,
  Layers, MapPin, Clock, Activity, Zap, RefreshCw, Wrench, Printer, Filter } from
"lucide-react";
import ExportReportModal from "../components/reports/ExportReportModal";
import CustomReportModal from "../components/reports/CustomReportModal";
import { format, subDays, startOfDay, parseISO } from "date-fns";

const PALETTE = ['#bde546ff', '#bde546ff', '#EC4899', '#F97316', '#22C55E', '#14B8A6', '#06B6D4', '#F59E0B'];

function StatCard({ title, value, subtitle, icon: Icon, iconBg, iconColor, trend }) {
  return (
    <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1 truncate">{value}</p>
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
            {trend !== undefined &&
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trend >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {Math.abs(trend)}% vs last week
              </div>
            }
          </div>
          <div className={`p-3 rounded-xl ${iconBg} ml-4 shrink-0`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>);

}

export default function Reports() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, loading: permLoading } = usePermissions();
  const [exportOpen, setExportOpen] = useState(false);
  const [customReportOpen, setCustomReportOpen] = useState(false);
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["items"],
    queryFn: () => base44.entities.InventoryItem.list()
  });
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.Category.list()
  });
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["itemHistory"],
    queryFn: () => base44.entities.ItemHistory.list("-created_date", 500)
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list()
  });
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: () => base44.entities.Location.list()
  });

  const isLoading = itemsLoading || categoriesLoading || historyLoading;

  // Top items by sales velocity
  const topByVelocity = useMemo(() => {
    return [...items].
    filter((i) => (i.daily_sales_velocity || 0) > 0).
    sort((a, b) => (b.daily_sales_velocity || 0) - (a.daily_sales_velocity || 0)).
    slice(0, 8).
    map((i) => ({ name: i.name.length > 20 ? i.name.slice(0, 18) + "…" : i.name, velocity: i.daily_sales_velocity || 0 }));
  }, [items]);

  // Categories with highest reorder frequency (items at/below min_cases)
  const categoryReorderFreq = useMemo(() => {
    return categories.map((cat, idx) => {
      const catItems = items.filter((i) => i.category_id === cat.id);
      const reordering = catItems.filter((i) => (i.case_quantity || 0) <= (i.min_cases || 0) && (i.min_cases || 0) > 0).length;
      return { name: cat.name, reordering, total: catItems.length, color: cat.color || PALETTE[idx % PALETTE.length] };
    }).filter((c) => c.total > 0).sort((a, b) => b.reordering - a.reordering).slice(0, 6);
  }, [items, categories]);

  // Stock value over time (cumulative from history changes)
  const stockValueTrend = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = startOfDay(subDays(new Date(), 29 - i));
      return { date: format(d, "MMM d"), day: d, value: null };
    });
    // Current total value as baseline for last day
    const currentValue = items.reduce((s, i) => s + (i.case_quantity || 0) * (i.units_per_case || 1) * (i.unit_cost || 0), 0);
    if (days.length > 0) days[days.length - 1].value = currentValue;
    // Walk backwards using quantity_change history to estimate past values
    let runningValue = currentValue;
    const qtyChanges = history.
    filter((h) => h.change_type === "quantity_change").
    sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    let changeIdx = 0;
    for (let d = days.length - 2; d >= 0; d--) {
      const dayEnd = new Date(days[d + 1].day);
      while (changeIdx < qtyChanges.length) {
        const ch = qtyChanges[changeIdx];
        const chDate = new Date(ch.created_date);
        if (chDate >= days[d + 1].day && chDate < dayEnd) {
          const item = items.find((i) => i.id === ch.item_id);
          if (item) {
            const diff = (parseFloat(ch.new_value) || 0) - (parseFloat(ch.old_value) || 0);
            runningValue -= diff * (item.units_per_case || 1) * (item.unit_cost || 0);
          }
          changeIdx++;
        } else break;
      }
      days[d].value = Math.max(0, runningValue);
    }
    return days.map((d) => ({ ...d, value: Math.round(d.value ?? currentValue) }));
  }, [items, history]);

  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalCases = items.reduce((s, i) => s + (i.case_quantity || 0), 0);
    const totalUnits = items.reduce((s, i) => s + (i.case_quantity || 0) * (i.units_per_case || 1), 0);
    const totalCost = items.reduce((s, i) => s + (i.case_quantity || 0) * (i.units_per_case || 1) * (i.unit_cost || 0), 0);
    const totalRevenue = items.reduce((s, i) => s + (i.case_quantity || 0) * (i.units_per_case || 1) * (i.sale_price || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100).toFixed(1) : 0;
    const lowStock = items.filter((i) => i.case_quantity <= i.min_cases && i.min_cases > 0);
    const outOfStock = items.filter((i) => (i.case_quantity || 0) === 0);
    return { totalItems, totalCases, totalUnits, totalCost, totalRevenue, totalProfit, profitMargin, lowStock, outOfStock };
  }, [items]);

  const categoryData = useMemo(() => {
    return categories.map((cat, idx) => {
      const catItems = items.filter((i) => i.category_id === cat.id);
      const value = catItems.reduce((s, i) => s + (i.case_quantity || 0) * (i.units_per_case || 1) * (i.unit_cost || 0), 0);
      return { name: cat.name, value, count: catItems.length, color: cat.color || PALETTE[idx % PALETTE.length] };
    }).filter((c) => c.value > 0).sort((a, b) => b.value - a.value);
  }, [items, categories]);

  const topItems = useMemo(() => {
    return [...items].
    map((i) => ({ ...i, totalValue: (i.case_quantity || 0) * (i.units_per_case || 1) * (i.unit_cost || 0) })).
    sort((a, b) => b.totalValue - a.totalValue).
    slice(0, 8);
  }, [items]);

  const locationData = useMemo(() => {
    const validNames = new Set(locations.map(l => l.name));
    const map = {};
    items.forEach((i) => {
      const locs = Array.isArray(i.locations) && i.locations.length > 0 ? i.locations : (i.location ? [i.location] : []);
      locs.forEach((loc) => {
        if (!validNames.has(loc)) return;
        if (!map[loc]) map[loc] = { name: loc, items: 0, value: 0 };
        map[loc].items += 1;
        map[loc].value += (i.case_quantity || 0) * (i.units_per_case || 1) * (i.unit_cost || 0);
      });
    });
    return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [items, locations]);

  // Activity trend: changes per day over last 14 days
  const activityTrend = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = startOfDay(subDays(new Date(), 13 - i));
      return { date: format(d, "MMM d"), day: d, changes: 0 };
    });
    history.forEach((h) => {
      const hDay = startOfDay(new Date(h.created_date));
      const match = days.find((d) => d.day.getTime() === hDay.getTime());
      if (match) match.changes += 1;
    });
    return days;
  }, [history]);

  // Change type breakdown
  const changeTypeCounts = useMemo(() => {
    const counts = { quantity_change: 0, price_change: 0, details_change: 0, item_created: 0 };
    history.forEach((h) => {if (counts[h.change_type] !== undefined) counts[h.change_type]++;});
    return [
    { name: "Qty Updates", value: counts.quantity_change, color: "#4F46E5" },
    { name: "Price Changes", value: counts.price_change, color: "#7C3AED" },
    { name: "Detail Edits", value: counts.details_change, color: "#14B8A6" },
    { name: "New Items", value: counts.item_created, color: "#22C55E" }].
    filter((c) => c.value > 0);
  }, [history]);

  const recentActivity = useMemo(() => history.slice(0, 20), [history]);

  const changeTypeLabel = { quantity_change: "Quantity", price_change: "Price", details_change: "Details", item_created: "Created" };
  const changeTypeColor = { quantity_change: "bg-indigo-100 text-indigo-700", price_change: "bg-purple-100 text-purple-700", details_change: "bg-teal-100 text-teal-700", item_created: "bg-emerald-100 text-emerald-700" };



  if (!permLoading && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-6">
            <Printer className="h-8 w-8 text-indigo-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Print Reports</h2>
          <p className="text-slate-500 text-sm mb-8">Generate and print inventory reports.</p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => setCustomReportOpen(true)} className="w-full">
              <Filter className="h-4 w-4 mr-2" />
              Custom Report
            </Button>
            <Button variant="outline" onClick={() => setExportOpen(true)} className="w-full">
              <Printer className="h-4 w-4 mr-2" />
              Print Full Report
            </Button>
          </div>
        </div>
        <ExportReportModal
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          items={items}
          categories={categories}
          history={history}
        />
        <CustomReportModal
          open={customReportOpen}
          onClose={() => setCustomReportOpen(false)}
          items={items}
          categories={categories}
          suppliers={suppliers}
          locations={locations}
          history={history}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>
      </div>);

  }

  const handleRefresh = () => Promise.all([
  queryClient.invalidateQueries({ queryKey: ["items"] }),
  queryClient.invalidateQueries({ queryKey: ["categories"] }),
  queryClient.invalidateQueries({ queryKey: ["itemHistory"] })]
  );

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-slate-500 mt-1">Inventory performance overview and trends</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCustomReportOpen(true)} className="bg-white text-slate-900">
              <Filter className="h-4 w-4 mr-2" />
              Custom Report
            </Button>
            <Button variant="outline" onClick={() => setExportOpen(true)} className="bg-white text-slate-900">
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Items" value={stats.totalItems.toLocaleString()} subtitle={`${stats.totalCases.toLocaleString()} cases in stock`} icon={Package} iconBg="bg-indigo-50" iconColor="text-indigo-600" />
          <StatCard title="Inventory Value" value={`$${stats.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} subtitle="At cost" icon={DollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-600" />

          <StatCard title="Stock Alerts" value={stats.lowStock.length + stats.outOfStock.length} subtitle={`${stats.outOfStock.length} out of stock`} icon={AlertTriangle} iconBg="bg-amber-50" iconColor="text-amber-600" />
        </div>

        {/* Activity Trend */}
        <div className="grid grid-cols-1 gap-6">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900 text-lg font-semibold tracking-tight flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-500" />
                Activity — Last 14 Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityTrend.some((d) => d.changes > 0) ?
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activityTrend}>
                      <defs>
                        <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={1} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="changes" stroke="#4F46E5" strokeWidth={2} fill="url(#actGrad)" name="Changes" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div> :

                <div className="h-56 flex flex-col items-center justify-center text-slate-400">
                  <Clock className="h-10 w-10 mb-2 text-slate-200" />
                  <p className="text-sm">No recent activity to display</p>
                </div>
                }
            </CardContent>
          </Card>
        </div>

        {/* NEW: Stock Value Over Time */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-900 text-lg font-semibold tracking-tight flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Inventory Value — Last 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stockValueTrend}>
                  <defs>
                    <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [`$${v.toLocaleString()}`, "Stock Value"]} />
                  <Area type="monotone" dataKey="value" stroke="#22C55E" strokeWidth={2} fill="url(#valGrad)" name="Value" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Reorder Frequency */}
        <div className="grid grid-cols-1 gap-6">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900 text-lg font-semibold tracking-tight flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-rose-500" />
                Categories by Reorder Frequency
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryReorderFreq.length > 0 ?
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryReorderFreq}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip formatter={(v, n, p) => [v, n === "reordering" ? "Needs Reorder" : "Total Items"]} />
                      <Bar dataKey="total" fill="#E2E8F0" radius={[4, 4, 0, 0]} name="Total" />
                      <Bar dataKey="reordering" radius={[4, 4, 0, 0]} name="Reordering">
                        {categoryReorderFreq.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div> :

                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No reorder data yet</div>
                }
            </CardContent>
          </Card>
        </div>

        {/* Category & Location */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900 text-lg font-semibold tracking-tight flex items-center gap-2">
                <Layers className="h-5 w-5 text-purple-500" />
                Value by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ?
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => [`$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "Value"]} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div> :

                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No category data</div>
                }
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900 text-lg font-semibold tracking-tight flex items-center gap-2">
                <MapPin className="h-5 w-5 text-teal-500" />
                Value by Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              {locationData.length > 0 ?
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={locationData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(v) => [`$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "Value"]} />
                      <Bar dataKey="value" fill="#14B8A6" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(data) => navigate(`/Inventory?location=${encodeURIComponent(data.name)}`)} />
                    </BarChart>
                  </ResponsiveContainer>
                </div> :

                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No location data</div>
                }
            </CardContent>
          </Card>
        </div>

        {/* Top Items & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900 text-lg font-semibold tracking-tight">Top Items by Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topItems.length > 0 ? topItems.map((item, idx) =>
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.case_quantity} cases</p>
                      </div>
                    </div>
                    <p className="font-semibold text-slate-900 text-sm shrink-0 ml-2">
                      ${item.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  ) :
                  <div className="text-center py-10 text-slate-400 text-sm">No items yet</div>
                  }
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900 text-lg font-semibold tracking-tight flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-400" />
                Recent Changes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {recentActivity.length > 0 ? recentActivity.map((h) =>
                  <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <Badge className={`shrink-0 text-xs border-0 ${changeTypeColor[h.change_type] || "bg-slate-100 text-slate-700"}`}>
                      {changeTypeLabel[h.change_type] || h.change_type}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{h.item_name || "Unknown item"}</p>
                      {h.old_value && h.new_value &&
                      <p className="text-xs text-slate-500">{h.old_value} → {h.new_value}</p>
                      }
                    </div>
                    <p className="text-xs text-slate-400 shrink-0">{format(new Date(h.created_date), "MMM d")}</p>
                  </div>
                  ) :
                  <div className="text-center py-10 text-slate-400">
                    <Activity className="h-10 w-10 mx-auto text-slate-200 mb-2" />
                    <p className="text-sm">No activity recorded yet</p>
                  </div>
                  }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Out for Repair */}
        {items.filter((i) => i.out_for_repair).length > 0 &&
          <Card className="bg-white border-0 shadow-sm ring-1 ring-amber-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900 text-lg font-semibold tracking-tight flex items-center gap-2">
                <Wrench className="h-5 w-5 text-amber-500" />
                Out for Repair ({items.filter((i) => i.out_for_repair).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.filter((i) => i.out_for_repair).map((item) =>
                <div key={item.id} className="flex items-start justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{item.name}</p>
                      {item.repair_notes && <p className="text-xs text-slate-500 mt-0.5">{item.repair_notes}</p>}
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      {item.repair_return_date ?
                    <p className="text-xs font-medium text-amber-700">
                          Returns {new Date(item.repair_return_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </p> :

                    <p className="text-xs text-slate-400">No return date</p>
                    }
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          }

        {/* Stock Alerts */}
        {(stats.lowStock.length > 0 || stats.outOfStock.length > 0) &&
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900 text-lg font-semibold tracking-tight flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stats.outOfStock.map((item) =>
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-rose-50 border border-rose-100">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{item.name}</p>
                      {item.sku && <p className="text-xs text-slate-500">SKU: {item.sku}</p>}
                    </div>
                    <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                  </div>
                )}
                {stats.lowStock.map((item) =>
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.case_quantity} cases left (min {item.min_cases})</p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800 border-0 text-xs">Low Stock</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          }

      </div>
      </div>

      <ExportReportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        items={items}
        categories={categories}
        history={history}
      />
      <CustomReportModal
        open={customReportOpen}
        onClose={() => setCustomReportOpen(false)}
        items={items}
        categories={categories}
        suppliers={suppliers}
        locations={locations}
        history={history}
      />
    </PullToRefresh>);

}