import { useState, useMemo, useEffect } from "react";
import { dim as base44 } from "@/api/dimDataClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, Filter, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";

const ALL_COLUMNS = [
  { key: "sku",           label: "SKU" },
  { key: "category",      label: "Category" },
  { key: "supplier",      label: "Supplier" },
  { key: "location",      label: "Location" },
  { key: "qty",           label: "Qty" },
  { key: "unit",          label: "Unit" },
  { key: "min_cases",     label: "Min Cases" },
  { key: "max_cases",     label: "Max Cases" },
  { key: "status",        label: "Status" },
  { key: "last_editor",   label: "Last Edited By" },
  { key: "last_updated",  label: "Last Updated" },
];

export default function CustomReportModal({ open, onClose, items, categories, suppliers = [], locations = [], history }) {
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterLocations, setFilterLocations] = useState(new Set()); // empty = all
  const [filterStock, setFilterStock] = useState("all");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterUser, setFilterUser] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [enabledCols, setEnabledCols] = useState(() => new Set(ALL_COLUMNS.map((c) => c.key)));

  const toggleCol = (key) => {
    setEnabledCols((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const [users, setUsers] = useState([]);
  useEffect(() => {
    base44.entities.User.list().then(setUsers).catch(() => {});
  }, []);

  // Map email → display name
  const userNameMap = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      const name = (u.first_name && u.last_name)
        ? `${u.first_name} ${u.last_name}`
        : u.full_name || u.email;
      if (u.email) map[u.email] = name;
    });
    return map;
  }, [users]);

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));
  const locationMap = Object.fromEntries(locations.map((l) => [l.id, l.name]));

  // Only parent locations for the filter dropdown
  const parentLocations = useMemo(() => locations.filter((l) => !l.parent_location_id), [locations]);

  // Last editor per item
  const lastEditorMap = useMemo(() => {
    const map = {};
    history.forEach((h) => { if (!map[h.item_id] && h.created_by) map[h.item_id] = h.created_by; });
    return map;
  }, [history]);

  // Unique users from history
  const uniqueUsers = useMemo(() => {
    const users = new Set();
    history.forEach((h) => { if (h.created_by) users.add(h.created_by); });
    return [...users].sort();
  }, [history]);

  // Build a map keyed by both location name AND id → { parentName, subName, sortKey, isChild }
  const locationSortMap = useMemo(() => {
    const idToLoc = Object.fromEntries(locations.map((l) => [l.id, l]));
    const map = {};
    locations.forEach((l) => {
      const parent = l.parent_location_id ? idToLoc[l.parent_location_id] : null;
      const parentName = parent ? parent.name : null;
      // Parent-level items sort under their own name group, children sort under parent group
      // Use "00" prefix so parent items appear first within their group, before children
      const sortKey = parent ? `${parentName}__1_${l.name}` : `${l.name}__0`;
      const entry = { parentName, subName: l.name, sortKey, isChild: !!parent };
      map[l.name] = entry;
      map[l.id] = entry;
    });
    return map;
  }, [locations]);

  const toggleFilterLocation = (id) => {
    setFilterLocations((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // For each selected parent, collect its id, name, and all children ids/names
  const matchingLocationValues = useMemo(() => {
    if (filterLocations.size === 0) return null;
    const values = new Set();
    filterLocations.forEach((parentId) => {
      const parent = locations.find((l) => l.id === parentId);
      if (!parent) return;
      values.add(parent.id);
      values.add(parent.name);
      locations.filter((l) => l.parent_location_id === parentId).forEach((c) => {
        values.add(c.id);
        values.add(c.name);
      });
    });
    return values;
  }, [filterLocations, locations]);

  // Set of selected parent names (for filtering validation)
  const selectedParentNames = useMemo(() => {
    const names = new Set();
    filterLocations.forEach((id) => {
      const loc = locations.find((l) => l.id === id);
      if (loc) names.add(loc.name);
    });
    return names;
  }, [filterLocations, locations]);

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (filterCategory !== "all" && i.category_id !== filterCategory) return false;
      if (matchingLocationValues) {
        const itemLocs = Array.isArray(i.locations) && i.locations.length > 0 ? i.locations : (i.location ? [i.location] : []);
        const hasMatchingLoc = itemLocs.some((loc) => {
          if (!matchingLocationValues.has(loc)) return false;
          const locEntry = locationSortMap[loc];
          if (!locEntry) return false;
          return selectedParentNames.has(locEntry.parentName) || selectedParentNames.has(locEntry.subName);
        });
        if (!hasMatchingLoc) return false;
      }
      if (filterSupplier !== "all" && i.supplier_id !== filterSupplier) return false;
      if (filterUser !== "all" && lastEditorMap[i.id] !== filterUser) return false;
      if (dateFrom && i.updated_date && new Date(i.updated_date) < new Date(dateFrom)) return false;
      if (dateTo && i.updated_date && new Date(i.updated_date) > new Date(dateTo + "T23:59:59")) return false;
      if (filterStock === "out") return (i.case_quantity || 0) === 0;
      if (filterStock === "low") return (i.case_quantity || 0) > 0 && (i.case_quantity || 0) <= (i.min_cases || 0) && (i.min_cases || 0) > 0;
      if (filterStock === "ok") return (i.case_quantity || 0) > (i.min_cases || 0);
      return true;
    });
  }, [items, filterCategory, matchingLocationValues, selectedParentNames, filterStock, filterSupplier, filterUser, lastEditorMap, dateFrom, dateTo]);

  // Expand items with multiple locations into one row per location.
  // When a location filter is active, only include the matching locations for each item.
  const sortedFilteredItems = useMemo(() => {
    const rows = [];
    filteredItems.forEach((item) => {
      const locs = Array.isArray(item.locations) && item.locations.length > 0
        ? item.locations
        : (item.location ? [item.location] : [""]);
      // When filtered, only show the location(s) that match; otherwise show all
      const relevantLocs = matchingLocationValues
        ? locs.filter((loc) => {
            if (!matchingLocationValues.has(loc)) return false;
            const locEntry = locationSortMap[loc];
            if (!locEntry) return false;
            return selectedParentNames.has(locEntry.parentName) || selectedParentNames.has(locEntry.subName);
          })
        : locs;
      const locsToUse = relevantLocs.length > 0 ? relevantLocs : locs.slice(0, 1);
      locsToUse.forEach((loc) => {
        // Skip if this location is a parent (non-child) location — only show child locations
        const locEntry = locationSortMap[loc];
        if (locEntry && !locEntry.isChild) return;
        rows.push({ ...item, _reportLoc: loc });
      });
    });
    rows.sort((a, b) => {
      const aKey = (locationSortMap[a._reportLoc]?.sortKey) || (a._reportLoc || "zzz");
      const bKey = (locationSortMap[b._reportLoc]?.sortKey) || (b._reportLoc || "zzz");
      if (aKey !== bKey) return aKey.localeCompare(bKey);
      return (a.name || "").localeCompare(b.name || "");
    });
    return rows;
  }, [filteredItems, locationSortMap, matchingLocationValues, selectedParentNames]);

  const getItemRow = (i) => {
    const stockStatus = (i.case_quantity || 0) === 0 ? "Out of Stock"
      : (i.case_quantity || 0) <= (i.min_cases || 0) && (i.min_cases || 0) > 0 ? "Low Stock" : "OK";
    const rawLoc = i._reportLoc || (Array.isArray(i.locations) && i.locations.length > 0
      ? i.locations[0]
      : (i.location || ""));
    const locInfo = locationSortMap[rawLoc];
    // Show "Parent › SubLocation" if it's a child, otherwise just the sub-location name
    const locText = locInfo?.isChild
      ? `${locInfo.parentName} › ${locInfo.subName}`
      : (locInfo?.subName || rawLoc);
    return { i, stockStatus, locText };
  };

  const handleExcel = () => {
    const activeCols = ALL_COLUMNS.filter((c) => enabledCols.has(c.key));
    const headers = ["Name", ...activeCols.map((c) => c.label)];
    const totalCols = headers.length;
    const rows = [];
    let lastGroupKey = null;

    sortedFilteredItems.forEach((item) => {
      const { i, stockStatus, locText } = getItemRow(item);
      const locInfo = locationSortMap[item._reportLoc];
      const groupKey = locInfo
        ? (locInfo.isChild ? locInfo.parentName : locInfo.subName)
        : (item._reportLoc || "");

      if (groupKey && groupKey !== lastGroupKey) {
        lastGroupKey = groupKey;
        // Group header row
        const groupLabel = `"📦 ${groupKey}"`;
        const empties = Array(totalCols - 1).fill('""').join(",");
        rows.push(`${groupLabel},${empties}`);
      }

      const colValues = {
        sku: i.sku || "",
        category: categoryMap[i.category_id] || "",
        supplier: supplierMap[i.supplier_id] || i.supplier_name || "",
        location: locText,
        qty: i.case_quantity ?? 0,
        unit: i.case_unit || "cases",
        min_cases: i.min_cases ?? 0,
        max_cases: i.max_cases ?? 0,
        status: stockStatus,
        last_editor: userNameMap[lastEditorMap[i.id]] || lastEditorMap[i.id] || "",
        last_updated: i.updated_date ? format(new Date(i.updated_date), "yyyy-MM-dd HH:mm") : "",
      };
      const values = [i.name || "", ...activeCols.map((c) => colValues[c.key])];
      rows.push(values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const handlePrint = () => {
    const now = format(new Date(), "PPpp");
    const activeCols = ALL_COLUMNS.filter((c) => enabledCols.has(c.key));

    const totalCols = 1 + activeCols.length;
    let lastGroupKey = null;
    const rows = sortedFilteredItems.map((item) => {
      const { i, stockStatus, locText } = getItemRow(item);
      const locInfo = locationSortMap[item._reportLoc];
      // Use parentName if it's a child location, otherwise use the location's own name
      const groupKey = locInfo
        ? (locInfo.isChild ? locInfo.parentName : locInfo.subName)
        : (item._reportLoc || "");

      let groupRow = "";
      if (groupKey && groupKey !== lastGroupKey) {
        lastGroupKey = groupKey;
        groupRow = `<tr><td colspan="${totalCols}" style="background:#e0e7ff;color:#3730a3;font-weight:700;padding:6px 8px;font-size:11px;letter-spacing:0.03em">📦 ${groupKey}</td></tr>`;
      }

      const stockColor = stockStatus === "Out of Stock" ? "color:#dc2626" : stockStatus === "Low Stock" ? "color:#d97706" : "color:#16a34a";
      const colCells = {
        sku: `<td>${i.sku || "—"}</td>`,
        category: `<td>${categoryMap[i.category_id] || "—"}</td>`,
        supplier: `<td>${supplierMap[i.supplier_id] || i.supplier_name || "—"}</td>`,
        location: `<td>${locText || "—"}</td>`,
        qty: `<td style="text-align:center">${i.case_quantity ?? 0} ${i.case_unit || "cases"}</td>`,
        unit: `<td>${i.case_unit || "cases"}</td>`,
        min_cases: `<td style="text-align:center">${i.min_cases ?? 0}</td>`,
        max_cases: `<td style="text-align:center">${i.max_cases ?? 0}</td>`,
        status: `<td style="text-align:center;${stockColor};font-weight:600">${stockStatus}</td>`,
        last_editor: `<td>${userNameMap[lastEditorMap[i.id]] || lastEditorMap[i.id] || "—"}</td>`,
        last_updated: `<td>${i.updated_date ? format(new Date(i.updated_date), "MMM d, yyyy") : "—"}</td>`,
      };
      return `${groupRow}<tr><td>${i.name || ""}</td>${activeCols.map((c) => colCells[c.key]).join("")}</tr>`;
    }).join("");

    const filterDesc = [
      filterCategory !== "all" ? `Category: ${categoryMap[filterCategory] || filterCategory}` : null,
      filterLocations.size > 0 ? `Location: ${[...filterLocations].map((id) => locationMap[id] || id).join(", ")}` : null,
      filterStock !== "all" ? `Stock: ${filterStock === "out" ? "Out of Stock" : filterStock === "low" ? "Low Stock" : "OK"}` : null,
      filterUser !== "all" ? `Editor: ${userNameMap[filterUser] || filterUser}` : null,
      dateFrom || dateTo ? `Updated: ${dateFrom || "…"} → ${dateTo || "…"}` : null,
    ].filter(Boolean).join(" | ") || "All items";

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Custom Inventory Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 11px; color: #1e293b; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 8px; }
    .header h1 { font-size: 20px; font-weight: 700; color: #4f46e5; }
    .header p { font-size: 10px; color: #64748b; }
    .filters { font-size: 10px; color: #64748b; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #f1f5f9; text-align: left; padding: 5px 8px; font-weight: 600; color: #475569; border-bottom: 1px solid #cbd5e1; white-space: nowrap; }
    td { padding: 4px 8px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div><h1>Custom Inventory Report</h1><p>Generated on ${now}</p></div>
    <div style="text-align:right"><p style="font-size:12px;font-weight:600;color:#1e293b">${filteredItems.length} items · ${sortedFilteredItems.length} rows</p></div>
  </div>
  <div class="filters">Filters: ${filterDesc}</div>
  <table>
    <thead><tr><th>Name</th>${activeCols.map((c) => `<th>${c.label}</th>`).join("")}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white text-black max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-black">
            <Filter className="h-4 w-4 text-indigo-500" />
            Custom Report
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500 mb-4">
          Filter items and choose which columns to include in the report.
        </p>

        <div className="space-y-4">
          {/* Filters */}
          <div>
            <Label className="text-black text-sm mb-1 block">Category</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="bg-white text-black border-slate-300"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-black text-sm">Location</Label>
              {filterLocations.size > 0 && (
                <button onClick={() => setFilterLocations(new Set())} className="text-xs text-indigo-500 hover:text-indigo-700">Clear</button>
              )}
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 max-h-36 overflow-y-auto">
              {parentLocations.map((l) => (
                <label key={l.id} className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    checked={filterLocations.has(l.id)}
                    onCheckedChange={() => toggleFilterLocation(l.id)}
                    className="border-slate-400"
                  />
                  <span className="text-sm text-slate-700">{l.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-black text-sm mb-1 block">Supplier</Label>
            <Select value={filterSupplier} onValueChange={setFilterSupplier}>
              <SelectTrigger className="bg-white text-black border-slate-300"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-black text-sm mb-1 block">Last Edited By</Label>
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="bg-white text-black border-slate-300"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {uniqueUsers.map((u) => <SelectItem key={u} value={u}>{userNameMap[u] || u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-black text-sm mb-1 block">Stock Level</Label>
            <Select value={filterStock} onValueChange={setFilterStock}>
              <SelectTrigger className="bg-white text-black border-slate-300"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock Levels</SelectItem>
                <SelectItem value="ok">OK (above minimum)</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date range */}
          <div>
            <Label className="text-black text-sm mb-1 block">Last Updated — Date Range</Label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-black focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <span className="text-slate-400 text-sm">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-black focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(""); setDateTo(""); }}
                  className="text-xs text-slate-400 hover:text-slate-600 whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Column selector */}
          <div>
            <Label className="text-black text-sm mb-2 block">Columns to include</Label>
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              {ALL_COLUMNS.map((col) => (
                <label key={col.key} className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    checked={enabledCols.has(col.key)}
                    onCheckedChange={() => toggleCol(col.key)}
                    className="border-slate-400"
                  />
                  <span className="text-sm text-slate-700">{col.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600 border border-slate-200">
            <span className="font-semibold text-slate-800">{filteredItems.length}</span> items
            {sortedFilteredItems.length !== filteredItems.length && (
              <span> · <span className="font-semibold text-slate-800">{sortedFilteredItems.length}</span> rows (multi-location)</span>
            )}
            {" "}· <span className="font-semibold text-slate-800">{enabledCols.size + 1}</span> columns
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-6">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-white text-green-700 border-green-600 hover:bg-green-50"
              disabled={sortedFilteredItems.length === 0}
              onClick={handleExcel}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
            <Button
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={sortedFilteredItems.length === 0}
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print / PDF
            </Button>
          </div>
          <Button variant="outline" className="w-full bg-white text-black border-slate-300" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}