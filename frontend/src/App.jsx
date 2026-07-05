import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "sonner";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import Dashboard from "@/pages/Dashboard";
import Scan from "@/pages/Scan";
import History from "@/pages/History";
import Profile from "@/pages/Profile";
import Reports from "@/pages/Reports";
import HealthHub from "@/pages/HealthHub";
import Analytics from "@/pages/Analytics";
import Favorites from "@/pages/Favorites";
import FoodSearch from "@/pages/FoodSearch";
import Achievements from "@/pages/Achievements";
import AdminPanel from "@/pages/AdminPanel";
import CompareReports from "@/pages/CompareReports";
import AppShell from "@/Components/AppShell";
import "@/App.css";

function Protected({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return (
    <div className="min-h-screen grid place-items-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary grid place-items-center text-white animate-pulse">
          <span className="text-xl">🌿</span>
        </div>
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
}

function AdminOnly({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <AppShell>{children}</AppShell>;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Toaster richColors position="top-right" />
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected — main */}
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/scan" element={<Protected><Scan /></Protected>} />
            <Route path="/history" element={<Protected><History /></Protected>} />
            <Route path="/profile" element={<Protected><Profile /></Protected>} />
            <Route path="/reports" element={<Protected><Reports /></Protected>} />

            {/* Protected — new features */}
            <Route path="/health-hub" element={<Protected><HealthHub /></Protected>} />
            <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
            <Route path="/favorites" element={<Protected><Favorites /></Protected>} />
            <Route path="/food-search" element={<Protected><FoodSearch /></Protected>} />
            <Route path="/achievements" element={<Protected><Achievements /></Protected>} />
            <Route path="/compare-reports" element={<Protected><CompareReports /></Protected>} />

            {/* Admin only */}
            <Route path="/admin" element={<AdminOnly><AdminPanel /></AdminOnly>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
