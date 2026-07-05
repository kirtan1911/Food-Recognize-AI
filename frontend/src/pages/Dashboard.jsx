import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip,
  BarChart, Bar, CartesianGrid, AreaChart, Area
} from "recharts";
import {
  Flame, Drumstick, Wheat, Droplet, ImagePlus, ArrowRight,
  Droplets, Dumbbell, Scale, Trophy, Sparkles, ChevronRight,
  TrendingUp, Target, Heart
} from "lucide-react";
import { Link } from "react-router-dom";

function MacroCard({ icon: Icon, label, value, unit, color, testid }) {
  return (
    <div data-testid={testid} className="bg-white border rounded-3xl p-6 hover:-translate-y-1 transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: color + "22", color }}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground">{label}</span>
      </div>
      <p className="font-display text-3xl font-bold mt-5">
        {value}<span className="text-base text-muted-foreground font-normal ml-1">{unit}</span>
      </p>
    </div>
  );
}

function MiniProgress({ label, value, goal, unit, color, icon: Icon }) {
  const pct = Math.min(100, goal > 0 ? (value / goal) * 100 : 0);
  return (
    <div className="flex items-center gap-4">
      <div className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0" style={{ background: color + "20", color }}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-xs mb-1">
          <span className="font-medium">{label}</span>
          <span className="text-muted-foreground">{Math.round(value)}/{goal} {unit}</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{Math.round(pct)}%</span>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [reco, setReco] = useState(null);

  useEffect(() => {
    api.get("/dashboard").then((r) => setData(r.data)).catch(() => {});
    api.get("/recommendations").then((r) => setReco(r.data)).catch(() => {});
  }, []);

  if (!data) return (
    <div className="space-y-6 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-40 bg-secondary rounded-3xl" />
      ))}
    </div>
  );

  const pct = Math.min(100, (data.daily_calories / Math.max(1, data.daily_calorie_target)) * 100);
  const waterPct = Math.min(100, data.water_goal_ml > 0 ? (data.water_today_ml / data.water_goal_ml) * 100 : 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 fade-up">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Today</p>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-2">
            Hello, {(user?.name || "friend").split(" ")[0]}.
          </h1>
          <p className="text-muted-foreground mt-1.5">Here&apos;s how your day is shaping up.</p>
        </div>
        <Link
          to="/scan"
          data-testid="cta-scan"
          className="bg-primary text-white px-6 py-3 rounded-full font-medium hover:-translate-y-1 transition-transform inline-flex items-center gap-2"
        >
          <ImagePlus className="w-4 h-4" /> Scan a meal
        </Link>
      </div>

      {/* Hero progress card */}
      <div className="bg-white border rounded-3xl p-7 md:p-10 fade-up-1">
        <div className="grid md:grid-cols-3 gap-8 items-center">
          <div className="md:col-span-1">
            <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Daily progress</p>
            <p className="font-display text-5xl md:text-6xl font-bold mt-3 text-primary">
              {Math.round(data.daily_calories)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">of {data.daily_calorie_target} kcal target</p>
            <p data-testid="remaining-calories" className="mt-4 inline-block text-xs bg-secondary px-3 py-1.5 rounded-full">
              {data.remaining_calories > 0
                ? `${Math.round(data.remaining_calories)} kcal left`
                : `${Math.round(-data.remaining_calories)} kcal over`}
            </p>
            {data.exercise_calories_burned > 0 && (
              <p className="mt-2 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full inline-block ml-2">
                −{Math.round(data.exercise_calories_burned)} burned
              </p>
            )}
          </div>
          <div className="md:col-span-2">
            <div className="h-3 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: pct > 100 ? "#EF4444" : "linear-gradient(90deg,#2C4C3B,#8DAA91)" }}
              />
            </div>
            <div className="grid grid-cols-4 gap-3 mt-6">
              {[
                { l: "Breakfast", v: data.by_meal.breakfast },
                { l: "Lunch", v: data.by_meal.lunch },
                { l: "Dinner", v: data.by_meal.dinner },
                { l: "Snack", v: data.by_meal.snack },
              ].map((m) => (
                <div key={m.l} className="rounded-2xl bg-secondary py-4 text-center">
                  <p className="font-display text-2xl font-bold">{Math.round(m.v)}</p>
                  <p className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground mt-1">{m.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Macro cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 fade-up-2">
        <MacroCard icon={Flame} label="Calories" value={Math.round(data.daily_calories)} unit="kcal" color="#2C4C3B" testid="macro-calories" />
        <MacroCard icon={Drumstick} label="Protein" value={Math.round(data.protein)} unit="g" color="#D96C4A" testid="macro-protein" />
        <MacroCard icon={Wheat} label="Carbs" value={Math.round(data.carbs)} unit="g" color="#E6B87A" testid="macro-carbs" />
        <MacroCard icon={Droplet} label="Fat" value={Math.round(data.fat)} unit="g" color="#8DAA91" testid="macro-fat" />
      </div>

      {/* Progress widgets */}
      <div className="grid lg:grid-cols-2 gap-5 fade-up-2">
        {/* Daily progress panel */}
        <div className="bg-white border rounded-3xl p-6 space-y-4">
          <h3 className="font-display text-xl tracking-tight">Today's Progress</h3>
          <MiniProgress label="Calories" value={data.daily_calories} goal={data.daily_calorie_target} unit="kcal" color="#2C4C3B" icon={Flame} />
          <MiniProgress label="Water" value={data.water_today_ml} goal={data.water_goal_ml} unit="ml" color="#3B82F6" icon={Droplets} />
          {data.bmi && (
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0 bg-purple-100 text-purple-600">
                <Scale className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium">BMI</p>
                <p className="text-xs text-muted-foreground">
                  {data.bmi.bmi} · <span className="text-foreground font-medium">{data.bmi.category}</span>
                </p>
              </div>
              <Link to="/health-hub" className="text-xs text-primary hover:underline">Update</Link>
            </div>
          )}
          {data.exercise_today?.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0 bg-orange-100 text-orange-600">
                <Dumbbell className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium">Exercise today</p>
                <p className="text-xs text-muted-foreground">
                  {data.exercise_today.map(e => e.exercise_name).join(", ")} · {Math.round(data.exercise_calories_burned)} kcal burned
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Stats panel */}
        <div className="bg-white border rounded-3xl p-6 space-y-4">
          <h3 className="font-display text-xl tracking-tight">Quick Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Weekly Total", value: `${Math.round(data.weekly_total)} kcal`, icon: TrendingUp, color: "#2C4C3B" },
              { label: "Total Meals", value: data.recognition_count, icon: Target, color: "#D96C4A" },
              { label: "Avg Score", value: `${data.avg_healthy_score}/100`, icon: Heart, color: "#8DAA91" },
              { label: "Achievements", value: `${data.achievements_earned}/${data.achievements_total}`, icon: Trophy, color: "#E6B87A" },
            ].map(s => (
              <div key={s.label} className="bg-secondary/60 rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                  <p className="text-[10px] tracking-[0.15em] uppercase font-semibold text-muted-foreground">{s.label}</p>
                </div>
                <p className="font-display text-xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <Link to="/health-hub" className="flex-1 text-center py-2 rounded-xl border text-sm text-primary hover:bg-secondary transition-colors">Health Hub</Link>
            <Link to="/achievements" className="flex-1 text-center py-2 rounded-xl border text-sm text-primary hover:bg-secondary transition-colors">Achievements</Link>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-5 fade-up-3">
        <div className="lg:col-span-2 bg-white border rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Last 7 days</p>
              <h3 className="font-display text-xl sm:text-2xl tracking-tight">Calorie trend</h3>
            </div>
            <Link to="/analytics" className="text-xs text-primary hover:underline flex items-center gap-1">
              Full analytics <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={data.weekly}>
                <defs>
                  <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2C4C3B" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2C4C3B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E8EAE6" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={11} stroke="#5C7365" />
                <YAxis fontSize={11} stroke="#5C7365" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E8EAE6" }} />
                <Area type="monotone" dataKey="calories" stroke="#2C4C3B" strokeWidth={3} fill="url(#calGrad)" dot={{ r: 4, fill: "#D96C4A" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border rounded-3xl p-6">
          <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Recognitions</p>
          <p data-testid="recognition-count" className="font-display text-5xl font-bold mt-3">
            {data.recognition_count}
          </p>
          <p className="text-sm text-muted-foreground mt-1">meals logged with AI</p>
          <div className="h-32 mt-4">
            <ResponsiveContainer>
              <BarChart data={data.monthly.slice(-14)}>
                <Bar dataKey="calories" fill="#8DAA91" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      {reco && reco.daily_tips?.length > 0 && (
        <div className="bg-white border rounded-3xl p-6 fade-up-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 grid place-items-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-lg tracking-tight">AI Recommendations</h3>
                <p className="text-xs text-muted-foreground">Based on your meal history</p>
              </div>
            </div>
            {reco.overall_score > 0 && (
              <div className="text-right">
                <p className="text-2xl font-display font-bold text-primary">{reco.overall_score}</p>
                <p className="text-xs text-muted-foreground">health score</p>
              </div>
            )}
          </div>
          {reco.summary && (
            <p className="text-sm text-muted-foreground mb-4 bg-secondary/50 rounded-2xl p-3">{reco.summary}</p>
          )}
          <div className="space-y-2">
            {reco.daily_tips.slice(0, 3).map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                <span className="text-primary mt-0.5">•</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
          {reco.foods_to_increase?.length > 0 && (
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <div className="bg-green-50 rounded-2xl p-3">
                <p className="text-xs font-semibold text-green-700 mb-1.5">Eat more</p>
                {reco.foods_to_increase.slice(0, 2).map((f, i) => (
                  <p key={i} className="text-xs text-green-800">• {f.food}</p>
                ))}
              </div>
              {reco.foods_to_reduce?.length > 0 && (
                <div className="bg-red-50 rounded-2xl p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1.5">Reduce</p>
                  {reco.foods_to_reduce.slice(0, 2).map((f, i) => (
                    <p key={i} className="text-xs text-red-800">• {f.food}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Today's meals */}
      <div className="bg-white border rounded-3xl p-6 fade-up-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl sm:text-2xl tracking-tight">Today's meals</h3>
          <Link to="/history" data-testid="link-all-history" className="text-sm text-primary inline-flex items-center gap-1 hover:gap-2 transition-all">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {data.today_items.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No meals logged today yet.{" "}
            <Link to="/scan" className="text-primary underline">Scan one</Link>.
          </p>
        ) : (
          <div className="space-y-2">
            {data.today_items.map((m) => (
              <div key={m.id} data-testid={`today-meal-${m.id}`} className="flex items-center gap-4 p-3 hover:bg-secondary rounded-2xl transition-colors">
                {m.image_b64 ? (
                  <img src={`data:image/jpeg;base64,${m.image_b64}`} alt="" className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-accent/20 grid place-items-center text-primary font-display">
                    {m.food_name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{m.food_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {m.meal_type} · {m.created_at.slice(11, 16)} · Score {m.healthy_score}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display font-semibold">{Math.round(m.calories)} kcal</p>
                  <p className="text-xs text-muted-foreground">P:{Math.round(m.protein)}g C:{Math.round(m.carbs)}g</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
