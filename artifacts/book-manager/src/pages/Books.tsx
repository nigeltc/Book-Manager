import { useState } from "react";
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
  FilterX
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function Books() {
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState<number | "">("");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookWithLocation | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debounce search slightly for better feel if API was slow, 
  // but React Query handles local caching well. We'll pass it directly.
  const { data: books, isLoading: booksLoading } = useListBooks({
    search: searchTerm || undefined,
    locationId: locationFilter === "" ? undefined : locationFilter
  });
  
  const { data: locations } = useListLocations();
  const deleteMutation = useDeleteBook();

  const handleEdit = (book: BookWithLocation) => {
    setEditingBook(book);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingBook(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast({ title: "Book deleted" });
        queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() });
      } catch (error) {
        toast({ 
          title: "Failed to delete", 
          variant: "destructive" 
        });
      }
    }
  };

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
        <div className="bg-card rounded-2xl p-4 sm:p-5 shadow-sm border border-border/60 flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Search by title or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-transparent rounded-xl focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          
          <div className="flex gap-3 sm:w-72">
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value ? Number(e.target.value) : "")}
              className="w-full px-4 py-2.5 bg-secondary/50 border border-transparent rounded-xl focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
            >
              <option value="">All Locations</option>
              {locations?.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
            
            {(searchTerm || locationFilter !== "") && (
              <button
                onClick={() => { setSearchTerm(""); setLocationFilter(""); }}
                className="p-2.5 bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-xl transition-colors"
                title="Clear filters"
              >
                <FilterX className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        {booksLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin text-primary/50 mb-4" />
            <p>Loading your library...</p>
          </div>
        ) : books && books.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {books.map((book) => (
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
                        <span className="truncate">
                          {book.location?.name || "Unassigned"}
                        </span>
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
        ) : (
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
