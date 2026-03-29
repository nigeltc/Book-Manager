import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useCreateBook, 
  useUpdateBook, 
  useListLocations,
  getListBooksQueryKey,
  type BookWithLocation
} from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BookCopy } from "lucide-react";

const bookSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().nullable().optional(),
  locationId: z.coerce.number().nullable().optional().transform(val => val === 0 ? null : val),
  notes: z.string().nullable().optional(),
});

type BookFormValues = z.infer<typeof bookSchema>;

interface BookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book?: BookWithLocation | null;
}

export function BookDialog({ open, onOpenChange, book }: BookDialogProps) {
  const isEditing = !!book;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: locations } = useListLocations();
  
  const createMutation = useCreateBook();
  const updateMutation = useUpdateBook();

  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: "",
      author: "",
      locationId: null,
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (book) {
        form.reset({
          title: book.title,
          author: book.author || "",
          locationId: book.locationId || 0,
          notes: book.notes || "",
        });
      } else {
        form.reset({
          title: "",
          author: "",
          locationId: 0,
          notes: "",
        });
      }
    }
  }, [open, book, form]);

  const onSubmit = async (data: BookFormValues) => {
    try {
      if (isEditing && book) {
        await updateMutation.mutateAsync({
          id: book.id,
          data: {
            ...data,
            locationId: data.locationId || null
          }
        });
        toast({ title: "Book updated successfully" });
      } else {
        await createMutation.mutateAsync({
          data: {
            ...data,
            title: data.title,
            locationId: data.locationId || null
          }
        });
        toast({ title: "Book added to collection" });
      }
      queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() });
      onOpenChange(false);
    } catch (error) {
      toast({ 
        title: "Error saving book", 
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive" 
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
        <div className="bg-gradient-to-r from-primary/10 to-transparent p-6 pb-4 border-b border-border/50">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-primary/20 p-2 rounded-lg text-primary">
                <BookCopy className="w-5 h-5" />
              </div>
              <DialogTitle className="text-2xl font-serif">
                {isEditing ? "Edit Book" : "Add New Book"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground">
              {isEditing 
                ? "Update the details of this book in your collection." 
                : "Add a new book to your library catalog."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                {...form.register("title")}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                placeholder="e.g. The Lord of the Rings"
              />
              {form.formState.errors.title && (
                <p className="text-destructive text-xs mt-1.5">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Author
              </label>
              <input
                {...form.register("author")}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                placeholder="e.g. J.R.R. Tolkien"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Location
              </label>
              <select
                {...form.register("locationId")}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              >
                <option value="0">Not assigned</option>
                {locations?.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Notes
              </label>
              <textarea
                {...form.register("notes")}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none placeholder:text-muted-foreground/50"
                placeholder="Any special details, edition info, or condition notes..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Add Book"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
