import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Heart, Plus, Trash2, ArrowRight, Flame, Check } from "lucide-react";
import { Link } from "react-router-dom";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_COLOR = {
  breakfast: "#E6B87A",
  lunch: "#D96C4A",
  dinner: "#2C4C3B",
  snack: "#8DAA91",
};

function defaultMealType() {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 18) return "snack";
  return "dinner";
}

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggingId, setLoggingId] = useState(null);
  const [mealTypes, setMealTypes] = useState({});

  useEffect(() => {
    api.get("/favorites").then(r => {
      setFavorites(r.data);
      const types = {};
      r.data.forEach(f => { types[f.id] = defaultMealType(); });
      setMealTypes(types);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const unfavorite = async (id) => {
    await api.post(`/history/${id}/favorite`);
    setFavorites(prev => prev.filter(f => f.id !== id));
    toast.success("Removed from favorites");
  };

  const quickLog = async (fav) => {
    setLoggingId(fav.id);
    try {
      await api.post(`/favorites/${fav.id}/log`, null, {
        params: { meal_type: mealTypes[fav.id] || "snack" }
      });
      toast.success(`${fav.food_name} logged as ${mealTypes[fav.id] || "snack"}!`);
    } catch {
      toast.error("Failed to log");
    } finally { setLoggingId(null); }
  };

  if (loading) return <div className="text-muted-foreground">Loading favorites…</div>;

  return (
    <div className="space-y-7 max-w-4xl">
      <div className="fade-up">
        <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Saved</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-2">Favorite Meals</h1>
        <p className="text-muted-foreground mt-1.5">Your go-to meals — log them again in one tap.</p>
      </div>

      {favorites.length === 0 ? (
        <div className="bg-white border rounded-3xl p-12 text-center fade-up-1">
          <div className="w-16 h-16 rounded-2xl bg-accent/20 grid place-items-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-display text-xl tracking-tight">No favorites yet</h3>
          <p className="text-muted-foreground mt-2 text-sm">Tap the heart icon on any meal in your history to save it here.</p>
          <Link to="/history" className="mt-5 inline-flex items-center gap-2 text-primary text-sm font-medium hover:underline">
            Go to History <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5 fade-up-1">
          {favorites.map(fav => (
            <div
              key={fav.id}
              data-testid={`fav-${fav.id}`}
              className="bg-white border rounded-3xl overflow-hidden hover:-translate-y-1 transition-all hover:shadow-md"
            >
              {fav.image_b64 ? (
                <img
                  src={`data:image/jpeg;base64,${fav.image_b64}`}
                  alt={fav.food_name}
                  className="w-full h-36 object-cover"
                />
              ) : (
                <div
                  className="w-full h-36 grid place-items-center text-5xl font-display"
                  style={{ background: (MEAL_COLOR[fav.meal_type] || "#8DAA91") + "22" }}
                >
                  {fav.food_name[0]}
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display font-semibold text-lg leading-tight">{fav.food_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Flame className="w-3.5 h-3.5 text-primary" />
                      <span className="text-sm font-medium">{Math.round(fav.calories)} kcal</span>
                      <span className="text-xs text-muted-foreground">· Score {fav.healthy_score}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => unfavorite(fav.id)}
                    className="text-red-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-colors"
                    title="Remove from favorites"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  {[
                    { l: "Protein", v: Math.round(fav.protein || 0), u: "g" },
                    { l: "Carbs", v: Math.round(fav.carbs || 0), u: "g" },
                    { l: "Fat", v: Math.round(fav.fat || 0), u: "g" },
                  ].map(m => (
                    <div key={m.l} className="bg-secondary rounded-xl py-2">
                      <p className="font-display font-bold text-sm">{m.v}{m.u}</p>
                      <p className="text-[10px] text-muted-foreground">{m.l}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 border-t pt-4">
                  <p className="text-xs tracking-[0.15em] uppercase font-semibold text-muted-foreground mb-2">Log as</p>
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {MEAL_TYPES.map(m => (
                      <button
                        key={m}
                        onClick={() => setMealTypes(prev => ({ ...prev, [fav.id]: m }))}
                        className={`px-3 py-1.5 rounded-full text-xs capitalize transition-all ${
                          mealTypes[fav.id] === m ? "bg-primary text-white" : "bg-secondary text-foreground/70"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <button
                    data-testid={`quick-log-${fav.id}`}
                    onClick={() => quickLog(fav)}
                    disabled={loggingId === fav.id}
                    className="w-full bg-primary text-white py-2.5 rounded-2xl text-sm font-medium disabled:opacity-60 hover:-translate-y-0.5 transition-transform flex items-center justify-center gap-2"
                  >
                    {loggingId === fav.id ? (
                      <span>Logging…</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Quick Log
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
