import { Link, useLocation } from "wouter";
import { BookOpen, MapPin, Library, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@workspace/replit-auth-web";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { name: "My Collection", href: "/", icon: BookOpen },
    { name: "Locations", href: "/locations", icon: MapPin },
  ];

  return (
    <div className="flex flex-col w-64 h-screen bg-card border-r border-border sticky top-0">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-xl text-primary">
          <Library className="w-6 h-6" />
        </div>
        <span className="font-serif text-xl font-bold tracking-tight text-foreground">
          ExLibris
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 transition-transform duration-200",
                  isActive ? "scale-110" : "group-hover:scale-110"
                )}
              />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User / Logout */}
      <div className="p-4 border-t border-border/60">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/50 mb-2">
          {user?.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt={user.firstName ?? "User"}
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.firstName ?? "User"}
            </p>
            {user?.email && (
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            )}
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>
    </div>
  );
}
