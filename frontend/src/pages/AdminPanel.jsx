import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip,
  CartesianGrid
} from "recharts";
import { Users, Utensils, Activity, TrendingUp, Flame, ChevronDown } from "lucide-react";

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-white border rounded-3xl p-6 hover:-translate-y-1 transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: color + "20", color }}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="font-display text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5 opacity-70">{sub}</p>}
    </div>
  );
}

export default function AdminPanel() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/stats").then(r => setStats(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (user && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  if (loading) return <div className="text-muted-foreground animate-pulse">Loading admin data…</div>;
  if (!stats) return <div className="text-destructive">Failed to load admin data.</div>;

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="fade-up">
        <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Administration</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-2">Admin Analytics</h1>
        <p className="text-muted-foreground mt-1.5">System overview and user activity insights.</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 fade-up-1">
        <StatCard icon={Users} label="Total Users" value={stats.total_users} color="#2C4C3B" sub="Registered accounts" />
        <StatCard icon={Activity} label="Active Users (7d)" value={stats.active_users_7d} color="#3B82F6" sub="Logged meals this week" />
        <StatCard icon={Utensils} label="Total Meals" value={stats.total_meals} color="#D96C4A" sub="All time" />
        <StatCard icon={Flame} label="Avg Calories/Meal" value={stats.avg_calories_per_meal} color="#E6B87A" sub="Platform average" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 fade-up-2">
        {/* Daily Activity */}
        <div className="bg-white border rounded-3xl p-6">
          <h3 className="font-display text-xl tracking-tight mb-5">Daily Activity (14 days)</h3>
          <div className="h-52">
            <ResponsiveContainer>
              <BarChart data={stats.daily_activity}>
                <CartesianGrid stroke="#E8EAE6" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={d => d.slice(5)} fontSize={10} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={{ borderRadius: 12 }} />
                <Bar dataKey="meals" fill="#2C4C3B" radius={[4, 4, 0, 0]} name="Meals" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Activity */}
        <div className="bg-white border rounded-3xl p-6">
          <h3 className="font-display text-xl tracking-tight mb-5">Monthly Activity</h3>
          <div className="h-52">
            <ResponsiveContainer>
              <LineChart data={[...stats.monthly_activity].reverse()}>
                <CartesianGrid stroke="#E8EAE6" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickFormatter={d => d.slice(5)} fontSize={10} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={{ borderRadius: 12 }} />
                <Line type="monotone" dataKey="meals" stroke="#2C4C3B" strokeWidth={3} dot={{ r: 4 }} name="Meals" />
                <Line type="monotone" dataKey="users" stroke="#D96C4A" strokeWidth={2} dot={{ r: 3 }} name="Active Users" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 fade-up-3">
        {/* Top Foods */}
        <div className="bg-white border rounded-3xl p-6">
          <h3 className="font-display text-xl tracking-tight mb-5">🍽️ Most Recognized Foods</h3>
          <div className="space-y-3">
            {stats.top_foods.map((food, i) => (
              <div key={food.food} className="flex items-center gap-3">
                <span className="w-6 text-center font-display font-bold text-sm text-muted-foreground">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-sm font-medium truncate">{food.food}</span>
                    <span className="text-xs text-muted-foreground ml-2">{food.count}x</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, (food.count / stats.top_foods[0]?.count) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right">{food.avg_calories} kcal</span>
              </div>
            ))}
          </div>
        </div>

        {/* User Growth */}
        <div className="bg-white border rounded-3xl p-6">
          <h3 className="font-display text-xl tracking-tight mb-5">👤 User Growth</h3>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={[...stats.user_growth].reverse()}>
                <CartesianGrid stroke="#E8EAE6" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickFormatter={d => d.slice(5)} fontSize={10} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12 }} />
                <Bar dataKey="new_users" fill="#8DAA91" radius={[4, 4, 0, 0]} name="New Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Users */}
      <div className="bg-white border rounded-3xl p-6 fade-up-4">
        <h3 className="font-display text-xl tracking-tight mb-5">Recent Users</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="pb-3 font-semibold text-muted-foreground text-xs tracking-[0.15em] uppercase">Name</th>
                <th className="pb-3 font-semibold text-muted-foreground text-xs tracking-[0.15em] uppercase">Email</th>
                <th className="pb-3 font-semibold text-muted-foreground text-xs tracking-[0.15em] uppercase">Role</th>
                <th className="pb-3 font-semibold text-muted-foreground text-xs tracking-[0.15em] uppercase">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.recent_users.map((u, i) => (
                <tr key={i} className="hover:bg-secondary/50 transition-colors">
                  <td className="py-3 font-medium">{u.name || "—"}</td>
                  <td className="py-3 text-muted-foreground">{u.email}</td>
                  <td className="py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      u.role === "admin" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 text-muted-foreground">{u.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
