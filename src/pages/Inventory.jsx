import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dim as base44 } from "@/api/dimDataClient";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, DollarSign, AlertTriangle, TrendingUp, Plus, FolderPlus, FileText, ScanLine, EyeOff, Eye, CheckSquare } from "lucide-react";
import { usePermissions } from "../components/usePermissions";
import { motion, AnimatePresence } from "framer-motion";

import StatsCard from "../components/inventory/StatsCard";
import ItemCard from "../components/inventory/ItemCard";
import ItemForm from "../components/inventory/ItemForm";
import CategoryForm from "../components/inventory/CategoryForm";
import SearchFilters from "../components/inventory/SearchFilters";
import ViewControls from "../components/inventory/ViewControls";
import DeleteConfirmDialog from "../components/inventory/DeleteConfirmDialog";
import CSVImportExport from "../components/inventory/CSVImportExport";
import ItemHistoryPanel from "../components/inventory/ItemHistoryPanel";
import BarcodeScanner from "../components/inventory/BarcodeScanner";
import PullToRefresh from "../components/PullToRefresh";
import BulkUpdateBar from "../components/inventory/BulkUpdateBar";

export default function Inventory() {
  const queryClient = useQueryClient();
  const { isAdmin } = usePermissions();

  // State
  const urlParams = new URLSearchParams(window.location.search);
  const locationParam = urlParams.get("location") || "";
  const categoryParam = urlParams.get("category") || "";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [stockFilter, setStockFilter] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState(locationParam);
  const [viewMode, setViewMode] = useState("list");
  const [sortBy, setSortBy] = useState("recent");

  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const [showPricing, setShowPricing] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectMode, setSelectMode] = useState(false);

  // Queries
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["items"],
    queryFn: () => base44.entities.InventoryItem.list("-created_date")
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.Category.list()
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: locationRecords = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: () => base44.entities.Location.list("name")
  });

  // Mutations
  const createItem = useMutation({
    mutationFn: (data) => base44.entities.InventoryItem.create(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["items"] });
      const prev = queryClient.getQueryData(["items"]);
      queryClient.setQueryData(["items"], (old) => [...(old || []), { ...data, id: `temp-${Date.now()}` }]);
      return { prev };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(["items"], ctx.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["items"] })
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InventoryItem.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["items"] });
      const prev = queryClient.getQueryData(["items"]);
      queryClient.setQueryData(["items"], (old) => (old || []).map((item) => item.id === id ? { ...item, ...data } : item));
      return { prev };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(["items"], ctx.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["items"] })
  });

  const deleteItem = useMutation({
    mutationFn: (id) => base44.entities.InventoryItem.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["items"] });
      const prev = queryClient.getQueryData(["items"]);
      queryClient.setQueryData(["items"], (old) => (old || []).filter((item) => item.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(["items"], ctx.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["items"] })
  });

  const createCategory = useMutation({
    mutationFn: (data) => base44.entities.Category.create(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["categories"] });
      const prev = queryClient.getQueryData(["categories"]);
      queryClient.setQueryData(["categories"], (old) => [...(old || []), { ...data, id: `temp-${Date.now()}` }]);
      return { prev };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(["categories"], ctx.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["categories"] })
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Category.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["categories"] });
      const prev = queryClient.getQueryData(["categories"]);
      queryClient.setQueryData(["categories"], (old) => (old || []).map((c) => c.id === id ? { ...c, ...data } : c));
      return { prev };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(["categories"], ctx.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["categories"] })
  });

  // Get all location values (IDs or legacy names) for an item
  const getItemLocations = (item) => {
    if (item.locations && item.locations.length > 0) return item.locations;
    if (item.location) return [item.location];
    return [];
  };

  // Computed values
  const locations = useMemo(() => {
    // Collect all unique location values (IDs or legacy names) used across items
    const locs = items.flatMap(i => (i.locations && i.locations.length > 0 ? i.locations : i.location ? [i.location] : []));
    return [...new Set(locs)];
  }, [items]);

  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalCases = items.reduce((sum, item) => sum + (item.case_quantity || 0), 0);
    const totalValue = items.reduce((sum, item) => {
      const units = (item.case_quantity || 0) * (item.units_per_case || 1);
      return sum + units * (item.unit_cost || 0);
    }, 0);

    const lowStockItems = items.filter((item) => {
      const minCases = item.min_cases || 0;
      return (item.case_quantity || 0) <= minCases && minCases > 0;
    }).length;

    return { totalItems, totalCases, totalValue, lowStockItems };
  }, [items]);

  // Filtered & Sorted Items
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => {
        if (item.name?.toLowerCase().includes(query)) return true;
        if (item.sku?.toLowerCase().includes(query)) return true;
        if (item.barcode?.toLowerCase().includes(query)) return true;
        const locs = item.locations && item.locations.length > 0 ? item.locations : item.location ? [item.location] : [];
        if (locs.some(l => l.toLowerCase().includes(query))) return true;
        return false;
      });
    }

    // Category
    if (selectedCategory) {
      result = result.filter((item) => item.category_id === selectedCategory);
    }

    // Location filter
    if (selectedLocation) {
      result = result.filter((item) => {
        const locs = getItemLocations(item);
        // Match by ID or legacy name
        return locs.some(val => {
          if (val === selectedLocation) return true;
          // Also check if the location record's name matches (legacy support)
          const loc = locationRecords.find(l => l.id === val || l.name === val);
          return loc && (loc.id === selectedLocation || loc.name === selectedLocation);
        });
      });
    }

    // Stock filter
    if (stockFilter === "in_stock") {
      result = result.filter((item) => (item.case_quantity || 0) > 0);
    } else if (stockFilter === "low_stock") {
      result = result.filter((item) => (item.case_quantity || 0) > 0 && (item.case_quantity || 0) <= (item.min_cases || 0) && (item.min_cases || 0) > 0);
    } else if (stockFilter === "out_of_stock") {
      result = result.filter((item) => (item.case_quantity || 0) === 0);
    } else if (stockFilter === "non_trusted") {
      result = result.filter((item) => item.non_trusted === true);
    }

    // Sort
    switch (sortBy) {
      case "name_asc":
        result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "name_desc":
        result.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        break;
      case "quantity_desc":
        result.sort((a, b) => (b.case_quantity || 0) - (a.case_quantity || 0));
        break;
      case "quantity_asc":
        result.sort((a, b) => (a.case_quantity || 0) - (b.case_quantity || 0));
        break;
      case "value_desc":
        result.sort((a, b) => {
          const aVal = (a.case_quantity || 0) * (a.units_per_case || 1) * (a.unit_cost || 0);
          const bVal = (b.case_quantity || 0) * (b.units_per_case || 1) * (b.unit_cost || 0);
          return bVal - aVal;
        });
        break;
      case "value_asc":
        result.sort((a, b) => {
          const aVal = (a.case_quantity || 0) * (a.units_per_case || 1) * (a.unit_cost || 0);
          const bVal = (b.case_quantity || 0) * (b.units_per_case || 1) * (b.unit_cost || 0);
          return aVal - bVal;
        });
        break;
      default:
        break;
    }

    return result;
  }, [items, searchQuery, selectedCategory, stockFilter, selectedLocation, sortBy]);

  // Handlers
  const handleSaveItem = async (data, originalItem) => {
    if (originalItem?.id) {
      // Track changes
      const trackChanges = [];
      if (data.case_quantity !== originalItem.case_quantity) {
        trackChanges.push({ change_type: "quantity_change", field_changed: "case_quantity", old_value: String(originalItem.case_quantity ?? 0), new_value: String(data.case_quantity ?? 0) });
      }
      if (data.unit_cost !== originalItem.unit_cost) {
        trackChanges.push({ change_type: "price_change", field_changed: "unit_cost", old_value: String(originalItem.unit_cost ?? 0), new_value: String(data.unit_cost ?? 0) });
      }
      if (data.sale_price !== originalItem.sale_price) {
        trackChanges.push({ change_type: "price_change", field_changed: "sale_price", old_value: String(originalItem.sale_price ?? 0), new_value: String(data.sale_price ?? 0) });
      }
      if (data.name !== originalItem.name || data.description !== originalItem.description || data.location !== originalItem.location) {
        trackChanges.push({ change_type: "details_change", field_changed: "details", old_value: originalItem.name, new_value: data.name });
      }
      await updateItem.mutateAsync({ id: originalItem.id, data });
      for (const change of trackChanges) {
        await base44.entities.ItemHistory.create({ item_id: originalItem.id, item_name: data.name, ...change });
      }
    } else {
      const newItem = await createItem.mutateAsync(data);
      if (newItem?.id) {
        await base44.entities.ItemHistory.create({ item_id: newItem.id, item_name: data.name, change_type: "item_created" });
      }
    }
    setEditingItem(null);
  };

  const handleSaveCategory = async (data) => {
    if (editingCategory) {
      await updateCategory.mutateAsync({ id: editingCategory.id, data });
    } else {
      await createCategory.mutateAsync(data);
    }
    setEditingCategory(null);
  };

  const handleDeleteItem = async () => {
    if (deletingItem) {
      await deleteItem.mutateAsync(deletingItem.id);
    }
  };

  const openEditItem = (item) => {
    setEditingItem(item);
    setItemFormOpen(true);
  };

  const handleBarcodeDetected = (code) => {
    setBarcodeScannerOpen(false);
    const existing = items.find(i => i.barcode === code || i.sku === code);
    if (existing) {
      setSearchQuery(code);
    } else {
      // Barcode not found — open Add Item form with SKU pre-filled
      setEditingItem({ barcode: code });
      setItemFormOpen(true);
    }
  };

  const toggleSelectItem = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(i => i.id));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds([]);
  };

  const getCategoryById = (id) => categories.find((c) => c.id === id);

  // Resolve a list of location IDs/legacy names to a grouped display label
  const getGroupedLocationLabel = (locValues) => {
    if (!locValues || locValues.length === 0) return null;
    const resolved = locValues.map(val => {
      let loc = locationRecords.find(l => l.id === val);
      if (!loc) loc = locationRecords.find(l => l.name === val);
      return loc || { id: val, name: val, parent_location_id: null };
    });
    // Group children by parent
    const byParent = {};
    const standalone = [];
    resolved.forEach(loc => {
      if (loc.parent_location_id) {
        if (!byParent[loc.parent_location_id]) byParent[loc.parent_location_id] = [];
        byParent[loc.parent_location_id].push(loc);
      } else if (!byParent[loc.id]) {
        // Only show as standalone if none of its children are selected
        standalone.push(loc);
      }
    });
    const parts = [];
    // Standalone parents/locations with no selected children
    standalone.forEach(loc => {
      const hasSelectedChild = resolved.some(r => r.parent_location_id === loc.id);
      if (!hasSelectedChild) parts.push(loc.name);
    });
    // Grouped: "Parent › Child1, Child2"
    Object.entries(byParent).forEach(([parentId, children]) => {
      const parent = locationRecords.find(l => l.id === parentId);
      const parentName = parent ? parent.name : parentId;
      parts.push(`${parentName} › ${children.map(c => c.name).join(', ')}`);
    });
    return parts.join(' · ') || null;
  };

  const isLoading = itemsLoading || categoriesLoading;

  const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ["items"] });

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Inventory</h1>
            <p className="text-slate-500 mt-1">Manage your items and track stock levels</p>
          </div>
          <div className="flex flex-wrap gap-2">

            {isAdmin && (
              <Button
                variant={selectMode ? "default" : "outline"}
                onClick={() => { setSelectMode(s => !s); setSelectedIds([]); }}
                className={selectMode ? "bg-indigo-600 text-white" : "bg-white text-slate-900"}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                {selectMode ? "Cancel" : "Bulk Update"}
              </Button>
            )}
            <Button variant="outline" onClick={() => setBarcodeScannerOpen(true)} className="bg-white text-slate-900 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-9" aria-label="Scan barcode">
              <ScanLine className="h-4 w-4 mr-2" />
              Scan
            </Button>
            {isAdmin &&
              <Button variant="outline" onClick={() => setCsvModalOpen(true)} className="hidden sm:inline-flex bg-white text-slate-900 px-4 py-2 text-sm font-medium rounded-md items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-9">
                <FileText className="h-4 w-4 mr-2" />
                CSV
              </Button>
              }
            {isAdmin &&
              <Button
                variant="outline"
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryFormOpen(true);
                }} className="bg-white text-slate-900 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-9">
                
                
                <FolderPlus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
              }
            <Button
                variant="outline"
                onClick={() => {
                  setEditingItem(null);
                  setItemFormOpen(true);
                }} className="bg-white text-slate-900">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
          </div>
        </div>
        
        {/* Search & Filters */}
        <div className="mb-6">
          <SearchFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              stockFilter={stockFilter}
              setStockFilter={setStockFilter}
              selectedLocation={selectedLocation}
              setSelectedLocation={setSelectedLocation}
              locations={locations}
              locationRecords={locationRecords}
              viewMode={viewMode}
              setViewMode={setViewMode}
              categories={categories}
              sortBy={sortBy}
              setSortBy={setSortBy} />
            
        </div>

        {/* Stats Cards */}
        {(() => {
          const isFiltered = selectedCategory || selectedLocation || stockFilter !== "all" || searchQuery;
          const displayItems = isFiltered ? filteredItems : items;
          const filteredLowStock = displayItems.filter((item) => {
            const minCases = item.min_cases || 0;
            return (item.case_quantity || 0) <= minCases && minCases > 0;
          }).length;
          return (
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 ${!isFiltered && isAdmin ? 'lg:grid-cols-3' : !isFiltered ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
          {isLoading ?
            Array(isFiltered ? 1 : 3).fill(0).map((_, i) =>
            <Skeleton key={i} className="h-32 rounded-xl" />
            ) :

            <>
              {!isFiltered && (
                <StatsCard
                  title="Total Items"
                  value={stats.totalItems}
                  subtitle={`${stats.totalCases} cases/bags in stock`}
                  icon={Package}
                  accent="blue" />
              )}
              
              {!isFiltered && isAdmin && (
              <StatsCard
                title="Inventory Value"
                value={`$${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subtitle="Total cost of goods"
                icon={DollarSign}
                accent="green" />
              )}

              <div className="cursor-pointer" onClick={() => setStockFilter(stockFilter === "low_stock" ? "all" : "low_stock")}>
                <StatsCard
                  title="Low Stock Alerts"
                  value={filteredLowStock}
                  subtitle={stockFilter === "low_stock" ? "Click to clear filter" : "Click to filter low stock"}
                  icon={AlertTriangle}
                  accent="rose" />
              </div>
              
            </>
            }
        </div>
          );
        })()}

        {/* View Controls */}
        <div className="mb-4">
          <ViewControls
              viewMode={viewMode}
              setViewMode={setViewMode}
              sortBy={sortBy}
              setSortBy={setSortBy} />
            
        </div>
        
        {/* Items Grid/List */}
        {isLoading ?
          <div className={viewMode === "grid" ?
          "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" :
          "space-y-2.5"
          }>
            {Array(8).fill(0).map((_, i) =>
            <Skeleton key={i} className={viewMode === "grid" ? "h-80 rounded-xl" : "h-20 rounded-xl"} />
            )}
          </div> :
          filteredItems.length === 0 ?
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16">
            
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <Package className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No items found</h3>
            <p className="text-slate-500 mb-4">
              {searchQuery || selectedCategory || stockFilter !== "all" ?
              "Try adjusting your filters" :
              "Get started by adding your first inventory item"}
            </p>
            {!searchQuery && !selectedCategory && stockFilter === "all" &&
            <Button
              onClick={() => {
                setEditingItem(null);
                setItemFormOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700">
              
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Item
              </Button>
            }
          </motion.div> :

          <>
          {selectMode && (
            <div className="flex items-center gap-3 px-4 py-2 mb-1">
              <button onClick={handleSelectAll} className="text-xs text-indigo-600 hover:underline font-medium">
                {selectedIds.length === filteredItems.length ? "Deselect All" : "Select All"}
              </button>
              <span className="text-xs text-slate-400">{selectedIds.length} of {filteredItems.length} selected</span>
            </div>
          )}
          {viewMode === "list" && (
            <div className="hidden md:flex items-center gap-4 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
              <div className="h-12 w-12 flex-shrink-0" />
              <div className="flex-1 min-w-0">Item</div>
              <div className="w-28 text-center shrink-0">Quantity</div>
              <div className="w-32 shrink-0">Category</div>
              <div className="w-32 shrink-0">Location</div>
              <div className="w-28 text-right shrink-0">Actions</div>
            </div>
          )}
          <div className={viewMode === "grid" ?
          "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" :
          "space-y-2.5"
          }>
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, index) =>
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.03 }}>
                {selectMode ? (
                  <div
                    onClick={() => toggleSelectItem(item.id)}
                    className={`cursor-pointer rounded-xl transition-all ${
                      selectedIds.includes(item.id)
                        ? "ring-2 ring-indigo-500 bg-indigo-50/50"
                        : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    <ItemCard item={item} category={getCategoryById(item.category_id)} locationLabel={getGroupedLocationLabel(getItemLocations(item))} onEdit={() => {}} onDelete={() => {}} onHistory={() => {}} viewMode={viewMode} isAdmin={false} showPricing={showPricing} />
                    </div>
                    ) : (
                    <ItemCard item={item} category={getCategoryById(item.category_id)} locationLabel={getGroupedLocationLabel(getItemLocations(item))} onEdit={openEditItem} onDelete={setDeletingItem} onHistory={setHistoryItem} viewMode={viewMode} isAdmin={isAdmin} showPricing={showPricing} />
                )}
                
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </>
          }
        
        {/* Results count */}
        {!isLoading && filteredItems.length > 0 &&
          <div className="mt-6 text-center text-sm text-slate-500">
            Showing {filteredItems.length} of {items.length} items
          </div>
          }
      </div>
      
      {/* Modals */}
      <ItemForm
          open={itemFormOpen}
          onClose={() => {
            setItemFormOpen(false);
            setEditingItem(null);
          }}
          item={editingItem}
          categories={categories}
          suppliers={suppliers}
          onSave={handleSaveItem}
          isAdmin={isAdmin} />
        
      
      <CategoryForm
          open={categoryFormOpen}
          onClose={() => {
            setCategoryFormOpen(false);
            setEditingCategory(null);
          }}
          category={editingCategory}
          onSave={handleSaveCategory} />
        
      
      <DeleteConfirmDialog
          open={!!deletingItem}
          onClose={() => setDeletingItem(null)}
          item={deletingItem}
          onConfirm={handleDeleteItem} />
        

      <CSVImportExport
          open={csvModalOpen}
          onClose={() => setCsvModalOpen(false)}
          items={items}
          categories={categories}
          suppliers={suppliers}
          onImportComplete={() => queryClient.invalidateQueries({ queryKey: ["items"] })} />
        

      <ItemHistoryPanel
          open={!!historyItem}
          onClose={() => setHistoryItem(null)}
          item={historyItem} />
        

      <BarcodeScanner
          open={barcodeScannerOpen}
          onClose={() => setBarcodeScannerOpen(false)}
          onBarcodeDetected={handleBarcodeDetected} />

      {selectMode && selectedIds.length > 0 && (
        <BulkUpdateBar
          selectedIds={selectedIds}
          allItems={items}
          categories={categories}
          suppliers={suppliers}
          locationRecords={locationRecords}
          onDone={() => { queryClient.invalidateQueries({ queryKey: ["items"] }); exitSelectMode(); }}
          onClear={exitSelectMode}
        />
      )}
        
      </div>
    </PullToRefresh>);

}