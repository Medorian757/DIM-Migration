import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Package,
  Plus,
  Search,
  AlertTriangle,
  CircleDollarSign,
} from "lucide-react";

import { dim as base44 } from "@/api/dimDataClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CategoryDetails() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get("id");

  const [search, setSearch] = useState("");

  const {
    data: categories = [],
    isLoading: categoriesLoading,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.Category.list(),
  });

  const {
    data: items = [],
    isLoading: itemsLoading,
  } = useQuery({
    queryKey: ["items"],
    queryFn: () => base44.entities.InventoryItem.list(),
  });

  const category = categories.find(
    (currentCategory) => currentCategory.id === categoryId
  );

  const categoryItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return items
      .filter((item) => item.category_id === categoryId)
      .filter((item) => {
        if (!term) return true;

        return (
          (item.name || "").toLowerCase().includes(term) ||
          (item.sku || "").toLowerCase().includes(term) ||
          (item.barcode || "").toLowerCase().includes(term)
        );
      })
      .sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      );
  }, [items, categoryId, search]);

  const allCategoryItems = items.filter(
    (item) => item.category_id === categoryId
  );

  const inventoryValue = allCategoryItems.reduce(
    (sum, item) =>
      sum +
      Number(item.quantity || 0) *
        Number(item.unit_cost || 0),
    0
  );

  const lowStockCount = allCategoryItems.filter((item) => {
    const quantity = Number(item.quantity || 0);
    const minimum = Number(
      item.reorder_point ??
        item.minimum_quantity ??
        item.min_quantity ??
        0
    );

    return quantity > 0 && minimum > 0 && quantity <= minimum;
  }).length;

  const outOfStockCount = allCategoryItems.filter(
    (item) => Number(item.quantity || 0) <= 0
  ).length;

  const isLoading = categoriesLoading || itemsLoading;

  const handleAddItem = () => {
    navigate(`/Inventory?addItem=true&category=${categoryId}`);
  };

  const handleOpenItem = (item) => {
    navigate(`/Inventory?item=${item.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <p className="text-sm text-slate-500">
          Loading category...
        </p>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <Card className="mx-auto max-w-xl border-0 bg-white shadow-sm">
          <CardContent className="p-6">
            <h1 className="text-xl font-semibold text-slate-900">
              Category not found
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              This category may have been deleted or the link is
              invalid.
            </p>

            <Button
              type="button"
              className="mt-4"
              onClick={() => navigate("/Categories")}
            >
              Back to Categories
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <button
          type="button"
          onClick={() => navigate("/Categories")}
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Categories
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: `${category.color || "#6366f1"}20`,
              }}
            >
              <Package
                className="h-7 w-7"
                style={{
                  color: category.color || "#6366f1",
                }}
              />
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {category.name}
              </h1>

              <p className="mt-1 text-slate-500">
                {category.description ||
                  "View and manage items in this category."}
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleAddItem}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Items"
            value={allCategoryItems.length}
            icon={Package}
          />

          <StatCard
            title="Inventory Value"
            value={`$${inventoryValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            icon={CircleDollarSign}
          />

          <StatCard
            title="Low Stock"
            value={lowStockCount}
            icon={AlertTriangle}
          />

          <StatCard
            title="Out of Stock"
            value={outOfStockCount}
            icon={AlertTriangle}
          />
        </div>

        <Card className="border-0 bg-white shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg text-slate-900">
                Items in {category.name}
              </CardTitle>

              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <Input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search items"
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {categoryItems.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="mx-auto h-10 w-10 text-slate-300" />

                <h2 className="mt-3 font-semibold text-slate-900">
                  {search
                    ? "No matching items"
                    : "No items in this category"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {search
                    ? "Try another search."
                    : "Add the first inventory item to this category."}
                </p>

                {!search && (
                  <Button
                    type="button"
                    onClick={handleAddItem}
                    className="mt-4"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {categoryItems.map((item) => {
                  const quantity = Number(item.quantity || 0);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleOpenItem(item)}
                      className="flex w-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {item.name || "Unnamed item"}
                        </p>

                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                          {item.sku && (
                            <span>SKU: {item.sku}</span>
                          )}

                          {item.barcode && (
                            <span>Barcode: {item.barcode}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          className={
                            quantity <= 0
                              ? "border-0 bg-rose-100 text-rose-700"
                              : "border-0 bg-slate-100 text-slate-700"
                          }
                        >
                          Qty: {quantity}
                        </Badge>

                        {item.unit_cost != null && (
                          <span className="text-sm font-medium text-slate-700">
                            ${Number(item.unit_cost).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon }) {
  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-xl font-bold text-slate-900">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}