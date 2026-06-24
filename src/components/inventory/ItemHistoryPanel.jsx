import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { dim as base44 } from "@/api/dimDataClient";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Package, TrendingUp, DollarSign, Edit3, Plus } from "lucide-react";
import { format } from "date-fns";

const CHANGE_CONFIG = {
  item_created: { icon: Plus, color: "bg-indigo-100 text-indigo-700", label: "Created" },
  quantity_change: { icon: TrendingUp, color: "bg-emerald-100 text-emerald-700", label: "Stock Change" },
  price_change: { icon: DollarSign, color: "bg-violet-100 text-violet-700", label: "Price Change" },
  details_change: { icon: Edit3, color: "bg-amber-100 text-amber-700", label: "Details Updated" },
};

function HistoryEntry({ entry }) {
  const config = CHANGE_CONFIG[entry.change_type] || CHANGE_CONFIG.details_change;
  const Icon = config.icon;

  return (
    <div className="flex gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${config.color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className={`text-xs border-0 ${config.color}`}>{config.label}</Badge>
          <span className="text-xs text-slate-400 flex-shrink-0">
            {format(new Date(entry.created_date), "MMM d, yyyy h:mm a")}
          </span>
        </div>
        {entry.field_changed && (
          <p className="text-xs text-slate-600 mt-1 font-medium capitalize">{entry.field_changed.replace(/_/g, " ")}</p>
        )}
        {(entry.old_value !== undefined && entry.new_value !== undefined) && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded line-through">{entry.old_value || "—"}</span>
            <span className="text-xs text-slate-400">→</span>
            <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-medium">{entry.new_value || "—"}</span>
          </div>
        )}
        {entry.notes && <p className="text-xs text-slate-500 mt-1 italic">{entry.notes}</p>}
        {entry.created_by && <p className="text-xs text-slate-400 mt-1">by {entry.created_by}</p>}
      </div>
    </div>
  );
}

export default function ItemHistoryPanel({ open, onClose, item }) {
  const { data: history = [], isLoading, refetch } = useQuery({
    queryKey: ["item-history", item?.id],
    queryFn: () => base44.entities.ItemHistory.filter({ item_id: item.id }, "-created_date", 50),
    enabled: !!item?.id && open,
  });

  useEffect(() => {
    if (open && item?.id) refetch();
  }, [open, item?.id]);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-600" />
            Change History
          </SheetTitle>
          {item && (
            <div className="flex items-center gap-2 mt-1">
              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                {item.image_url
                  ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                  : <Package className="h-4 w-4 text-slate-400" />
                }
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{item.name}</p>
                {item.sku && <p className="text-xs text-slate-400">SKU: {item.sku}</p>}
              </div>
            </div>
          )}
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <History className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">No history yet</p>
            <p className="text-xs text-slate-400 mt-1">Changes will appear here after edits are made</p>
          </div>
        ) : (
          <div className="space-y-0">
            {history.map(entry => <HistoryEntry key={entry.id} entry={entry} />)}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}