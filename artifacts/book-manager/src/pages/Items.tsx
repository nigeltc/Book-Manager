import { useState, useMemo } from "react";
import {
  useListItems,
  useListLocations,
  useDeleteItem,
  getListItemsQueryKey,
  type ItemWithLocation,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ItemDialog } from "@/components/items/ItemDialog";
import {
  Search,
  Plus,
  Package,
  MapPin,
  Pencil,
  Trash2,
  Loader2,
  FilterX,
  ArrowUpDown,
  Tag,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORY_COLORS: Record<string, string> = {
  Electronics: "bg-blue-100 text-blue-700",
  Clothing: "bg-purple-100 text-purple-700",
  Tools: "bg-orange-100 text-orange-700",
  Kitchen: "bg-yellow-100 text-yellow-700",
  Toys: "bg-green-100 text-green-700",
  Games: "bg-green-100 text-green-700",
  "Art & Crafts": "bg-pink-100 text-pink-700",
  Sports: "bg-teal-100 text-teal-700",
  Documents: "bg-gray-100 text-gray-700",
  Decor: "bg-rose-100 text-rose-700",
  Media: "bg-indigo-100 text-indigo-700",
  Other: "bg-secondary text-muted-foreground",
};

function csvEscape(value: string | null | undefined): string {
  const str = value ?? "";
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportItemsToCsv(items: ItemWithLocation[], filename: string) {
  const header = ["Name", "Description", "Category", "Location", "Notes", "Date Added"];
  const rows = items.map((i) => [
    csvEscape(i.name),
    csvEscape(i.description),
    csvEscape(i.category),
    csvEscape(i.location?.name),
    csvEscape(i.notes),
    csvEscape(format(new Date(i.createdAt), "yyyy-MM-dd")),
  ]);
  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type SortField = "name" | "category";

export default function Items() {
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState<number | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithLocation | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allItems, isLoading } = useListItems({
    search: searchTerm || undefined,
    locationId: locationFilter === "" ? undefined : locationFilter,
  });

  const { data: locations } = useListLocations();
  const deleteMutation = useDeleteItem();

  // Derive categories from loaded items
  const availableCategories = useMemo(() => {
    if (!allItems) return [];
    const cats = new Set(allItems.map((i) => i.category).filter(Boolean) as string[]);
    return Array.from(cats).sort();
  }, [allItems]);

  // Client-side category filter + sort
  const items = useMemo(() => {
    if (!allItems) return [];
    let filtered = allItems;
    if (categoryFilter) {
      filtered = filtered.filter((i) => i.category === categoryFilter);
    }
    return [...filtered].sort((a, b) => {
      const aVal = sortField === "category" ? (a.category ?? "") : a.name;
      const bVal = sortField === "category" ? (b.category ?? "") : b.name;
      return aVal.localeCompare(bVal);
    });
  }, [allItems, categoryFilter, sortField]);

  const handleCreate = () => { setEditingItem(null); setIsDialogOpen(true); };
  const handleEdit = (item: ItemWithLocation) => { setEditingItem(item); setIsDialogOpen(true); };

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Delete "${name}"?`)) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast({ title: "Item deleted" });
        queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
      } catch {
        toast({ title: "Failed to delete", variant: "destructive" });
      }
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setLocationFilter("");
    setCategoryFilter("");
  };

  const isFiltered = !!(searchTerm || locationFilter !== "" || categoryFilter);

  return (
    <div className="flex-1 bg-background min-h-screen">
      {/* Header */}
      <div className="p-6 sm:p-10 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-border">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground mb-2">
              Other Items
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Track everything else stored in your boxes and on your shelves.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="shrink-0 px-6 py-3 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-2xl p-4 sm:p-5 shadow-sm border border-border/60 flex flex-col gap-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, description, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-transparent rounded-xl focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="flex gap-3">
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value ? Number(e.target.value) : "")}
                className="flex-1 sm:w-48 px-4 py-2.5 bg-secondary/50 border border-transparent rounded-xl focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
              >
                <option value="">All Locations</option>
                {locations?.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex-1 sm:w-44 px-4 py-2.5 bg-secondary/50 border border-transparent rounded-xl focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
              >
                <option value="">All Categories</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {isFiltered && (
                <button
                  onClick={clearFilters}
                  className="p-2.5 bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-xl transition-colors"
                  title="Clear filters"
                >
                  <FilterX className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-medium">Sort by:</span>
              <button
                onClick={() => setSortField("name")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${sortField === "name" ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-foreground hover:bg-secondary"}`}
              >
                Name
              </button>
              <button
                onClick={() => setSortField("category")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${sortField === "category" ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-foreground hover:bg-secondary"}`}
              >
                Category
              </button>
            </div>

            <button
              onClick={() => exportItemsToCsv(items, isFiltered ? `exlibris-items-filtered-${Date.now()}.csv` : "exlibris-items.csv")}
              disabled={items.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-secondary/60 text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isFiltered ? `Export ${items.length}` : "Export all"}
              </span>
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin text-primary/50 mb-4" />
            <p>Loading items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-card border border-dashed border-border/60 rounded-3xl">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6">
              <Package className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-foreground mb-2">No items found</h3>
            <p className="text-muted-foreground max-w-md">
              {isFiltered
                ? "No items match your current filters."
                : "Start adding items stored in your boxes and shelves to keep track of them."}
            </p>
            {!isFiltered && (
              <button
                onClick={handleCreate}
                className="mt-6 px-6 py-2.5 rounded-xl font-medium bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                Add Your First Item
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {items.map((item) => {
                const badgeClass = item.category
                  ? (CATEGORY_COLORS[item.category] ?? "bg-secondary text-muted-foreground")
                  : "bg-secondary text-muted-foreground";

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    key={item.id}
                    className="group bg-card border border-border/50 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col"
                  >
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-secondary p-2.5 rounded-xl text-muted-foreground group-hover:text-primary transition-colors">
                          <Package className="w-5 h-5" />
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.name)}
                            className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-serif font-bold text-lg text-foreground leading-snug mb-1 line-clamp-2">
                        {item.name}
                      </h3>

                      {item.description && (
                        <p className="text-muted-foreground text-xs mb-2 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      {item.category && (
                        <div className="mb-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${badgeClass}`}>
                            <Tag className="w-2.5 h-2.5" />
                            {item.category}
                          </span>
                        </div>
                      )}

                      <div className="mt-auto pt-4 flex items-center justify-between border-t border-border/40">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/60 px-2.5 py-1 rounded-md max-w-[70%]">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{item.location?.name || "Unassigned"}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground/60 uppercase font-semibold tracking-wider">
                          {format(new Date(item.createdAt), "MMM yyyy")}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <ItemDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} item={editingItem} />
    </div>
  );
}
