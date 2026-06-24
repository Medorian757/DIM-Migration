import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Grid3X3, List } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ViewControls({ viewMode, setViewMode, sortBy, setSortBy }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      {/* Sort */}
      <Select value={sortBy} onValueChange={setSortBy}>
        <SelectTrigger className="bg-white text-slate-900 px-3 py-2 text-sm rounded-md flex h-9 items-center justify-between whitespace-nowrap border border-input shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 w-44">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name_asc">Name (A-Z)</SelectItem>
          <SelectItem value="name_desc">Name (Z-A)</SelectItem>
          <SelectItem value="quantity_desc">Cases (High-Low)</SelectItem>
          <SelectItem value="quantity_asc">Cases (Low-High)</SelectItem>
          <SelectItem value="value_desc">Value (High-Low)</SelectItem>
          <SelectItem value="value_asc">Value (Low-High)</SelectItem>
          <SelectItem value="recent">Recently Added</SelectItem>
        </SelectContent>
      </Select>

      {/* View Toggle */}
      <div className="flex bg-white rounded-lg border border-slate-200 p-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setViewMode("grid")}
          aria-label="Grid view" className="text-indigo-600 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-11 w-11">
          
          
          <Grid3X3 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setViewMode("list")}
          aria-label="List view" className="text-indigo-600 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-11 w-11">
          
          
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>);

}