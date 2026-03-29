import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Sidebar } from "@/components/layout/Sidebar";
import BooksPage from "@/pages/Books";
import LocationsPage from "@/pages/Locations";
import ItemsPage from "@/pages/Items";
import { useAuth } from "@workspace/replit-auth-web";
import { Library, LogIn, BookOpen, Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function LoginScreen() {
  const { login } = useAuth();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Branding */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="bg-primary/10 p-3 rounded-2xl text-primary">
            <Library className="w-8 h-8" />
          </div>
          <span className="font-serif text-4xl font-bold tracking-tight text-foreground">
            ExLibris
          </span>
        </div>

        {/* Card */}
        <div className="bg-card border border-border/60 rounded-3xl p-10 shadow-xl shadow-black/5">
          <div className="bg-secondary/60 rounded-2xl p-5 mb-8 flex justify-center">
            <BookOpen className="w-16 h-16 text-primary/60" />
          </div>

          <h1 className="font-serif text-2xl font-bold text-foreground mb-3">
            Your Personal Library
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            ExLibris helps you catalog and find your physical books across all your boxes,
            bookcases, and storage locations. Log in to access your collection.
          </p>

          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
          >
            <LogIn className="w-5 h-5" />
            Log in to ExLibris
          </button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Your collection is private and only accessible to you.
        </p>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary/50 mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">Loading your library…</p>
      </div>
    </div>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <div className="hidden md:block sticky top-0 h-screen">
        <Sidebar />
      </div>

      <div className="md:hidden fixed bottom-0 left-0 w-full bg-card border-t border-border z-50 flex justify-around p-2">
        <a href="/" className="p-3 text-muted-foreground hover:text-primary"><span className="text-xs font-medium">Books</span></a>
        <a href="/items" className="p-3 text-muted-foreground hover:text-primary"><span className="text-xs font-medium">Items</span></a>
        <a href="/locations" className="p-3 text-muted-foreground hover:text-primary"><span className="text-xs font-medium">Locations</span></a>
      </div>

      <main className="flex-1 w-full pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <LoginScreen />;
  return <>{children}</>;
}

function Router() {
  return (
    <AuthGate>
      <AppLayout>
        <Switch>
          <Route path="/" component={BooksPage} />
          <Route path="/items" component={ItemsPage} />
          <Route path="/locations" component={LocationsPage} />
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
    </AuthGate>
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
