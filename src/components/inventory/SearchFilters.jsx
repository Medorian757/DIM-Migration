import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Grid3X3, List, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SearchFilters({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  stockFilter,
  setStockFilter,
  selectedLocation,
  setSelectedLocation,
  locations,
  locationRecords = [],
  viewMode,
  setViewMode,
  categories,
  sortBy,
  setSortBy
}) {
  // Resolve a location value (ID or legacy name) to a display label
  const resolveLocationLabel = (val) => {
    if (!val) return val;
    let loc = locationRecords.find(l => l.id === val);
    if (!loc) loc = locationRecords.find(l => l.name === val);
    if (!loc) return val;
    if (loc.parent_location_id) {
      const parent = locationRecords.find(l => l.id === loc.parent_location_id);
      return parent ? `${parent.name} › ${loc.name}` : loc.name;
    }
    return loc.name;
  };
  const hasActiveFilters = selectedCategory || stockFilter !== "all" || searchQuery || selectedLocation;

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setStockFilter("all");
    setSelectedLocation("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items by name, SKU, or location..."
            className="pl-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400" />
          
        </div>
        
        {/* Category Filter */}
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="bg-white text-slate-900 px-3 py-2 text-sm rounded-md flex h-9 items-center justify-between whitespace-nowrap border border-input shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 w-full sm:w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All Categories</SelectItem>
            {categories.map((cat) =>
            <SelectItem key={cat.id} value={cat.id}>
                <div className="flex items-center gap-2">
                  <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: cat.color || "#94a3b8" }} />
                
                  {cat.name}
                </div>
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        
        {/* Location Filter */}
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="bg-white text-slate-900 px-3 py-2 text-sm rounded-md flex h-9 items-center justify-between whitespace-nowrap border border-input shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 w-full sm:w-40">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All Locations</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc} value={loc}>{resolveLocationLabel(loc)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Stock Filter */}
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="bg-white text-slate-900 px-3 py-2 text-sm rounded-md flex h-9 items-center justify-between whitespace-nowrap border border-input shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 w-full sm:w-40">
            <SelectValue placeholder="Stock Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            <SelectItem value="non_trusted">Non-Trusted</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {hasActiveFilters &&
      <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-500">Active filters:</span>
          {searchQuery &&
        <Badge variant="secondary" className="gap-1">
              Search: {searchQuery}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery("")} />
            </Badge>
        }
          {selectedCategory &&
        <Badge variant="secondary" className="gap-1">
              {categories.find((c) => c.id === selectedCategory)?.name}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedCategory("")} />
            </Badge>
        }
          {selectedLocation &&
        <Badge variant="secondary" className="gap-1">
              {resolveLocationLabel(selectedLocation)}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedLocation("")} />
            </Badge>
        }
          {stockFilter !== "all" &&
        <Badge variant="secondary" className="gap-1">
              {stockFilter === "non_trusted" ? "Non-Trusted" : stockFilter.replace(/_/g, " ")}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setStockFilter("all")} />
            </Badge>
        }
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500 h-7">
            Clear all
          </Button>
        </div>
      }
    </div>);

}