import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const RARITY_MAP = {
  first_meal: "Common",
  meals_10: "Common",
  meals_50: "Uncommon",
  meals_100: "Rare",
  healthy_week: "Uncommon",
  goal_achieved: "Uncommon",
  water_goal: "Rare",
  exercise_week: "Uncommon",
  streak_7: "Rare",
};

const RARITY_STYLE = {
  Common: { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" },
  Uncommon: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
  Rare: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
};

function AchievementCard({ ach }) {
  const rarity = RARITY_MAP[ach.id] || "Common";
  const style = RARITY_STYLE[rarity];
  return (
    <div
      data-testid={`achievement-${ach.id}`}
      className={`rounded-3xl border-2 p-6 transition-all ${
        ach.earned
          ? `${style.border} bg-white hover:-translate-y-1 hover:shadow-md`
          : "border-border bg-secondary/30 opacity-60"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-4xl">{ach.icon}</span>
        {ach.earned ? (
          <span className={`text-[10px] font-bold tracking-[0.2em] uppercase px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>
            {rarity}
          </span>
        ) : (
          <span className="text-[10px] font-semibold tracking-[0.18em] uppercase px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
            Locked
          </span>
        )}
      </div>
      <h3 className={`font-display text-lg tracking-tight ${ach.earned ? "text-foreground" : "text-muted-foreground"}`}>
        {ach.name}
      </h3>
      <p className="text-sm text-muted-foreground mt-1">{ach.description}</p>
      
      {/* Progress bar */}
      {!ach.earned && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Progress</span>
            <span>{ach.current_value} / {ach.threshold}</span>
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-primary/60 transition-all"
              style={{ width: `${ach.progress_pct}%` }}
            />
          </div>
        </div>
      )}

      {ach.earned && ach.earned_at && (
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
          ✨ Earned {new Date(ach.earned_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      )}
    </div>
  );
}

export default function Achievements() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    api.get("/achievements").then(r => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="text-muted-foreground">Loading achievements…</div>;

  const { achievements, stats } = data;
  const earned = achievements.filter(a => a.earned);
  const locked = achievements.filter(a => !a.earned);

  const displayed = filter === "earned" ? earned : filter === "locked" ? locked : achievements;

  return (
    <div className="space-y-7 max-w-5xl">
      <div className="fade-up">
        <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Milestones</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-2">Achievements</h1>
        <p className="text-muted-foreground mt-1.5">Earn badges by building healthy habits.</p>
      </div>

      {/* Progress summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 fade-up-1">
        <div className="bg-white border rounded-3xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">Progress</p>
            <span className="text-sm font-semibold text-primary">{earned.length} / {achievements.length}</span>
          </div>
          <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.round((earned.length / achievements.length) * 100)}%`,
                background: "linear-gradient(90deg, #2C4C3B, #8DAA91)"
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{Math.round((earned.length / achievements.length) * 100)}% unlocked</p>
        </div>
        {[
          { label: "Meals Logged", value: stats.meal_count },
          { label: "Day Streak", value: `${stats.streak_days} days` },
          { label: "Avg Healthy", value: `${stats.avg_healthy_score}/100` },
        ].map(s => (
          <div key={s.label} className="bg-white border rounded-3xl p-5">
            <p className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">{s.label}</p>
            <p className="font-display text-2xl font-bold mt-2">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 fade-up-1">
        {[
          { id: "all", label: `All (${achievements.length})` },
          { id: "earned", label: `Earned (${earned.length})` },
          { id: "locked", label: `Locked (${locked.length})` },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === f.id ? "bg-primary text-white" : "bg-white border text-foreground/70 hover:bg-secondary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Achievement grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 fade-up-2">
        {displayed.map(ach => (
          <AchievementCard key={ach.id} ach={ach} />
        ))}
      </div>
    </div>
  );
}
