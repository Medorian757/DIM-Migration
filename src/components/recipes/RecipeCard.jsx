import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChefHat, Edit2, Trash2, Clock, DollarSign, Package, TrendingUp } from "lucide-react";

export default function RecipeCard({ recipe, items, onEdit, onDelete }) {
  const outputItem = items.find(i => i.id === recipe.output_item_id);
  
  // Calculate total ingredient cost
  const ingredientCost = (recipe.ingredients || []).reduce((sum, ing) => {
    const item = items.find(i => i.id === ing.item_id);
    return sum + ((item?.unit_cost || 0) * (ing.quantity || 0));
  }, 0);
  
  const laborCost = recipe.labor_cost || 0;
  const overheadCost = recipe.overhead_cost || 0;
  const totalCost = ingredientCost + laborCost + overheadCost;
  const costPerUnit = recipe.yield_quantity > 0 ? totalCost / recipe.yield_quantity : 0;
  
  const sellingPrice = recipe.selling_price !== undefined && recipe.selling_price !== null 
    ? recipe.selling_price 
    : (outputItem?.sale_price || 0);
  const profitPerUnit = sellingPrice - costPerUnit;
  const profitMargin = sellingPrice > 0 ? ((profitPerUnit / sellingPrice) * 100).toFixed(1) : 0;
  
  return (
    <Card className="group bg-white border-0 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center flex-shrink-0">
              <ChefHat className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">{recipe.name}</h3>
              {outputItem && (
                <div className="flex items-center gap-2 mt-1">
                  <Package className="h-3 w-3 text-slate-400" />
                  <p className="text-sm text-slate-500">
                    Makes {recipe.yield_quantity} {outputItem.unit || 'units'} of {outputItem.name}
                  </p>
                </div>
              )}
              {recipe.prep_time_minutes && (
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <p className="text-xs text-slate-500">{recipe.prep_time_minutes} min</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" onClick={() => onEdit(recipe)} className="h-8 w-8">
              <Edit2 className="h-4 w-4 text-slate-500" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(recipe)} className="h-8 w-8 hover:bg-rose-50">
              <Trash2 className="h-4 w-4 text-slate-500 hover:text-rose-500" />
            </Button>
          </div>
        </div>
        
        {recipe.description && (
          <p className="text-sm text-slate-600 mb-4 line-clamp-2">{recipe.description}</p>
        )}
        
        {/* Ingredients */}
        <div className="mb-4">
          <p className="text-xs font-medium text-slate-500 mb-2">Ingredients</p>
          <div className="space-y-1">
            {(recipe.ingredients || []).slice(0, 3).map((ing, idx) => {
              const item = items.find(i => i.id === ing.item_id);
              return item ? (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 truncate">{item.name}</span>
                  <span className="text-slate-400 text-xs ml-2 flex-shrink-0">{ing.quantity} units</span>
                </div>
              ) : null;
            })}
            {(recipe.ingredients || []).length > 3 && (
              <p className="text-xs text-slate-400">+ {recipe.ingredients.length - 3} more...</p>
            )}
          </div>
        </div>
        
        {/* Cost Breakdown */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Ingredients</span>
            <span className="font-medium text-slate-900">${ingredientCost.toFixed(2)}</span>
          </div>
          {laborCost > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Labor</span>
              <span className="font-medium text-slate-900">${laborCost.toFixed(2)}</span>
            </div>
          )}
          {overheadCost > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Overhead</span>
              <span className="font-medium text-slate-900">${overheadCost.toFixed(2)}</span>
            </div>
          )}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Cost per Unit</span>
              <span className="text-lg font-bold text-slate-900">${costPerUnit.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {/* Profitability */}
        {sellingPrice > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-900">
                  ${profitPerUnit.toFixed(2)} profit/unit
                </span>
              </div>
              <Badge className={`${
                profitMargin >= 30 ? 'bg-emerald-100 text-emerald-700' : 
                profitMargin >= 15 ? 'bg-yellow-100 text-yellow-700' : 
                'bg-rose-100 text-rose-700'
              } border-0`}>
                {profitMargin}% margin
              </Badge>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}