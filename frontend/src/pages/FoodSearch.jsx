import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Search, Plus, Check, Flame, ChevronRight, X } from "lucide-react";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

function defaultMealType() {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 18) return "snack";
  return "dinner";
}

export default function FoodSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [allFoods, setAllFoods] = useState([]);
  const [selected, setSelected] = useState(null);
  const [mealType, setMealType] = useState(defaultMealType());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/foods").then(r => { setAllFoods(r.data); setResults(r.data); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults(allFoods);
      return;
    }
    const q = query.toLowerCase();
    setResults(allFoods.filter(f => f.name.toLowerCase().includes(q)));
  }, [query, allFoods]);

  const saveMeal = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.post("/foods/log", {
        query: selected.name,
        calories: selected.calories,
        protein: selected.protein,
        carbs: selected.carbs,
        fat: selected.fat,
        fiber: selected.fiber || 0,
        sugar: selected.sugar || 0,
        sodium: selected.sodium || 0,
        serving_size: selected.serving_size || "",
        meal_type: mealType,
      });
      setSaved(true);
      toast.success(`${selected.name} saved as ${mealType}!`);
      setTimeout(() => { setSaved(false); setSelected(null); }, 2000);
    } catch {
      toast.error("Failed to save");
    } finally { setSaving(false); }
  };

  const scoreColor = (cal) => {
    if (cal < 150) return "text-green-600 bg-green-50";
    if (cal < 400) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <div className="space-y-7 max-w-4xl">
      <div className="fade-up">
        <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Database</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-2">Food Search</h1>
        <p className="text-muted-foreground mt-1.5">Search our food database and log meals manually.</p>
      </div>

      {/* Search bar */}
      <div className="relative fade-up-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          data-testid="food-search-input"
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search foods… (e.g. chicken, rice, banana)"
          className="w-full pl-12 pr-4 py-4 bg-white border rounded-2xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-5 gap-6 fade-up-2">
        {/* Results list */}
        <div className="lg:col-span-2 space-y-2">
          <p className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground mb-3">
            {results.length} result{results.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {results.map(food => (
              <button
                key={food.name}
                data-testid={`food-result-${food.name.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => { setSelected(food); setSaved(false); }}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selected?.name === food.name
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "bg-white hover:bg-secondary hover:-translate-y-0.5 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{food.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{food.serving_size || "per serving"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scoreColor(food.calories)}`}>
                      {food.calories} kcal
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </button>
            ))}
            {results.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p>No foods found for "{query}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-3">
          {selected ? (
            <div className="bg-white border rounded-3xl p-7 sticky top-4">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="font-display text-2xl tracking-tight">{selected.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{selected.serving_size || "Standard serving"}</p>
                </div>
                <div className="text-right">
                  <Flame className="w-5 h-5 text-primary ml-auto mb-1" />
                  <p className="font-display text-3xl font-bold text-primary">{selected.calories}</p>
                  <p className="text-xs text-muted-foreground">kcal</p>
                </div>
              </div>

              {/* Nutrition grid */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { l: "Protein", v: selected.protein, u: "g", color: "#D96C4A" },
                  { l: "Carbs", v: selected.carbs, u: "g", color: "#E6B87A" },
                  { l: "Fat", v: selected.fat, u: "g", color: "#8DAA91" },
                  { l: "Fiber", v: selected.fiber || 0, u: "g", color: "#22C55E" },
                  { l: "Sugar", v: selected.sugar || 0, u: "g", color: "#F59E0B" },
                  { l: "Sodium", v: selected.sodium || 0, u: "mg", color: "#6366F1" },
                ].map(m => (
                  <div key={m.l} className="rounded-2xl py-3 px-3" style={{ background: m.color + "15" }}>
                    <p className="font-display font-bold text-lg" style={{ color: m.color }}>
                      {m.v}{m.u}
                    </p>
                    <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mt-0.5">{m.l}</p>
                  </div>
                ))}
              </div>

              {/* Macro bars */}
              <div className="space-y-2 mb-6">
                {[
                  { label: "Protein", val: selected.protein, max: 50, color: "#D96C4A" },
                  { label: "Carbs", val: selected.carbs, max: 100, color: "#E6B87A" },
                  { label: "Fat", val: selected.fat, max: 50, color: "#8DAA91" },
                ].map(m => (
                  <div key={m.label}>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{m.label}</span>
                      <span>{m.val}g</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, (m.val / m.max) * 100)}%`, background: m.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Meal type */}
              <div className="border-t pt-4">
                <p className="text-xs tracking-[0.15em] uppercase font-semibold text-muted-foreground mb-2">Save as</p>
                <div className="flex gap-2 flex-wrap mb-4">
                  {MEAL_TYPES.map(m => (
                    <button
                      key={m}
                      onClick={() => setMealType(m)}
                      className={`px-4 py-2 rounded-full text-sm capitalize transition-all ${
                        mealType === m ? "bg-primary text-white" : "bg-secondary text-foreground/70"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <button
                  data-testid="food-log-btn"
                  onClick={saveMeal}
                  disabled={saving}
                  className="w-full bg-primary text-white py-3.5 rounded-2xl font-medium disabled:opacity-60 hover:-translate-y-0.5 transition-transform flex items-center justify-center gap-2"
                >
                  {saving ? "Saving…" : saved ? (
                    <><Check className="w-4 h-4" /> Saved!</>
                  ) : (
                    <><Plus className="w-4 h-4" /> Log This Meal</>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border rounded-3xl p-12 text-center text-muted-foreground h-full flex flex-col items-center justify-center">
              <Search className="w-10 h-10 mb-4 opacity-30" />
              <p>Select a food from the list to see its full nutrition details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
