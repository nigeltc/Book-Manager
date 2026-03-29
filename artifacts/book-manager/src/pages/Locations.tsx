import { useState } from "react";
import { 
  useListLocations, 
  useDeleteLocation,
  getListLocationsQueryKey,
  type Location
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { LocationDialog } from "@/components/locations/LocationDialog";
import { 
  Plus, 
  MapPin, 
  Pencil, 
  Trash2, 
  Loader2,
  PackageOpen
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function Locations() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: locations, isLoading } = useListLocations();
  const deleteMutation = useDeleteLocation();

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingLocation(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Delete location "${name}"? Books in this location will become unassigned.`)) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast({ title: "Location deleted" });
        queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        // Also invalidate books since their location data might have changed to null
        queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      } catch (error) {
        toast({ 
          title: "Failed to delete", 
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive" 
        });
      }
    }
  };

  return (
    <div className="flex-1 bg-background min-h-screen">
      <div className="p-6 sm:p-10 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10 pb-6 border-b border-border">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground mb-2">
              Storage Locations
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage your boxes, shelves, and rooms where books are stored.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="shrink-0 px-6 py-3 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Location
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin text-primary/50 mb-4" />
            <p>Loading locations...</p>
          </div>
        ) : locations && locations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {locations.map((location) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  key={location.id}
                  className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative group flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-primary shrink-0">
                      <PackageOpen className="w-6 h-6" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(location)}
                        className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(location.id, location.name)}
                        className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="font-serif font-bold text-xl text-foreground mb-2 pr-12">
                    {location.name}
                  </h3>
                  
                  <p className="text-muted-foreground text-sm flex-1 mb-6 line-clamp-3">
                    {location.description || "No description provided."}
                  </p>
                  
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground pt-4 border-t border-border/40 mt-auto">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Added {format(new Date(location.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-card border border-dashed border-border/60 rounded-3xl">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6">
              <PackageOpen className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-foreground mb-2">No locations yet</h3>
            <p className="text-muted-foreground max-w-md">
              Create storage locations like "Basement Box 1" or "Living Room Shelf" to organize your collection.
            </p>
            <button
              onClick={handleCreate}
              className="mt-6 px-6 py-2.5 rounded-xl font-medium bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Create Location
            </button>
          </div>
        )}
      </div>

      <LocationDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        location={editingLocation}
      />
    </div>
  );
}
