import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, Package, Clock, Activity } from "lucide-react";
import { format } from "date-fns";

const changeTypeLabel = {
  quantity_change: "Quantity",
  price_change: "Price",
  details_change: "Details",
  item_created: "Created",
};

function buildPrintHTML({ includeInventory, includeHistory, includeChanges, items, categories, history }) {
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const now = format(new Date(), "PPpp");

  let sections = "";

  if (includeInventory) {
    const rows = items.map((i) => `
      <tr>
        <td>${i.name || ""}</td>
        <td>${i.sku || ""}</td>
        <td>${categoryMap[i.category_id] || ""}</td>
        <td>${i.location || ""}</td>
        <td style="text-align:center">${i.case_quantity ?? 0} ${i.case_unit || "cases"}</td>
        <td style="text-align:right">$${(i.unit_cost ?? 0).toFixed(2)}</td>
        <td>${i.notes || ""}</td>
      </tr>`).join("");
    sections += `
      <h2>Inventory Snapshot</h2>
      <table>
        <thead><tr>
          <th>Name</th><th>SKU</th><th>Category</th><th>Location</th><th>Quantity</th><th>Unit Cost</th><th>Notes</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  if (includeHistory) {
    const rows = history.map((h) => `
      <tr>
        <td>${h.created_date ? format(new Date(h.created_date), "MMM d, yyyy HH:mm") : ""}</td>
        <td>${h.created_by || "—"}</td>
        <td>${h.item_name || ""}</td>
        <td>${changeTypeLabel[h.change_type] || h.change_type || ""}</td>
        <td>${h.field_changed || ""}</td>
        <td>${h.old_value || ""}</td>
        <td>${h.new_value || ""}</td>
        <td>${h.notes || ""}</td>
      </tr>`).join("");
    sections += `
      <h2 style="margin-top:32px">Full Audit History</h2>
      <table>
        <thead><tr>
          <th>Date</th><th>Edited By</th><th>Item</th><th>Type</th><th>Field</th><th>Before</th><th>After</th><th>Notes</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  if (includeChanges) {
    const recent = history.slice(0, 100);
    const rows = recent.map((h) => `
      <tr>
        <td>${h.created_date ? format(new Date(h.created_date), "MMM d, yyyy HH:mm") : ""}</td>
        <td>${h.created_by || "—"}</td>
        <td>${h.item_name || ""}</td>
        <td>${changeTypeLabel[h.change_type] || h.change_type || ""}</td>
        <td>${h.old_value || ""}</td>
        <td>${h.new_value || ""}</td>
      </tr>`).join("");
    sections += `
      <h2 style="margin-top:32px">Recent Changes (Last 100)</h2>
      <table>
        <thead><tr>
          <th>Date</th><th>Edited By</th><th>Item</th><th>Type</th><th>Before</th><th>After</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>StockFlow Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 11px; color: #1e293b; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px; }
    .header h1 { font-size: 20px; font-weight: 700; color: #4f46e5; }
    .header p { font-size: 10px; color: #64748b; }
    h2 { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px; }
    th { background: #f1f5f9; text-align: left; padding: 5px 8px; font-weight: 600; color: #475569; border-bottom: 1px solid #cbd5e1; }
    td { padding: 4px 8px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>StockFlow Report</h1>
      <p>Generated on ${now}</p>
    </div>
  </div>
  ${sections}
</body>
</html>`;
}

export default function ExportReportModal({ open, onClose, items, categories, history }) {
  const [includeInventory, setIncludeInventory] = useState(true);
  const [includeHistory, setIncludeHistory] = useState(true);
  const [includeChanges, setIncludeChanges] = useState(true);

  const handlePrint = () => {
    const html = buildPrintHTML({ includeInventory, includeHistory, includeChanges, items, categories, history });
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
    onClose();
  };

  const anySelected = includeInventory || includeHistory || includeChanges;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-white text-black">
        <DialogHeader>
          <DialogTitle>Print Report</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-black mb-4">Select the sections to include in the printout / PDF.</p>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <Checkbox checked={includeInventory} onCheckedChange={setIncludeInventory} className="mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium text-slate-900">Inventory Snapshot</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{items.length} items — name, SKU, quantity, cost, location</p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <Checkbox checked={includeHistory} onCheckedChange={setIncludeHistory} className="mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium text-slate-900">Full Audit History</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{history.length} records — all changes incl. who edited</p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <Checkbox checked={includeChanges} onCheckedChange={setIncludeChanges} className="mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-teal-500" />
                <span className="text-sm font-medium text-slate-900">Recent Changes</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Last 100 changes — condensed log incl. who edited</p>
            </div>
          </label>
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" className="flex-1 bg-white text-black border-black" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={!anySelected}
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print / Save PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}