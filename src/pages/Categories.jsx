import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Edit2,
  FolderOpen,
  Package,
  Plus,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { dim as base44 } from "@/api/dimDataClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import CategoryForm from "../components/inventory/CategoryForm";

export default function Categories() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

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

  const createCategory = useMutation({
    mutationFn: (data) =>
      base44.entities.Category.create(data),

    onMutate: async (data) => {
      await queryClient.cancelQueries({
        queryKey: ["categories"],
      });

      const previousCategories =
        queryClient.getQueryData(["categories"]);

      queryClient.setQueryData(
        ["categories"],
        (currentCategories = []) => [
          ...currentCategories,
          {
            ...data,
            id: `temp-${Date.now()}`,
          },
        ]
      );

      return {
        previousCategories,
      };
    },

    onError: (_error, _variables, context) => {
      queryClient.setQueryData(
        ["categories"],
        context?.previousCategories
      );
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["categories"],
      });
    },
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, data }) =>
      base44.entities.Category.update(id, data),

    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({
        queryKey: ["categories"],
      });

      const previousCategories =
        queryClient.getQueryData(["categories"]);

      queryClient.setQueryData(
        ["categories"],
        (currentCategories = []) =>
          currentCategories.map((category) =>
            category.id === id
              ? {
                  ...category,
                  ...data,
                }
              : category
          )
      );

      return {
        previousCategories,
      };
    },

    onError: (_error, _variables, context) => {
      queryClient.setQueryData(
        ["categories"],
        context?.previousCategories
      );
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["categories"],
      });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: (id) =>
      base44.entities.Category.delete(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: ["categories"],
      });

      const previousCategories =
        queryClient.getQueryData(["categories"]);

      queryClient.setQueryData(
        ["categories"],
        (currentCategories = []) =>
          currentCategories.filter(
            (category) => category.id !== id
          )
      );

      return {
        previousCategories,
      };
    },

    onError: (_error, _variables, context) => {
      queryClient.setQueryData(
        ["categories"],
        context?.previousCategories
      );
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["categories"],
      });
    },
  });

  const handleSaveCategory = async (data) => {
    if (editingCategory) {
      await updateCategory.mutateAsync({
        id: editingCategory.id,
        data,
      });
    } else {
      await createCategory.mutateAsync(data);
    }

    setEditingCategory(null);
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;

    await deleteCategory.mutateAsync(
      deletingCategory.id
    );

    setDeletingCategory(null);
  };

  const handleOpenCategory = (categoryId) => {
    navigate(`/CategoryDetails?id=${categoryId}`);
  };

  const handleOpenCategoryForm = (
    category = null
  ) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  const handleRenameCategory = async (
    category
  ) => {
    const correctedName = toTitleCase(
      renameValue.trim()
    );

    if (
      correctedName &&
      correctedName !== category.name
    ) {
      await updateCategory.mutateAsync({
        id: category.id,
        data: {
          name: correctedName,
        },
      });
    }

    setRenamingId(null);
    setRenameValue("");
  };

  const getItemCountForCategory = (
    categoryId
  ) =>
    items.filter(
      (item) =>
        item.category_id === categoryId
    ).length;

  const getTotalValueForCategory = (
    categoryId
  ) =>
    items
      .filter(
        (item) =>
          item.category_id === categoryId
      )
      .reduce(
        (total, item) =>
          total +
          Number(item.quantity || 0) *
            Number(item.unit_cost || 0),
        0
      );

  const isLoading =
    categoriesLoading || itemsLoading;

  const sortedCategories = [...categories].sort(
    (a, b) =>
      (a.name || "").localeCompare(
        b.name || ""
      )
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Categories
            </h1>

            <p className="mt-1 text-slate-500">
              Organize your inventory with
              categories
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="bg-white text-slate-900"
            onClick={() =>
              handleOpenCategoryForm()
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map(
              (_, index) => (
                <Skeleton
                  key={index}
                  className="h-40 rounded-xl"
                />
              )
            )}
          </div>
        ) : categories.length === 0 ? (
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="py-16 text-center"
          >
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <FolderOpen className="h-8 w-8 text-slate-400" />
            </div>

            <h2 className="mb-2 text-lg font-semibold text-slate-900">
              No categories yet
            </h2>

            <p className="mb-4 text-slate-500">
              Create categories to organize your
              inventory
            </p>

            <Button
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() =>
                handleOpenCategoryForm()
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Category
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {sortedCategories.map(
                (category, index) => {
                  const itemCount =
                    getItemCountForCategory(
                      category.id
                    );

                  const totalValue =
                    getTotalValueForCategory(
                      category.id
                    );

                  const categoryColor =
                    category.color || "#6366f1";

                  return (
                    <motion.div
                      key={category.id}
                      initial={{
                        opacity: 0,
                        y: 20,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.95,
                      }}
                      transition={{
                        delay: index * 0.05,
                      }}
                    >
                      <Card
                        className="group cursor-pointer border-0 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg"
                        onClick={() =>
                          handleOpenCategory(
                            category.id
                          )
                        }
                      >
                        <div className="mb-4 flex items-start justify-between">
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-xl"
                            style={{
                              backgroundColor: `${categoryColor}20`,
                            }}
                          >
                            <FolderOpen
                              className="h-6 w-6"
                              style={{
                                color:
                                  categoryColor,
                              }}
                            />
                          </div>

                          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(event) => {
                                event.stopPropagation();

                                handleOpenCategoryForm(
                                  category
                                );
                              }}
                            >
                              <Edit2 className="h-4 w-4 text-slate-500" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-rose-50"
                              onClick={(event) => {
                                event.stopPropagation();

                                setDeletingCategory(
                                  category
                                );
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-slate-500 hover:text-rose-500" />
                            </Button>
                          </div>
                        </div>

                        {renamingId ===
                        category.id ? (
                          <input
                            autoFocus
                            className="mb-1 w-full border-b-2 border-indigo-400 bg-transparent text-lg font-semibold text-slate-900 outline-none"
                            value={renameValue}
                            onChange={(event) =>
                              setRenameValue(
                                event.target.value
                              )
                            }
                            onClick={(event) =>
                              event.stopPropagation()
                            }
                            onBlur={() =>
                              handleRenameCategory(
                                category
                              )
                            }
                            onKeyDown={(
                              event
                            ) => {
                              if (
                                event.key ===
                                "Enter"
                              ) {
                                event.currentTarget.blur();
                              }

                              if (
                                event.key ===
                                "Escape"
                              ) {
                                setRenamingId(
                                  null
                                );

                                setRenameValue(
                                  ""
                                );
                              }
                            }}
                          />
                        ) : (
                          <h2
                            className="mb-1 cursor-text text-lg font-semibold text-slate-900 transition-colors hover:text-indigo-600"
                            onClick={(event) => {
                              event.stopPropagation();

                              setRenamingId(
                                category.id
                              );

                              setRenameValue(
                                category.name || ""
                              );
                            }}
                          >
                            {category.name}
                          </h2>
                        )}

                        {category.description && (
                          <p className="mb-4 line-clamp-2 text-sm text-slate-500">
                            {category.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-slate-400" />

                            <span className="text-sm font-medium text-slate-600">
                              {itemCount}{" "}
                              {itemCount === 1
                                ? "item"
                                : "items"}
                            </span>
                          </div>

                          <Badge
                            variant="secondary"
                            className="rounded-md border-transparent bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-950"
                          >
                            $
                            {totalValue.toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </Badge>
                        </div>
                      </Card>
                    </motion.div>
                  );
                }
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <CategoryForm
        open={formOpen}
        category={editingCategory}
        onSave={handleSaveCategory}
        onClose={() => {
          setFormOpen(false);
          setEditingCategory(null);
        }}
      />

      <Dialog
        open={Boolean(deletingCategory)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingCategory(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Delete Category
            </DialogTitle>
          </DialogHeader>

          <DialogDescription className="py-4">
            Are you sure you want to delete{" "}
            <strong>
              “{deletingCategory?.name}”
            </strong>
            ? Items in this category will not be
            deleted, but they may become
            uncategorized.
          </DialogDescription>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setDeletingCategory(null)
              }
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={
                deleteCategory.isPending
              }
              onClick={
                handleDeleteCategory
              }
            >
              {deleteCategory.isPending
                ? "Deleting..."
                : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function toTitleCase(value) {
  return value.replace(
    /\w\S*/g,
    (word) =>
      word.charAt(0).toUpperCase() +
      word.slice(1).toLowerCase()
  );
}