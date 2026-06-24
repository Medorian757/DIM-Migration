import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, X, Loader2, DollarSign, Package, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function RecipeForm({ open, onClose, recipe, items, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    output_item_id: "",
    yield_quantity: 1,
    selling_price: null,
    ingredients: [],
    labor_cost: 0,
    overhead_cost: 0,
    instructions: "",
    prep_time_minutes: 0
  });
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    if (recipe) {
      setFormData({
        name: recipe.name || "",
        description: recipe.description || "",
        output_item_id: recipe.output_item_id || "",
        yield_quantity: recipe.yield_quantity || 1,
        selling_price: recipe.selling_price !== undefined ? recipe.selling_price : null,
        ingredients: recipe.ingredients || [],
        labor_cost: recipe.labor_cost || 0,
        overhead_cost: recipe.overhead_cost || 0,
        instructions: recipe.instructions || "",
        prep_time_minutes: recipe.prep_time_minutes || 0
      });
    } else {
      setFormData({
        name: "",
        description: "",
        output_item_id: "",
        yield_quantity: 1,
        selling_price: null,
        ingredients: [],
        labor_cost: 0,
        overhead_cost: 0,
        instructions: "",
        prep_time_minutes: 0
      });
    }
  }, [recipe, open]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(formData);
    setSaving(false);
    onClose();
  };
  
  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { item_id: "", quantity: 1 }]
    }));
  };
  
  const removeIngredient = (index) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };
  
  const updateIngredient = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => 
        i === index ? { ...ing, [field]: value } : ing
      )
    }));
  };
  
  // Calculate costs
  const ingredientCost = formData.ingredients.reduce((sum, ing) => {
    const item = items.find(i => i.id === ing.item_id);
    return sum + ((item?.unit_cost || 0) * (ing.quantity || 0));
  }, 0);
  
  const totalCost = ingredientCost + (formData.labor_cost || 0) + (formData.overhead_cost || 0);
  const costPerUnit = formData.yield_quantity > 0 ? totalCost / formData.yield_quantity : 0;
  
  const outputItem = items.find(i => i.id === formData.output_item_id);
  const sellingPrice = formData.selling_price !== null && formData.selling_price !== undefined
    ? formData.selling_price
    : (outputItem?.sale_price || 0);
  const profitPerUnit = sellingPrice - costPerUnit;
  const profitMargin = sellingPrice > 0 
    ? ((profitPerUnit / sellingPrice) * 100).toFixed(1) 
    : 0;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {recipe ? "Edit Recipe" : "Create New Recipe"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Recipe Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Chocolate Cake, Assembled Widget"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this recipe"
                rows={2}
              />
            </div>
          </div>
          
          {/* Output Item & Yield */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="output_item">Output Item *</Label>
              <Select
                value={formData.output_item_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, output_item_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item to produce" />
                </SelectTrigger>
                <SelectContent>
                  {items.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="yield_quantity">Yield Quantity *</Label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="yield_quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.yield_quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, yield_quantity: parseFloat(e.target.value) || 1 }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>
          
          {/* Selling Price Override */}
          <div className="space-y-2">
            <Label htmlFor="selling_price">Selling Price (Override)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <Input
                id="selling_price"
                type="number"
                min="0"
                step="0.01"
                value={formData.selling_price === null ? "" : formData.selling_price}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  selling_price: e.target.value === "" ? null : parseFloat(e.target.value) || 0 
                }))}
                className="pl-7"
                placeholder={outputItem ? `Default: $${(outputItem.sale_price || 0).toFixed(2)}` : "Enter price"}
              />
            </div>
            <p className="text-xs text-slate-500">
              Leave empty to use the output item's default selling price
            </p>
          </div>
          
          {/* Prep Time */}
          <div className="space-y-2">
            <Label htmlFor="prep_time">Preparation Time (minutes)</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="prep_time"
                type="number"
                min="0"
                value={formData.prep_time_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, prep_time_minutes: parseFloat(e.target.value) || 0 }))}
                className="pl-10"
                placeholder="0"
              />
            </div>
          </div>
          
          {/* Ingredients */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Ingredients / Components</Label>
              <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                <Plus className="h-4 w-4 mr-1" />
                Add Ingredient
              </Button>
            </div>
            
            <div className="space-y-2">
              {formData.ingredients.length === 0 ? (
                <Card className="p-6 text-center text-slate-500">
                  <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No ingredients added yet</p>
                </Card>
              ) : (
                formData.ingredients.map((ing, index) => {
                  const selectedItem = items.find(i => i.id === ing.item_id);
                  const ingCost = (selectedItem?.unit_cost || 0) * (ing.quantity || 0);
                  
                  return (
                    <Card key={index} className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <Select
                            value={ing.item_id}
                            onValueChange={(value) => updateIngredient(index, 'item_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {items.map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name} (${(item.unit_cost || 0).toFixed(2)}/{item.unit || 'unit'})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <div className="relative">
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={ing.quantity}
                              onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                              placeholder="Quantity"
                            />
                            {selectedItem && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                                {selectedItem.unit || 'units'}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-600 whitespace-nowrap">
                            ${ingCost.toFixed(2)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeIngredient(index)}
                            className="h-8 w-8 hover:bg-rose-50"
                          >
                            <X className="h-4 w-4 text-slate-400 hover:text-rose-500" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
          
          {/* Additional Costs */}
          <div className="p-4 rounded-xl bg-slate-50 space-y-4">
            <h3 className="font-semibold text-slate-900">Additional Costs</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="labor_cost">Labor Cost</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <Input
                    id="labor_cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.labor_cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, labor_cost: parseFloat(e.target.value) || 0 }))}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="overhead_cost">Overhead Cost</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <Input
                    id="overhead_cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.overhead_cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, overhead_cost: parseFloat(e.target.value) || 0 }))}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Cost Summary */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-indigo-600" />
              Cost Summary
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Ingredients</span>
                <span className="font-medium">${ingredientCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Labor</span>
                <span className="font-medium">${(formData.labor_cost || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Overhead</span>
                <span className="font-medium">${(formData.overhead_cost || 0).toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-indigo-200">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-900">Total Cost</span>
                  <span className="font-bold text-slate-900">${totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="font-semibold text-slate-900">Cost per Unit</span>
                  <span className="font-bold text-indigo-600">${costPerUnit.toFixed(2)}</span>
                </div>
              </div>
              
              {sellingPrice > 0 && (
                <div className="pt-2 border-t border-indigo-200">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Selling Price</span>
                    <span className="font-medium">
                      ${sellingPrice.toFixed(2)}
                      {formData.selling_price !== null && formData.selling_price !== undefined && (
                        <span className="text-xs text-indigo-600 ml-1">(custom)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-emerald-700">Profit per Unit</span>
                    <span className={`font-bold ${profitPerUnit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ${profitPerUnit.toFixed(2)} ({profitMargin}%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="Step-by-step instructions (optional)"
              rows={4}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saving || !formData.name || !formData.output_item_id} 
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                recipe ? "Update Recipe" : "Create Recipe"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}