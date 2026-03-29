import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateItem,
  useUpdateItem,
  useListLocations,
  getListItemsQueryKey,
  type ItemWithLocation,
} from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package } from "lucide-react";

const COMMON_CATEGORIES = [
  "Electronics",
  "Clothing",
  "Tools",
  "Kitchen",
  "Toys",
  "Games",
  "Art & Crafts",
  "Sports",
  "Documents",
  "Decor",
  "Media",
  "Other",
];

const itemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  locationId: z.coerce.number().nullable().optional().transform((val) => (val === 0 ? null : val)),
  notes: z.string().nullable().optional(),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface ItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ItemWithLocation | null;
}

export function ItemDialog({ open, onOpenChange, item }: ItemDialogProps) {
  const isEditing = !!item;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: locations } = useListLocations();
  const createMutation = useCreateItem();
  const updateMutation = useUpdateItem();

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      locationId: null,
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (item) {
        form.reset({
          name: item.name,
          description: item.description || "",
          category: item.category || "",
          locationId: item.locationId || 0,
          notes: item.notes || "",
        });
      } else {
        form.reset({ name: "", description: "", category: "", locationId: 0, notes: "" });
      }
    }
  }, [open, item, form]);

  const onSubmit = async (data: ItemFormValues) => {
    try {
      const payload = {
        ...data,
        locationId: data.locationId || null,
        category: data.category || null,
        description: data.description || null,
        notes: data.notes || null,
      };
      if (isEditing && item) {
        await updateMutation.mutateAsync({ id: item.id, data: payload });
        toast({ title: "Item updated" });
      } else {
        await createMutation.mutateAsync({ data: payload });
        toast({ title: "Item added" });
      }
      queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error saving item",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
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
                <Package className="w-5 h-5" />
              </div>
              <DialogTitle className="text-2xl font-serif">
                {isEditing ? "Edit Item" : "Add New Item"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground">
              {isEditing
                ? "Update the details of this item."
                : "Add an item stored in one of your boxes or on a shelf."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                {...form.register("name")}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                placeholder="e.g. Vintage Camera, Wool Blanket, Drill Set"
              />
              {form.formState.errors.name && (
                <p className="text-destructive text-xs mt-1.5">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Description
              </label>
              <input
                {...form.register("description")}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                placeholder="e.g. Black 35mm film camera, good condition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Category
              </label>
              <div className="flex gap-2">
                <select
                  {...form.register("category")}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                >
                  <option value="">Uncategorized</option>
                  {COMMON_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
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
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
              <textarea
                {...form.register("notes")}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none placeholder:text-muted-foreground/50"
                placeholder="Any extra details about condition, quantity, value..."
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
              {isEditing ? "Save Changes" : "Add Item"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
