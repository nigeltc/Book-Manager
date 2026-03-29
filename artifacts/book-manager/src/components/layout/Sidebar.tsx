import { Link, useLocation } from "wouter";
import { BookOpen, MapPin, Library, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    {
      name: "My Collection",
      href: "/",
      icon: BookOpen,
    },
    {
      name: "Locations",
      href: "/locations",
      icon: MapPin,
    },
  ];

  return (
    <div className="flex flex-col w-64 h-screen bg-card border-r border-border sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-xl text-primary">
          <Library className="w-6 h-6" />
        </div>
        <span className="font-serif text-xl font-bold tracking-tight text-foreground">
          ExLibris
        </span>
      </div>

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

      <div className="p-6 mt-auto">
        <div className="bg-secondary rounded-2xl p-5 text-center shadow-inner">
          <LayoutGrid className="w-8 h-8 mx-auto text-primary mb-3 opacity-80" />
          <h4 className="font-serif font-semibold text-foreground mb-1">
            Organized Library
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Keep track of all your books across different boxes and cases.
          </p>
        </div>
      </div>
    </div>
  );
}
