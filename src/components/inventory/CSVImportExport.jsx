import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, FileText, CheckCircle, AlertCircle, X } from "lucide-react";
import { dim as base44 } from "@/api/dimDataClient";

const CSV_HEADERS = ["name", "product_id", "description", "category_name", "supplier_name", "case_quantity", "case_unit", "units_per_case", "unit", "min_cases", "unit_cost", "sale_price", "location", "notes"];

function itemsToCSV(items, categories, suppliers) {
  const categoryMap = Object.fromEntries((categories || []).map(c => [c.id, c.name]));
  const supplierMap = Object.fromEntries((suppliers || []).map(s => [s.id, s.name]));
  const rows = [CSV_HEADERS.join(",")];
  items.forEach(item => {
    const row = CSV_HEADERS.map(h => {
      let val;
      if (h === "category_name") {
        val = item.category_id ? (categoryMap[item.category_id] || "") : "";
      } else if (h === "supplier_name") {
        val = item.supplier_id ? (supplierMap[item.supplier_id] || item.supplier_name || "") : (item.supplier_name || "");
      } else if (h === "product_id") {
        val = item.sku ?? "";
      } else {
        val = item[h] ?? "";
      }
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    rows.push(row.join(","));
  });
  return rows.join("\n");
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  return lines.slice(1).map(line => {
    const vals = [];
    let cur = "", inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === "," && !inQuote) { vals.push(cur); cur = ""; }
      else { cur += ch; }
    }
    vals.push(cur);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i]?.trim() ?? ""; });
    return obj;
  });
}

export default function CSVImportExport({ open, onClose, items, categories, suppliers = [], onImportComplete }) {
  const [tab, setTab] = useState("export");
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [importMode, setImportMode] = useState("add"); // "add" | "update"
  const [cleaning, setCleaning] = useState(false);
  const [cleanResults, setCleanResults] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const fileRef = useRef();

  const allLocations = [...new Set(items.map(i => i.location).filter(Boolean))].sort();

  const toggleCategory = (id) => setSelectedCategories(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleLocation = (loc) => setSelectedLocations(prev => prev.includes(loc) ? prev.filter(x => x !== loc) : [...prev, loc]);

  const getFilteredItems = () => {
    let filtered = items;
    if (selectedCategories.length > 0) filtered = filtered.filter(i => selectedCategories.includes(i.category_id));
    if (selectedLocations.length > 0) filtered = filtered.filter(i => selectedLocations.includes(i.location));
    return filtered;
  };

  const handleExport = () => {
    const filtered = getFilteredItems();
    const csv = itemsToCSV(filtered, categories, suppliers);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = () => {
    const template = CSV_HEADERS.join(",") + "\n" +
      '"Example Item","SKU001","A sample item","Beverages","Supplier Co","10","cases","12","pieces","2","1.50","3.00","Shelf A","Notes here"';
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCleanDuplicates = async () => {
    setCleaning(true);
    setCleanResults(null);
    // Group items by sku (product_id)
    const bySku = {};
    items.forEach(item => {
      if (!item.sku) return;
      if (!bySku[item.sku]) bySku[item.sku] = [];
      bySku[item.sku].push(item);
    });
    // Find duplicates: sku appears more than once — delete uncategorized ones
    let deleted = 0;
    for (const [sku, group] of Object.entries(bySku)) {
      if (group.length < 2) continue;
      const toDelete = group.filter(i => !i.category_id);
      for (const item of toDelete) {
        await base44.entities.InventoryItem.delete(item.id);
        deleted++;
      }
    }
    setCleanResults(deleted);
    setCleaning(false);
    if (deleted > 0) onImportComplete();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportResults(null);
    const text = await file.text();
    const rows = parseCSV(text);
    let success = 0, errors = [];
    const categoryByName = Object.fromEntries((categories || []).map(c => [c.name.toLowerCase(), c.id]));
    const supplierByName = Object.fromEntries((suppliers || []).map(s => [s.name.toLowerCase(), s.id]));

    if (importMode === "update") {
      // Bulk update: match by product_id, update category and supplier
      const skuToItem = {};
      items.forEach(item => { if (item.sku) skuToItem[item.sku] = item; });
      for (const row of rows) {
        if (!row.product_id) { errors.push(`Row skipped: missing product_id for update`); continue; }
        const pid = row.product_id.trim();
        const existing = skuToItem[pid];
        if (!existing) { errors.push(`Row skipped: Product ID "${pid}" not found in inventory`); continue; }
        const updates = {};
        if (row.category_name) {
          const catId = categoryByName[row.category_name.toLowerCase()];
          if (catId) updates.category_id = catId;
          else errors.push(`Warning: Category "${row.category_name}" not found for "${pid}"`);
        }
        if (row.supplier_name) {
          const supId = supplierByName[row.supplier_name.toLowerCase()];
          if (supId) updates.supplier_id = supId;
          else updates.supplier_name = row.supplier_name;
        }
        if (row.location) updates.location = row.location;
        if (Object.keys(updates).length === 0) { errors.push(`Row skipped: no updatable fields for "${pid}"`); continue; }
        await base44.entities.InventoryItem.update(existing.id, updates);
        success++;
      }
    } else {
      // Add mode: skip existing product IDs
      const existingSkus = new Set(items.map(i => i.sku).filter(Boolean));
      const importedProductIds = new Set();
      for (const row of rows) {
        if (!row.name) { errors.push(`Row skipped: missing name`); continue; }
        if (row.product_id) {
          const pid = row.product_id.trim();
          if (existingSkus.has(pid)) { errors.push(`Row skipped: Product ID "${pid}" already exists in inventory`); continue; }
          if (importedProductIds.has(pid)) { errors.push(`Row skipped: Product ID "${pid}" is duplicated in the CSV`); continue; }
          importedProductIds.add(pid);
        }
        const categoryId = row.category_name ? categoryByName[row.category_name.toLowerCase()] : undefined;
        const supplierId = row.supplier_name ? supplierByName[row.supplier_name.toLowerCase()] : undefined;
        const data = {
          name: row.name,
          sku: row.product_id || undefined,
          description: row.description || undefined,
          category_id: categoryId || undefined,
          supplier_id: supplierId || undefined,
          supplier_name: !supplierId && row.supplier_name ? row.supplier_name : undefined,
          case_quantity: row.case_quantity ? Number(row.case_quantity) : 0,
          case_unit: row.case_unit || "cases",
          units_per_case: row.units_per_case ? Number(row.units_per_case) : 1,
          unit: row.unit || "pieces",
          min_cases: row.min_cases ? Number(row.min_cases) : 0,
          unit_cost: row.unit_cost ? Number(row.unit_cost) : 0,
          sale_price: row.sale_price ? Number(row.sale_price) : 0,
          location: row.location || undefined,
          notes: row.notes || undefined,
        };
        await base44.entities.InventoryItem.create(data);
        success++;
      }
    }
    setImportResults({ success, errors, total: rows.length, mode: importMode });
    setImporting(false);
    if (success > 0) onImportComplete();
    fileRef.current.value = "";
  };

  const handleClose = () => {
    setImportResults(null);
    setTab("export");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg bg-white text-black">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            CSV Import / Export
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-4">
          {["export", "import"].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setImportResults(null); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium capitalize transition-all ${tab === t ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "export" && (
          <div className="space-y-4">
            {/* Category filter */}
            {categories.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">Filter by Category <span className="text-slate-400">(leave empty for all)</span></p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        selectedCategories.includes(cat.id)
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-black border-slate-300 hover:border-indigo-400"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Location filter */}
            {allLocations.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">Filter by Location <span className="text-slate-400">(leave empty for all)</span></p>
                <div className="flex flex-wrap gap-2">
                  {allLocations.map(loc => (
                    <button
                      key={loc}
                      onClick={() => toggleLocation(loc)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        selectedLocations.includes(loc)
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-black border-slate-300 hover:border-indigo-400"
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 bg-indigo-50 rounded-xl">
              <p className="text-sm text-slate-700 font-medium">{getFilteredItems().length} items ready to export</p>
              <p className="text-xs text-slate-500 mt-1">{selectedCategories.length === 0 && selectedLocations.length === 0 ? "All inventory items" : "Filtered selection"}</p>
            </div>
            <Button onClick={handleExport} className="w-full bg-white text-black border border-slate-300 hover:bg-slate-50">
              <Download className="h-4 w-4 mr-2" />
              Download Inventory CSV
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center text-xs text-slate-400 bg-white px-2">or</div>
            </div>
            <Button variant="outline" onClick={handleDownloadTemplate} className="w-full bg-white text-black border border-slate-300 hover:bg-slate-50">
              <Download className="h-4 w-4 mr-2" />
              Download Import Template
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center text-xs text-slate-400 bg-white px-2">cleanup</div>
            </div>
            <Button variant="outline" onClick={handleCleanDuplicates} disabled={cleaning} className="w-full bg-white text-black border border-slate-300 hover:bg-slate-50">
              <X className="h-4 w-4 mr-2" />
              {cleaning ? "Cleaning..." : "Delete Uncategorized Duplicates"}
            </Button>
            {cleanResults !== null && (
              <p className="text-xs text-center text-slate-500">
                {cleanResults === 0 ? "No duplicates found." : `${cleanResults} duplicate item(s) deleted.`}
              </p>
            )}
          </div>
        )}

        {tab === "import" && (
          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => { setImportMode("add"); setImportResults(null); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${importMode === "add" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              >
                Add New Items
              </button>
              <button
                onClick={() => { setImportMode("update"); setImportResults(null); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${importMode === "update" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              >
                Bulk Update
              </button>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-sm text-amber-800">
              <p className="font-medium">Import Guidelines</p>
              <ul className="list-disc ml-4 mt-1 space-y-0.5 text-xs">
                <li>Download the template to get the correct format</li>
                <li>Items will be added (not overwritten)</li>
                {importMode === "add" ? (
                  <>
                    <li>The <strong>name</strong> column is required; use <strong>product_id</strong> for Product ID</li>
                    <li>Use <strong>supplier_name</strong> to match or set a supplier</li>
                  </>
                ) : (
                  <>
                    <li><strong>product_id</strong> is required to match existing items</li>
                    <li>Only <strong>category_name</strong>, <strong>supplier_name</strong>, and <strong>location</strong> will be updated</li>
                  </>
                )}
              </ul>
            </div>

            {!importResults ? (
              <label className="block">
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all">
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-700">Click to upload CSV file</p>
                  <p className="text-xs text-slate-400 mt-1">Only .csv files supported</p>
                  {importing && <p className="text-xs text-indigo-600 mt-2 font-medium">Importing…</p>}
                </div>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} disabled={importing} />
              </label>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <p className="text-sm text-emerald-800 font-medium">{importResults.success} of {importResults.total} items imported successfully</p>
                </div>
                {importResults.errors.length > 0 && (
                  <div className="p-3 bg-rose-50 rounded-lg space-y-1">
                    <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-rose-500" /><p className="text-xs font-medium text-rose-700">{importResults.errors.length} errors</p></div>
                    {importResults.errors.map((e, i) => <p key={i} className="text-xs text-rose-600 ml-6">{e}</p>)}
                  </div>
                )}
                <Button variant="outline" className="w-full" onClick={() => setImportResults(null)}>
                  Import More
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}