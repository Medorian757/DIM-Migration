import { useQuery } from "@tanstack/react-query";
import { dim as base44 } from "@/api/dimDataClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, MapPin, ShieldAlert } from "lucide-react";

export default function NonTrusted() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["items"],
    queryFn: () => base44.entities.InventoryItem.list("-created_date"),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.Category.list(),
  });

  const nonTrustedItems = items.filter((i) => i.non_trusted);
  const getCategoryById = (id) => categories.find((c) => c.id === id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-11 w-11 rounded-xl bg-rose-100 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-rose-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Non-Trusted Items</h1>
            <p className="text-slate-500 mt-0.5">Items flagged for additional review</p>
          </div>
          {!isLoading && (
            <Badge className="ml-auto bg-rose-100 text-rose-700 border-0 text-sm px-3 py-1">
              {nonTrustedItems.length} item{nonTrustedItems.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : nonTrustedItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
              <ShieldAlert className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No non-trusted items</h3>
            <p className="text-slate-500">All items are currently trusted.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {nonTrustedItems.map((item) => {
              const category = getCategoryById(item.category_id);
              const totalUnits = (item.case_quantity || 0) * (item.units_per_case || 1);
              return (
                <Card key={item.id} className="flex items-center gap-4 px-5 py-4 bg-white border-0 shadow-sm border-l-4 border-l-rose-400">
                  <div className="h-11 w-11 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                      : <Package className="h-5 w-5 text-slate-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <Badge className="bg-rose-100 text-rose-700 border-0 text-xs">Non-Trusted</Badge>
                      {category && (
                        <Badge variant="secondary" className="text-xs" style={{ backgroundColor: `${category.color}20`, color: category.color }}>
                          {category.name}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {item.sku && <span className="text-xs text-slate-400">SKU: {item.sku}</span>}
                      {item.location && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{item.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-slate-900">{item.case_quantity || 0}</p>
                    <p className="text-xs text-slate-500">{item.case_unit || "cases"}</p>
                    {item.units_per_case > 1 && (
                      <p className="text-xs text-slate-400">{totalUnits} {item.unit || "units"}</p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}