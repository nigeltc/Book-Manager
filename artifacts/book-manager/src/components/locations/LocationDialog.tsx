import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useCreateLocation, 
  useUpdateLocation,
  getListLocationsQueryKey,
  type Location
} from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin } from "lucide-react";

const locationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
});

type LocationFormValues = z.infer<typeof locationSchema>;

interface LocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: Location | null;
}

export function LocationDialog({ open, onOpenChange, location }: LocationDialogProps) {
  const isEditing = !!location;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createMutation = useCreateLocation();
  const updateMutation = useUpdateLocation();

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (location) {
        form.reset({
          name: location.name,
          description: location.description || "",
        });
      } else {
        form.reset({
          name: "",
          description: "",
        });
      }
    }
  }, [open, location, form]);

  const onSubmit = async (data: LocationFormValues) => {
    try {
      if (isEditing && location) {
        await updateMutation.mutateAsync({
          id: location.id,
          data
        });
        toast({ title: "Location updated successfully" });
      } else {
        await createMutation.mutateAsync({ data });
        toast({ title: "Location added" });
      }
      queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() });
      onOpenChange(false);
    } catch (error) {
      toast({ 
        title: "Error saving location", 
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive" 
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
        <div className="bg-gradient-to-r from-primary/10 to-transparent p-6 pb-4 border-b border-border/50">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-primary/20 p-2 rounded-lg text-primary">
                <MapPin className="w-5 h-5" />
              </div>
              <DialogTitle className="text-2xl font-serif">
                {isEditing ? "Edit Location" : "Add Location"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground">
              {isEditing 
                ? "Update physical storage details." 
                : "Create a new box, shelf, or room for your books."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Location Name <span className="text-destructive">*</span>
              </label>
              <input
                {...form.register("name")}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                placeholder="e.g. Basement Box 1, Living Room Shelf A"
              />
              {form.formState.errors.name && (
                <p className="text-destructive text-xs mt-1.5">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Description (Optional)
              </label>
              <textarea
                {...form.register("description")}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none placeholder:text-muted-foreground/50"
                placeholder="Where is this located exactly? What kind of box is it?"
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
              {isEditing ? "Save Changes" : "Add Location"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
