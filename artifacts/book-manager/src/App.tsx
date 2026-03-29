import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Sidebar } from "@/components/layout/Sidebar";
import BooksPage from "@/pages/Books";
import LocationsPage from "@/pages/Locations";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      {/* Fixed Sidebar for md+ screens */}
      <div className="hidden md:block sticky top-0 h-screen">
        <Sidebar />
      </div>
      
      {/* Mobile nav placeholder - ideally a slide-over sheet in real prod, 
          but keeping simple here to focus on main content as requested */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-card border-t border-border z-50 flex justify-around p-2">
        <a href="/" className="p-3 text-muted-foreground hover:text-primary"><span className="text-xs font-medium">Books</span></a>
        <a href="/locations" className="p-3 text-muted-foreground hover:text-primary"><span className="text-xs font-medium">Locations</span></a>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={BooksPage} />
        <Route path="/locations" component={LocationsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
