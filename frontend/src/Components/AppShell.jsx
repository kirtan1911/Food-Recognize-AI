import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Camera, History, User, FileText, LogOut, Leaf,
  Heart, Activity, Search, Trophy, BarChart2, Shield, ChevronDown, ChevronUp
} from "lucide-react";
import { useState } from "react";

const NAV_MAIN = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", id: "nav-dashboard" },
  { to: "/scan", icon: Camera, label: "Scan Food", id: "nav-scan" },
  { to: "/history", icon: History, label: "History", id: "nav-history" },
  { to: "/analytics", icon: BarChart2, label: "Analytics", id: "nav-analytics" },
  { to: "/reports", icon: FileText, label: "Reports", id: "nav-reports" },
];

const NAV_HEALTH = [
  { to: "/health-hub", icon: Activity, label: "Health Hub", id: "nav-health" },
  { to: "/food-search", icon: Search, label: "Food Search", id: "nav-food-search" },
  { to: "/favorites", icon: Heart, label: "Favorites", id: "nav-favorites" },
  { to: "/achievements", icon: Trophy, label: "Achievements", id: "nav-achievements" },
];

const NAV_ALL = [...NAV_MAIN, ...NAV_HEALTH,
  { to: "/profile", icon: User, label: "Profile", id: "nav-profile" }
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [healthOpen, setHealthOpen] = useState(true);
  const onLogout = async () => { await logout(); nav("/login"); };
  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r bg-white/60 backdrop-blur-sm">
        <div className="px-6 py-7 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary grid place-items-center text-white">
            <Leaf className="w-5 h-5" />
          </div>
          <div>
            <p className="font-display font-bold text-lg leading-none">Nourish</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-1">AI Food Tracker</p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto pb-4">
          {/* Main nav */}
          {NAV_MAIN.map(({ to, icon: Icon, label, id }) => (
            <NavLink
              key={to} to={to} data-testid={id}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}

          {/* Health section */}
          <button
            onClick={() => setHealthOpen(o => !o)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm text-muted-foreground hover:bg-secondary mt-2"
          >
            <Activity className="w-4 h-4" />
            <span className="flex-1 text-left font-medium">Health</span>
            {healthOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {healthOpen && NAV_HEALTH.map(({ to, icon: Icon, label, id }) => (
            <NavLink
              key={to} to={to} data-testid={id}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm transition-all ml-2 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}

          {/* Profile */}
          <NavLink
            to="/profile" data-testid="nav-profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm transition-all mt-1 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/70 hover:bg-secondary hover:text-foreground"
              }`
            }
          >
            <User className="w-4 h-4" />
            Profile
          </NavLink>

          {/* Compare */}
          <NavLink
            to="/compare-reports" data-testid="nav-compare"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/70 hover:bg-secondary hover:text-foreground"
              }`
            }
          >
            <BarChart2 className="w-4 h-4" />
            Compare
          </NavLink>

          {/* Admin */}
          {isAdmin && (
            <NavLink
              to="/admin" data-testid="nav-admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                }`
              }
            >
              <Shield className="w-4 h-4" />
              Admin Panel
            </NavLink>
          )}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-accent/30 grid place-items-center text-primary font-display font-bold">
              {(user?.name || user?.email || "?")[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || user?.email}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <button
            data-testid="logout-button"
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-white/80 backdrop-blur border-b">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary grid place-items-center text-white">
              <Leaf className="w-4 h-4" />
            </div>
            <span className="font-display font-bold">Nourish</span>
          </div>
          <button data-testid="mobile-logout" onClick={onLogout} className="text-sm text-muted-foreground">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex overflow-x-auto gap-1 px-3 pb-2 scrollbar-none">
          {NAV_ALL.slice(0, 8).map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${
                  isActive ? "bg-primary text-white" : "bg-secondary text-foreground/70"
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${
                isActive ? "bg-primary text-white" : "bg-secondary text-foreground/70"
              }`
            }>
              <Shield className="w-3.5 h-3.5" />
              Admin
            </NavLink>
          )}
        </nav>
      </div>

      <main className="flex-1 lg:ml-0 mt-28 lg:mt-0 px-5 md:px-8 py-6 md:py-10 max-w-6xl">
        {children}
      </main>
    </div>
  );
}
