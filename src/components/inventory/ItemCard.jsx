import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, MapPin, AlertTriangle, Edit2, Trash2, History, CalendarClock } from "lucide-react";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ItemCard({ item, category, locationLabel, onEdit, onDelete, onHistory, viewMode = "grid", isAdmin = true, showPricing = true }) {
  const caseQty = item.case_quantity || 0;
  const minCases = item.min_cases || 0;
  const isLowStock = caseQty <= minCases && minCases > 0;

  const expiryStatus = (() => {
    if (!item.expiration_date) return null;
    const today = new Date();
    const exp = new Date(item.expiration_date);
    const daysLeft = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { label: "Expired", color: "bg-rose-100 text-rose-700" };
    if (daysLeft <= 7) return { label: `Exp. ${daysLeft}d`, color: "bg-rose-100 text-rose-700" };
    if (daysLeft <= 30) return { label: `Exp. ${daysLeft}d`, color: "bg-orange-100 text-orange-700" };
    return null;
  })();
  const totalUnits = caseQty * (item.units_per_case || 1);
  const totalValue = totalUnits * (item.unit_cost || 0);

  if (viewMode === "list") {
    return (
      <Card className="bg-white text-card-foreground px-4 py-4 rounded-xl border-0 shadow-sm hover:shadow-md transition-all duration-300">
        {/* ── Mobile layout ── */}
        <div className="flex md:hidden items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <h3 className="font-semibold text-slate-900 text-sm truncate min-w-0 flex-1">{item.name?.split(' ').slice(0, 3).join(' ')}{item.name?.split(' ').length > 3 ? '…' : ''}</h3>
              {isLowStock &&
                <Badge variant="destructive" className="bg-rose-50 text-rose-600 border-0 text-xs shrink-0">
                  <AlertTriangle className="h-3 w-3 mr-0.5" />Low
                </Badge>
              }
              {item.non_trusted &&
                <Badge className="bg-yellow-100 text-yellow-800 border-0 text-xs shrink-0">
                  <ShieldAlert className="h-3 w-3 mr-0.5" />Non-Trusted
                </Badge>
              }
              {expiryStatus &&
                <Badge className={`${expiryStatus.color} border-0 text-xs shrink-0`}>
                  <CalendarClock className="h-3 w-3 mr-0.5" />{expiryStatus.label}
                </Badge>
              }
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs font-bold text-slate-900">{caseQty} <span className="font-normal text-slate-500">{item.case_unit || 'cases'}</span></span>
              {category && <Badge variant="secondary" className="text-xs py-0" style={{ backgroundColor: `${category.color}20`, color: category.color }}>{category.name}</Badge>}
              {locationLabel && <span className="text-xs text-slate-400 flex items-center gap-0.5"><MapPin className="h-3 w-3" />{locationLabel}</span>}
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => onHistory(item)} className="h-9 w-9" aria-label="View history">
              <History className="h-4 w-4 text-slate-400" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="h-9 w-9" aria-label={isAdmin ? "Edit item" : "Update count"}>
              <Edit2 className="h-4 w-4 text-slate-500" />
            </Button>
            {isAdmin &&
              <Button variant="ghost" size="icon" onClick={() => onDelete(item)} className="h-9 w-9 hover:bg-rose-50" aria-label="Delete item">
                <Trash2 className="h-4 w-4 text-slate-500 hover:text-rose-500" />
              </Button>
            }
          </div>
        </div>

        {/* ── Desktop layout ── */}
        <div className="hidden md:flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {item.image_url
              ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
              : <Package className="h-5 w-5 text-slate-400" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 min-w-0">
              <h3 className="font-semibold text-slate-900 truncate min-w-0 flex-1">{item.name?.split(' ').slice(0, 3).join(' ')}{item.name?.split(' ').length > 3 ? '…' : ''}</h3>
              {isLowStock &&
                <Badge variant="destructive" className="bg-rose-50 text-rose-600 border-0 text-xs shrink-0">
                  <AlertTriangle className="h-3 w-3 mr-1" />Low Stock
                </Badge>
              }
              {item.non_trusted &&
                <Badge className="bg-yellow-100 text-yellow-800 border-0 text-xs shrink-0">
                  <ShieldAlert className="h-3 w-3 mr-1" />Non-Trusted
                </Badge>
              }
              {expiryStatus &&
                <Badge className={`${expiryStatus.color} border-0 text-xs shrink-0`}>
                  <CalendarClock className="h-3 w-3 mr-1" />{expiryStatus.label}
                </Badge>
              }
            </div>
            {item.sku && <p className="text-xs text-slate-400">Product ID: {item.sku}</p>}
            {showPricing && (
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs font-semibold text-slate-700">${(item.unit_cost || 0).toFixed(2)} <span className="font-normal text-slate-400">/ unit</span></span>
                <span className="text-xs font-bold text-indigo-600">${totalValue.toFixed(2)} <span className="font-normal text-slate-400">total</span></span>
              </div>
            )}
          </div>
          <div className="w-28 text-center shrink-0">
            <p className="text-xl font-bold text-slate-900">{caseQty}</p>
            <p className="text-xs text-slate-500">{item.case_unit || 'cases'}</p>
            {item.units_per_case > 1 && <p className="text-xs text-slate-400">{totalUnits} {item.unit || 'units'}</p>}
          </div>
          <div className="w-32 shrink-0">
            {category
              ? <Badge variant="secondary" className="text-xs" style={{ backgroundColor: `${category.color}20`, color: category.color }}>{category.name}</Badge>
              : <span className="text-xs text-slate-300">—</span>
            }
          </div>
          <div className="w-32 shrink-0">
            {locationLabel
              ? <p className="text-xs text-slate-500 flex items-center gap-1 truncate"><MapPin className="h-3 w-3 shrink-0" />{locationLabel}</p>
              : <span className="text-xs text-slate-300">—</span>
            }
          </div>
          <div className="w-28 flex items-center justify-end gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => onHistory(item)} className="h-9 w-9" aria-label="View history">
              <History className="h-4 w-4 text-slate-400" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="h-9 w-9" aria-label={isAdmin ? "Edit item" : "Update count"}>
              <Edit2 className="h-4 w-4 text-slate-500" />
            </Button>
            {isAdmin &&
              <Button variant="ghost" size="icon" onClick={() => onDelete(item)} className="h-9 w-9 hover:bg-rose-50" aria-label="Delete item">
                <Trash2 className="h-4 w-4 text-slate-500 hover:text-rose-500" />
              </Button>
            }
          </div>
        </div>
      </Card>);
  }

  return (
    <Card className="group bg-white border-0 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
      <div className="aspect-square bg-slate-50 relative overflow-hidden">
        {item.image_url ?
        <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" /> :

        <div className="h-full w-full flex items-center justify-center">
            <Package className="h-16 w-16 text-slate-300" />
          </div>
        }
        
        {isLowStock &&
        <div className="absolute top-3 left-3">
            <Badge variant="destructive" className="bg-rose-500 text-white border-0 text-xs shadow-lg">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Low Stock
            </Badge>
          </div>
        }
        {item.non_trusted &&
        <div className="absolute left-3" style={{ top: isLowStock ? '3rem' : '0.75rem' }}>
            <Badge className="bg-yellow-400 text-yellow-900 border-0 text-xs shadow-lg">
              <ShieldAlert className="h-3 w-3 mr-1" />
              Non-Trusted
            </Badge>
          </div>
        }
        {expiryStatus &&
        <div className="absolute left-3" style={{ top: isLowStock && item.non_trusted ? '5.25rem' : (isLowStock || item.non_trusted) ? '3rem' : '0.75rem' }}>
            <Badge className={`${expiryStatus.color} border-0 text-xs shadow-lg`}>
              <CalendarClock className="h-3 w-3 mr-1" />
              {expiryStatus.label}
            </Badge>
          </div>
        }
        
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <Button variant="secondary" size="icon" onClick={() => onHistory(item)} className="h-11 w-11 bg-white/90 backdrop-blur-sm shadow-lg" aria-label="View history">
            <History className="h-4 w-4 text-slate-600" />
          </Button>
          <Button variant="secondary" size="icon" onClick={() => onEdit(item)} className="h-11 w-11 bg-white/90 backdrop-blur-sm shadow-lg" aria-label={isAdmin ? "Edit item" : "Update count"}>
            <Edit2 className="h-4 w-4" />
          </Button>
          {isAdmin &&
          <Button variant="secondary" size="icon" onClick={() => onDelete(item)} className="h-11 w-11 bg-white/90 backdrop-blur-sm shadow-lg hover:bg-rose-50" aria-label="Delete item">
              <Trash2 className="h-4 w-4 text-rose-500" />
            </Button>
          }
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-slate-900 truncate">{item.name}</h3>
          {item.sku && <p className="text-xs text-slate-400 mt-0.5">Product ID: {item.sku}</p>}
          {showPricing && <div className="flex items-center gap-3 mt-1">
            <span className="text-sm font-semibold text-slate-900">${(item.unit_cost || 0).toFixed(2)} <span className="text-xs font-normal text-slate-500">/ {item.unit || 'unit'}</span></span>
            <span className="text-sm font-bold text-indigo-600">${totalValue.toFixed(2)} <span className="text-xs font-normal text-slate-500">total</span></span>
          </div>}
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div>
            <p className="text-2xl font-bold text-slate-900">{caseQty}</p>
            <p className="text-xs text-slate-500">{item.case_unit || 'cases'}</p>
            {item.units_per_case > 1 &&
            <p className="text-xs text-slate-400">{totalUnits} {item.unit || 'units'}</p>
            }
          </div>
        </div>

        <div className="flex items-center justify-between">
          {category ?
            <Badge
              variant="secondary"
              className="text-xs"
              style={{ backgroundColor: `${category.color}20`, color: category.color }}>
              {category.name}
            </Badge>
            : <span />
          }
          {locationLabel &&
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3 w-3" />
              {locationLabel}
            </div>
          }
        </div>
      </div>
    </Card>);

}