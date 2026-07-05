import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { Trash2, Heart, Search, Filter, SortAsc, SortDesc, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";

function groupByDay(items) {
  const map = {};
  items.forEach((i) => {
    const d = i.created_at.slice(0, 10);
    (map[d] ||= []).push(i);
  });
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
}

const MEAL_COLOR = {
  breakfast: "#E6B87A",
  lunch: "#D96C4A",
  dinner: "#2C4C3B",
  snack: "#8DAA91",
};

const SORT_OPTIONS = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "calories_high", label: "Highest calories" },
  { id: "calories_low", label: "Lowest calories" },
  { id: "score_high", label: "Best health score" },
];

function NutritionRow({ label, value, unit, color }) {
  return (
    <div className="flex items-center justify-between text-xs py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold" style={{ color }}>{value} {unit}</span>
    </div>
  );
}

export default function History() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [expandedId, setExpandedId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [favLoading, setFavLoading] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== "all") params.meal_type = filter;
      if (search) params.search = search;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const { data } = await api.get("/history", { params });
      setItems(data);
    } catch {
      toast.error("Failed to load history");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter, dateFrom, dateTo]);

  // Client-side search and sort
  const processed = [...items]
    .filter(i => !search || i.food_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "oldest") return a.created_at.localeCompare(b.created_at);
      if (sort === "calories_high") return b.calories - a.calories;
      if (sort === "calories_low") return a.calories - b.calories;
      if (sort === "score_high") return (b.healthy_score || 0) - (a.healthy_score || 0);
      return b.created_at.localeCompare(a.created_at); // newest
    });

  const groups = groupByDay(processed);

  const remove = async (id) => {
    if (!window.confirm("Delete this meal?")) return;
    await api.delete(`/history/${id}`);
    setItems((s) => s.filter((i) => i.id !== id));
    toast.success("Meal removed");
  };

  const toggleFav = async (id) => {
    setFavLoading(id);
    try {
      const { data } = await api.post(`/history/${id}/favorite`);
      setItems(prev => prev.map(i => i.id === id ? { ...i, is_favorite: data.is_favorite } : i));
      toast.success(data.is_favorite ? "Added to favorites!" : "Removed from favorites");
    } catch { toast.error("Failed"); }
    finally { setFavLoading(null); }
  };

  const clearFilters = () => {
    setSearch(""); setDateFrom(""); setDateTo(""); setFilter("all"); setSort("newest");
  };

  const hasActiveFilters = search || dateFrom || dateTo || filter !== "all" || sort !== "newest";

  return (
    <div className="space-y-7 max-w-4xl">
      <div className="fade-up">
        <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Timeline</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-2">Your meal journal</h1>
        <p className="text-muted-foreground mt-1.5">Every plate, every day. No judgment.</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 fade-up-1">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            data-testid="history-search"
            type="text"
            placeholder="Search meals…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`px-4 py-3 rounded-2xl border text-sm font-medium flex items-center gap-2 transition-all ${showFilters ? "bg-primary text-white border-primary" : "bg-white hover:bg-secondary"}`}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-red-400" />}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white border rounded-3xl p-5 space-y-4 fade-up-1">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Filters & Sort</h4>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-primary hover:underline">Clear all</button>
            )}
          </div>

          {/* Meal type */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">Meal type</p>
            <div className="flex flex-wrap gap-2">
              {["all", "breakfast", "lunch", "dinner", "snack"].map((m) => (
                <button
                  key={m}
                  data-testid={`filter-${m}`}
                  onClick={() => setFilter(m)}
                  className={`px-4 py-1.5 rounded-full text-xs capitalize font-medium transition-all ${
                    filter === m ? "bg-primary text-white" : "bg-secondary text-foreground/70 hover:bg-secondary/70"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">From date</p>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">To date</p>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {/* Sort */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">Sort by</p>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    sort === s.id ? "bg-primary text-white" : "bg-secondary text-foreground/70 hover:bg-secondary/70"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      {hasActiveFilters && (
        <p className="text-sm text-muted-foreground fade-up-1">
          Showing <strong>{processed.length}</strong> meal{processed.length !== 1 ? "s" : ""}
          {search && ` matching "${search}"`}
        </p>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="h-24 bg-secondary rounded-3xl animate-pulse" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white border rounded-3xl p-12 text-center text-muted-foreground fade-up-2">
          {hasActiveFilters ? "No meals match your filters." : "No meals logged yet. Try scanning your next meal."}
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(([day, list]) => {
            const total = list.reduce((s, i) => s + (i.calories || 0), 0);
            return (
              <div key={day} className="fade-up-2">
                <div className="flex items-baseline justify-between mb-4">
                  <h3 className="font-display text-xl sm:text-2xl tracking-tight">
                    {new Date(day + "T12:00:00").toLocaleDateString("en", {
                      weekday: "long", month: "long", day: "numeric"
                    })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {Math.round(total)} kcal · {list.length} meal{list.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="relative pl-6 border-l-2 border-border">
                  {list.map((m) => (
                    <div key={m.id} data-testid={`history-item-${m.id}`} className="relative pb-5 last:pb-0">
                      <span
                        className="absolute -left-[31px] top-2 w-4 h-4 rounded-full border-4 border-background"
                        style={{ background: MEAL_COLOR[m.meal_type] }}
                      />
                      <div className="bg-white border rounded-3xl overflow-hidden hover:-translate-y-0.5 transition-all">
                        {/* Main row */}
                        <div className="p-5 flex items-center gap-4">
                          {m.image_b64 ? (
                            <img src={`data:image/jpeg;base64,${m.image_b64}`} alt="" className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-16 h-16 rounded-2xl bg-accent/20 grid place-items-center text-primary font-display text-xl flex-shrink-0">
                              {m.food_name[0]}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium truncate">{m.food_name}</p>
                              <span
                                className="text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 rounded-full"
                                style={{ background: MEAL_COLOR[m.meal_type] + "22", color: MEAL_COLOR[m.meal_type] }}
                              >
                                {m.meal_type}
                              </span>
                              {m.is_favorite && (
                                <Heart className="w-3.5 h-3.5 fill-red-400 text-red-400" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {Math.round(m.calories)} kcal · P {Math.round(m.protein)}g · C {Math.round(m.carbs)}g · F {Math.round(m.fat)}g
                              {m.healthy_score > 0 && ` · Score ${m.healthy_score}`}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{m.created_at.slice(11, 16)}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              data-testid={`fav-btn-${m.id}`}
                              onClick={() => toggleFav(m.id)}
                              disabled={favLoading === m.id}
                              className={`p-2.5 rounded-full transition-colors ${
                                m.is_favorite
                                  ? "text-red-400 hover:bg-red-50"
                                  : "text-muted-foreground hover:text-red-400 hover:bg-red-50"
                              }`}
                              title={m.is_favorite ? "Remove from favorites" : "Add to favorites"}
                            >
                              <Heart className={`w-4 h-4 ${m.is_favorite ? "fill-current" : ""}`} />
                            </button>
                            <button
                              onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                              className="p-2.5 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                              title="Show nutrition details"
                            >
                              <ChevronDown className={`w-4 h-4 transition-transform ${expandedId === m.id ? "rotate-180" : ""}`} />
                            </button>
                            <button
                              data-testid={`delete-meal-${m.id}`}
                              onClick={() => remove(m.id)}
                              className="p-2.5 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded nutrition */}
                        {expandedId === m.id && (
                          <div className="border-t px-5 py-4 bg-secondary/30">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                              {[
                                { l: "Fiber", v: Math.round(m.fiber || 0), u: "g", c: "#22C55E" },
                                { l: "Sugar", v: Math.round(m.sugar || 0), u: "g", c: "#F59E0B" },
                                { l: "Sodium", v: Math.round(m.sodium || 0), u: "mg", c: "#6366F1" },
                                { l: "Serving", v: m.serving_size || "—", u: "", c: "#6B7280" },
                              ].map(n => (
                                <div key={n.l} className="bg-white rounded-xl p-3 text-center">
                                  <p className="font-display font-bold text-sm" style={{ color: n.c }}>{n.v}{n.u}</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{n.l}</p>
                                </div>
                              ))}
                            </div>
                            {/* Multi-food items */}
                            {m.items?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-2">Food items detected:</p>
                                <div className="space-y-1">
                                  {m.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-xs bg-white rounded-lg px-3 py-2">
                                      <span>{item.name}</span>
                                      <span className="text-muted-foreground">{item.calories} kcal</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Health score */}
                            {m.healthy_score > 0 && (
                              <div className="mt-3 flex items-center gap-2">
                                <div className="h-2 flex-1 bg-border rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${m.healthy_score}%`,
                                      background: m.healthy_score >= 70 ? "#22C55E" : m.healthy_score >= 40 ? "#F59E0B" : "#EF4444"
                                    }}
                                  />
                                </div>
                                <span className="text-xs font-semibold">Score: {m.healthy_score}/100</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
