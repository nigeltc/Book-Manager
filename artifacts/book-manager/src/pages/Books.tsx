import { useState, useMemo } from "react";
import {
  useListBooks,
  useListLocations,
  useDeleteBook,
  getListBooksQueryKey,
  type BookWithLocation
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { BookDialog } from "@/components/books/BookDialog";
import {
  Search,
  Plus,
  BookOpen,
  MapPin,
  Pencil,
  Trash2,
  Loader2,
  FilterX,
  ChevronLeft,
  ChevronRight,
  List,
  LayoutGrid,
  ArrowUpDown,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type SortField = "title" | "author";
type ViewMode = "grid" | "list";

const PAGE_SIZES = [20, 50, 100];

function csvEscape(value: string | null | undefined): string {
  const str = value ?? "";
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportToCsv(books: BookWithLocation[], filename: string) {
  const header = ["Title", "Author", "Location", "Notes", "Date Added"];
  const rows = books.map((b) => [
    csvEscape(b.title),
    csvEscape(b.author),
    csvEscape(b.location?.name),
    csvEscape(b.notes),
    csvEscape(format(new Date(b.createdAt), "yyyy-MM-dd")),
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

export default function Books() {
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState<number | "">("");
  const [sortField, setSortField] = useState<SortField>("title");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookWithLocation | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allBooks, isLoading: booksLoading } = useListBooks({
    search: searchTerm || undefined,
    locationId: locationFilter === "" ? undefined : locationFilter
  });

  const { data: locations } = useListLocations();
  const deleteMutation = useDeleteBook();

  // Sort client-side
  const books = useMemo(() => {
    if (!allBooks) return [];
    return [...allBooks].sort((a, b) => {
      const aVal = (sortField === "author" ? a.author : a.title) ?? "";
      const bVal = (sortField === "author" ? b.author : b.title) ?? "";
      return aVal.localeCompare(bVal);
    });
  }, [allBooks, sortField]);

  // Pagination
  const totalBooks = books.length;
  const totalPages = Math.max(1, Math.ceil(totalBooks / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedBooks = books.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Reset to page 1 when filters/sort/pageSize change
  const handleSearch = (value: string) => { setSearchTerm(value); setPage(1); };
  const handleLocation = (value: string) => { setLocationFilter(value ? Number(value) : ""); setPage(1); };
  const handleSort = (field: SortField) => { setSortField(field); setPage(1); };
  const handlePageSize = (size: number) => { setPageSize(size); setPage(1); };
  const handleClear = () => { setSearchTerm(""); setLocationFilter(""); setPage(1); };

  const handleEdit = (book: BookWithLocation) => { setEditingBook(book); setIsDialogOpen(true); };
  const handleCreate = () => { setEditingBook(null); setIsDialogOpen(true); };

  const handleDelete = async (id: number, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast({ title: "Book deleted" });
        queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() });
      } catch {
        toast({ title: "Failed to delete", variant: "destructive" });
      }
    }
  };

  const PaginationBar = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-8 px-1">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          {totalBooks === 0 ? "0 books" : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, totalBooks)} of ${totalBooks} books`}
        </span>
        <span className="text-border">|</span>
        <span>Per page:</span>
        {PAGE_SIZES.map(size => (
          <button
            key={size}
            onClick={() => handlePageSize(size)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${pageSize === size ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
          >
            {size}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => setPage(1)}
          disabled={safePage <= 1}
          className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          title="First page"
        >
          «
        </button>
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={safePage <= 1}
          className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page numbers */}
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
          .reduce<(number | "...")[]>((acc, p, idx, arr) => {
            if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
            acc.push(p);
            return acc;
          }, [])
          .map((p, idx) =>
            p === "..." ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground text-sm">…</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p as number)}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${safePage === p ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-foreground"}`}
              >
                {p}
              </button>
            )
          )
        }

        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={safePage >= totalPages}
          className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => setPage(totalPages)}
          disabled={safePage >= totalPages}
          className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          title="Last page"
        >
          »
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 bg-background min-h-screen">
      {/* Decorative Hero Header */}
      <div className="relative h-48 sm:h-56 lg:h-64 bg-secondary overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-background/95 z-10" />
        <img
          src={`${import.meta.env.BASE_URL}images/library-bg.png`}
          alt="Library Atmosphere"
          className="absolute inset-0 w-full h-full object-cover object-center mix-blend-overlay opacity-50"
        />
        <div className="absolute bottom-0 left-0 w-full p-6 sm:p-10 z-20 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-foreground mb-2 drop-shadow-sm">
              My Collection
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
              Manage and organize your physical books across all your boxes, shelves, and rooms.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="shrink-0 px-6 py-3 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Book
          </button>
        </div>
      </div>

      <div className="p-6 sm:p-10 max-w-7xl mx-auto -mt-6 relative z-30">
        {/* Controls Bar */}
        <div className="bg-card rounded-2xl p-4 sm:p-5 shadow-sm border border-border/60 flex flex-col gap-4 mb-8">
          {/* Row 1: Search + Location */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by title or author..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-transparent rounded-xl focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="flex gap-3 sm:w-72">
              <select
                value={locationFilter}
                onChange={(e) => handleLocation(e.target.value)}
                className="w-full px-4 py-2.5 bg-secondary/50 border border-transparent rounded-xl focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
              >
                <option value="">All Locations</option>
                {locations?.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>

              {(searchTerm || locationFilter !== "") && (
                <button
                  onClick={handleClear}
                  className="p-2.5 bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-xl transition-colors"
                  title="Clear filters"
                >
                  <FilterX className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Sort + Download + View toggle */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-medium">Sort by:</span>
              <button
                onClick={() => handleSort("title")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${sortField === "title" ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-foreground hover:bg-secondary"}`}
              >
                Title
              </button>
              <button
                onClick={() => handleSort("author")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${sortField === "author" ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-foreground hover:bg-secondary"}`}
              >
                Author
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Download CSV */}
              <button
                onClick={() => {
                  const isFiltered = !!(searchTerm || locationFilter !== "");
                  const filename = isFiltered
                    ? `exlibris-filtered-${Date.now()}.csv`
                    : "exlibris-library.csv";
                  exportToCsv(books, filename);
                }}
                disabled={books.length === 0}
                title={
                  searchTerm || locationFilter !== ""
                    ? `Download ${books.length} filtered books as CSV`
                    : `Download all ${books.length} books as CSV`
                }
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-secondary/60 text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {searchTerm || locationFilter !== ""
                    ? `Export ${books.length}`
                    : "Export all"}
                </span>
              </button>

              {/* View toggle */}
              <div className="flex items-center gap-1 bg-secondary/50 rounded-xl p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {booksLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin text-primary/50 mb-4" />
            <p>Loading your library...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6">
              <BookOpen className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-foreground mb-2">No books found</h3>
            <p className="text-muted-foreground max-w-md">
              {searchTerm || locationFilter !== ""
                ? "We couldn't find any books matching your current filters. Try adjusting them."
                : "Your collection is empty. Start adding your physical books to keep track of them."}
            </p>
            {!(searchTerm || locationFilter !== "") && (
              <button
                onClick={handleCreate}
                className="mt-6 px-6 py-2.5 rounded-xl font-medium bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                Add Your First Book
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {paginatedBooks.map((book) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    key={book.id}
                    className="group bg-card border border-border/50 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col"
                  >
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-secondary p-2.5 rounded-xl text-muted-foreground group-hover:text-primary transition-colors">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button
                            onClick={() => handleEdit(book)}
                            className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(book.id, book.title)}
                            className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-serif font-bold text-lg text-foreground leading-snug mb-1 line-clamp-2">
                        {book.title}
                      </h3>
                      <p className="text-muted-foreground text-sm font-medium mb-4">
                        {book.author || "Unknown Author"}
                      </p>

                      <div className="mt-auto pt-4 flex items-center justify-between border-t border-border/40">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/60 px-2.5 py-1 rounded-md max-w-[70%]">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{book.location?.name || "Unassigned"}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground/60 uppercase font-semibold tracking-wider">
                          {format(new Date(book.createdAt), 'MMM yyyy')}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <PaginationBar />
          </>
        ) : (
          <>
            {/* List View */}
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-secondary/30">
                    <th
                      className="text-left px-5 py-3.5 font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                      onClick={() => handleSort("title")}
                    >
                      <span className="flex items-center gap-1.5">
                        Title
                        {sortField === "title" && <ArrowUpDown className="w-3.5 h-3.5 text-primary" />}
                      </span>
                    </th>
                    <th
                      className="text-left px-5 py-3.5 font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none hidden sm:table-cell"
                      onClick={() => handleSort("author")}
                    >
                      <span className="flex items-center gap-1.5">
                        Author
                        {sortField === "author" && <ArrowUpDown className="w-3.5 h-3.5 text-primary" />}
                      </span>
                    </th>
                    <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground hidden md:table-cell">Location</th>
                    <th className="w-20 px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {paginatedBooks.map((book, idx) => (
                      <motion.tr
                        key={book.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15, delay: idx * 0.01 }}
                        className="group border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <span className="font-serif font-semibold text-foreground leading-snug">
                            {book.title}
                          </span>
                          {/* Show author inline on small screens */}
                          {book.author && (
                            <span className="sm:hidden block text-xs text-muted-foreground mt-0.5">{book.author}</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground hidden sm:table-cell">
                          {book.author || <span className="italic text-muted-foreground/50">Unknown</span>}
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          {book.location ? (
                            <span className="inline-flex items-center gap-1.5 text-xs bg-secondary/80 px-2.5 py-1 rounded-md text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              {book.location.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40 text-xs italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 justify-end">
                            <button
                              onClick={() => handleEdit(book)}
                              className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(book.id, book.title)}
                              className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            <PaginationBar />
          </>
        )}
      </div>

      <BookDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        book={editingBook}
      />
    </div>
  );
}
