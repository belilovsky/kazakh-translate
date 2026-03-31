import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FileText,
  Cpu,
  FlaskConical,
  Settings,
  ArrowLeft,
  Sun,
  Moon,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { useState } from "react";

const NAV_ITEMS = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Translations", href: "/admin/translations", icon: FileText },
  { title: "Engines", href: "/admin/engines", icon: Cpu },
  { title: "Lab", href: "/admin/lab", icon: FlaskConical },
  { title: "Settings", href: "/admin/settings", icon: Settings },
];

function KaztilshiLogoSmall() {
  return (
    <svg
      width={28}
      height={28}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Қазтілші"
      className="shrink-0"
    >
      <circle cx="20" cy="20" r="18" stroke="hsl(var(--primary))" strokeWidth="2.5" fill="none" />
      <path
        d="M20 6L30 20L20 34L10 20Z"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        fill="hsl(var(--primary))"
        fillOpacity="0.12"
      />
      <line x1="8" y1="20" x2="32" y2="20" stroke="hsl(var(--primary))" strokeWidth="1.5" />
      <line x1="20" y1="8" x2="20" y2="32" stroke="hsl(var(--primary))" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="3" fill="hsl(var(--primary))" />
      <text
        x="20"
        y="22"
        textAnchor="middle"
        dominantBaseline="central"
        fill="hsl(var(--primary-foreground))"
        fontSize="5"
        fontWeight="700"
        fontFamily="sans-serif"
      >
        Қ
      </text>
    </svg>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin") return location === "/admin";
    return location.startsWith(href);
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-60 flex flex-col
          bg-sidebar border-r border-sidebar-border
          transform transition-transform duration-200 ease-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Sidebar header */}
        <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border shrink-0">
          <KaztilshiLogoSmall />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-sidebar-foreground truncate">
              Қазтілші
            </span>
            <span className="text-[10px] text-muted-foreground leading-none">Admin Panel</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden h-8 w-8"
            onClick={() => setSidebarOpen(false)}
            data-testid="button-close-sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium
                    transition-colors duration-150
                    ${
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }
                  `}
                  data-testid={`nav-${item.title.toLowerCase()}`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.title}</span>
                </button>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="p-3 border-t border-sidebar-border">
          <Link href="/">
            <button
              className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              data-testid="nav-back-to-app"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Translator</span>
            </button>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={() => setSidebarOpen(true)}
            data-testid="button-open-sidebar"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleTheme}
            data-testid="button-toggle-theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
