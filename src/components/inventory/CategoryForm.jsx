import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

const COLORS = [
  "#4F46E5", "#7C3AED", "#EC4899", "#EF4444", "#F97316", 
  "#EAB308", "#22C55E", "#14B8A6", "#06B6D4", "#3B82F6"
];

export default function CategoryForm({ open, onClose, category, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: COLORS[0]
  });
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    if (!open) return;
    if (category) {
      setFormData({
        name: category.name || "",
        description: category.description || "",
        color: category.color || COLORS[0]
      });
    } else {
      setFormData({
        name: "",
        description: "",
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      });
    }
  }, [open, category?.id]);
  
  const toTitleCase = (str) => str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ ...formData, name: toTitleCase(formData.name.trim()) });
    setSaving(false);
    onClose();
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white text-black">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {category ? "Edit Category" : "Add New Category"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter category name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter category description"
              rows={2}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`h-8 w-8 rounded-full transition-all ${
                    formData.color === color 
                      ? "ring-2 ring-offset-2 ring-slate-900 scale-110" 
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="text-white">
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !formData.name} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                category ? "Update Category" : "Add Category"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}