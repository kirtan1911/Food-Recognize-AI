import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Scale, Droplets, Dumbbell, TrendingUp, Plus, Trash2,
  Activity, Heart, Bell, BellOff, ChevronDown, ChevronUp
} from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis,
  Tooltip, CartesianGrid, BarChart, Bar
} from "recharts";

const TABS = [
  { id: "bmi", label: "BMI", icon: Scale },
  { id: "weight", label: "Weight", icon: TrendingUp },
  { id: "water", label: "Water", icon: Droplets },
  { id: "exercise", label: "Exercise", icon: Dumbbell },
  { id: "reminders", label: "Reminders", icon: Bell },
];

const WATER_PRESETS = [150, 250, 350, 500];

const EXERCISE_LIST = [
  "Walking", "Running", "Cycling", "Swimming", "Yoga",
  "Weight Training", "HIIT", "Pilates", "Jump Rope", "Dancing",
  "Basketball", "Football", "Tennis", "Rock Climbing", "Other"
];

// MET values for calorie estimation
const MET_MAP = {
  "Walking": 3.5, "Running": 9.8, "Cycling": 7.5, "Swimming": 7.0,
  "Yoga": 2.5, "Weight Training": 6.0, "HIIT": 10.0, "Pilates": 3.0,
  "Jump Rope": 11.0, "Dancing": 6.0, "Basketball": 8.0, "Football": 10.0,
  "Tennis": 7.3, "Rock Climbing": 8.0, "Other": 5.0
};

function bmiColor(bmi) {
  if (bmi < 18.5) return "#3B82F6";
  if (bmi < 25) return "#22C55E";
  if (bmi < 30) return "#F59E0B";
  return "#EF4444";
}

function TabBtn({ tab, active, onClick }) {
  const Icon = tab.icon;
  return (
    <button
      onClick={() => onClick(tab.id)}
      data-testid={`health-tab-${tab.id}`}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all whitespace-nowrap ${
        active ? "bg-primary text-white shadow-sm" : "bg-white border text-foreground/70 hover:bg-secondary"
      }`}
    >
      <Icon className="w-4 h-4" />
      {tab.label}
    </button>
  );
}

// ─── BMI Tab ───────────────────────────────────────────────────────────
function BMITab() {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/bmi/history").then(r => setHistory(r.data)).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/bmi", {
        height_cm: Number(height),
        weight_kg: Number(weight),
      });
      setResult(data);
      setHistory(prev => [data, ...prev]);
      toast.success("BMI calculated & saved!");
    } catch (ex) {
      toast.error(ex.response?.data?.detail || "Failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-3xl p-7">
          <h3 className="font-display text-xl tracking-tight mb-5">Calculate BMI</h3>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">Height (cm)</label>
                <input
                  data-testid="bmi-height"
                  type="number"
                  required
                  min="50" max="300"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  className="mt-2 w-full px-4 py-3 rounded-2xl bg-background border focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="170"
                />
              </div>
              <div>
                <label className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">Weight (kg)</label>
                <input
                  data-testid="bmi-weight"
                  type="number"
                  required
                  min="10" max="500"
                  step="0.1"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  className="mt-2 w-full px-4 py-3 rounded-2xl bg-background border focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="70"
                />
              </div>
            </div>
            <button
              data-testid="bmi-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-full font-medium disabled:opacity-60 hover:-translate-y-0.5 transition-transform"
            >
              {loading ? "Calculating…" : "Calculate BMI"}
            </button>
          </form>

          {result && (
            <div className="mt-6 p-5 rounded-2xl border-2" style={{ borderColor: bmiColor(result.bmi) + "44", background: bmiColor(result.bmi) + "11" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">Your BMI</p>
                  <p className="font-display text-5xl font-bold mt-1" style={{ color: bmiColor(result.bmi) }}>{result.bmi}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold px-3 py-1.5 rounded-full" style={{ background: bmiColor(result.bmi) + "22", color: bmiColor(result.bmi) }}>
                    {result.category}
                  </span>
                </div>
              </div>
              {/* BMI Scale */}
              <div className="mt-4">
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "linear-gradient(to right, #3B82F6 0%, #22C55E 37%, #F59E0B 62%, #EF4444 100%)" }} />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>Under</span><span>Normal</span><span>Over</span><span>Obese</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border rounded-3xl p-7">
          <h3 className="font-display text-xl tracking-tight mb-2">BMI Categories</h3>
          <div className="space-y-3 mt-4">
            {[
              { label: "Underweight", range: "< 18.5", color: "#3B82F6" },
              { label: "Normal weight", range: "18.5 – 24.9", color: "#22C55E" },
              { label: "Overweight", range: "25 – 29.9", color: "#F59E0B" },
              { label: "Obese", range: "≥ 30", color: "#EF4444" },
            ].map(c => (
              <div key={c.label} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                <div className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                <span className="font-medium text-sm">{c.label}</span>
                <span className="ml-auto text-sm text-muted-foreground">{c.range}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="bg-white border rounded-3xl p-7">
          <h3 className="font-display text-xl tracking-tight mb-5">BMI History</h3>
          <div className="h-48">
            <ResponsiveContainer>
              <LineChart data={[...history].reverse()}>
                <CartesianGrid stroke="#E8EAE6" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="created_at" tickFormatter={d => d.slice(5, 10)} fontSize={11} />
                <YAxis domain={["auto", "auto"]} fontSize={11} />
                <Tooltip formatter={(v) => [v, "BMI"]} contentStyle={{ borderRadius: 12 }} />
                <Line type="monotone" dataKey="bmi" stroke="#2C4C3B" strokeWidth={3} dot={{ r: 4, fill: "#D96C4A" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Weight Tab ──────────────────────────────────────────────────────
function WeightTab() {
  const [records, setRecords] = useState([]);
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/weight").then(r => setRecords(r.data)).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/weight", { weight_kg: Number(weight), note });
      setRecords(prev => [data, ...prev]);
      setWeight(""); setNote("");
      toast.success("Weight logged!");
    } catch { toast.error("Failed to save"); }
    finally { setLoading(false); }
  };

  const del = async (id) => {
    await api.delete(`/weight/${id}`);
    setRecords(prev => prev.filter(r => r.id !== id));
    toast.success("Removed");
  };

  const chartData = [...records].reverse().slice(-30);
  const latest = records[0];
  const prev = records[1];
  const diff = latest && prev ? (latest.weight_kg - prev.weight_kg).toFixed(1) : null;

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-3xl p-7">
          <h3 className="font-display text-xl tracking-tight mb-5">Log Weight</h3>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">Weight (kg)</label>
              <input
                data-testid="weight-input"
                type="number"
                required
                min="10" max="500" step="0.1"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-2xl bg-background border focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="70.5"
              />
            </div>
            <div>
              <label className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">Note (optional)</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-2xl bg-background border focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Morning, after workout..."
              />
            </div>
            <button
              data-testid="weight-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-full font-medium disabled:opacity-60 hover:-translate-y-0.5 transition-transform"
            >
              {loading ? "Saving…" : "Log Weight"}
            </button>
          </form>

          {latest && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="bg-secondary rounded-2xl p-4 text-center">
                <p className="font-display text-2xl font-bold">{latest.weight_kg}</p>
                <p className="text-xs text-muted-foreground mt-1">kg today</p>
              </div>
              <div className={`rounded-2xl p-4 text-center ${diff > 0 ? "bg-red-50" : diff < 0 ? "bg-green-50" : "bg-secondary"}`}>
                <p className={`font-display text-2xl font-bold ${diff > 0 ? "text-red-500" : diff < 0 ? "text-green-600" : ""}`}>
                  {diff !== null ? (diff > 0 ? "+" : "") + diff : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">kg change</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border rounded-3xl p-7">
          <h3 className="font-display text-xl tracking-tight mb-2">Recent Records</h3>
          <div className="space-y-2 mt-4 max-h-64 overflow-y-auto pr-1">
            {records.slice(0, 10).map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary transition-colors">
                <div className="w-10 h-10 rounded-xl bg-accent/20 grid place-items-center text-primary font-display font-bold text-sm">
                  {r.weight_kg}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{r.weight_kg} kg</p>
                  <p className="text-xs text-muted-foreground">{r.created_at?.slice(0, 10)} {r.note && `· ${r.note}`}</p>
                </div>
                <button onClick={() => del(r.id)} className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {records.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No records yet</p>}
          </div>
        </div>
      </div>

      {chartData.length > 1 && (
        <div className="bg-white border rounded-3xl p-7">
          <h3 className="font-display text-xl tracking-tight mb-5">Weight Trend</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#E8EAE6" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="created_at" tickFormatter={d => d.slice(5, 10)} fontSize={11} />
                <YAxis domain={["auto", "auto"]} fontSize={11} unit=" kg" />
                <Tooltip formatter={v => [`${v} kg`, "Weight"]} contentStyle={{ borderRadius: 12 }} />
                <Line type="monotone" dataKey="weight_kg" stroke="#2C4C3B" strokeWidth={3} dot={{ r: 4, fill: "#8DAA91" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Water Tab ───────────────────────────────────────────────────────
function WaterTab() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const load = async () => {
    const [today, hist] = await Promise.all([
      api.get("/water/today"),
      api.get("/water/history"),
    ]);
    setData(today.data);
    setHistory(hist.data);
    setGoalInput(today.data.goal_ml);
  };

  useEffect(() => { load(); }, []);

  const addWater = async (ml) => {
    setLoading(true);
    try {
      await api.post("/water", { amount_ml: ml });
      await load();
      toast.success(`+${ml}ml logged!`);
    } catch { toast.error("Failed"); }
    finally { setLoading(false); setCustom(""); }
  };

  const saveGoal = async () => {
    try {
      await api.put("/water/goal", { daily_goal_ml: Number(goalInput) });
      await load();
      toast.success("Goal updated!");
    } catch { toast.error("Failed"); }
  };

  const pct = data ? Math.min(100, (data.total_ml / data.goal_ml) * 100) : 0;
  const cups = data ? Math.round(data.total_ml / 237) : 0;

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily tracker */}
        <div className="bg-white border rounded-3xl p-7">
          <h3 className="font-display text-xl tracking-tight mb-5">Today's Water</h3>
          {data && (
            <>
              <div className="relative w-36 h-36 mx-auto mb-6">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#E8EAE6" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke="#3B82F6" strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Droplets className="w-5 h-5 text-blue-500 mb-1" />
                  <p className="font-display text-2xl font-bold text-blue-600">{data.total_ml}</p>
                  <p className="text-xs text-muted-foreground">of {data.goal_ml} ml</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-blue-50 rounded-2xl p-3 text-center">
                  <p className="font-bold text-blue-600">{cups}</p>
                  <p className="text-xs text-muted-foreground">cups</p>
                </div>
                <div className="bg-secondary rounded-2xl p-3 text-center">
                  <p className="font-bold">{data.remaining_ml}</p>
                  <p className="text-xs text-muted-foreground">ml left</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {WATER_PRESETS.map(ml => (
                  <button
                    key={ml}
                    data-testid={`water-${ml}`}
                    onClick={() => addWater(ml)}
                    disabled={loading}
                    className="bg-blue-500 text-white rounded-xl py-2.5 text-xs font-semibold hover:-translate-y-0.5 transition-transform disabled:opacity-60"
                  >
                    +{ml}ml
                  </button>
                ))}
              </div>

              <div className="flex gap-2 mt-3">
                <input
                  type="number"
                  placeholder="Custom ml"
                  value={custom}
                  onChange={e => setCustom(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-background border text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <button
                  onClick={() => custom && addWater(Number(custom))}
                  disabled={!custom || loading}
                  className="bg-primary text-white px-4 rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </>
          )}
        </div>

        {/* Goal setting */}
        <div className="bg-white border rounded-3xl p-7 space-y-5">
          <h3 className="font-display text-xl tracking-tight">Daily Goal</h3>
          <div className="flex gap-2">
            <input
              type="number"
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              className="flex-1 px-4 py-3 rounded-2xl bg-background border focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="2000"
            />
            <button
              onClick={saveGoal}
              className="bg-primary text-white px-5 rounded-2xl font-medium hover:-translate-y-0.5 transition-transform"
            >
              Set
            </button>
          </div>
          <div className="space-y-2">
            {[1500, 2000, 2500, 3000].map(g => (
              <button
                key={g}
                onClick={() => { setGoalInput(g); }}
                className={`w-full text-left px-4 py-2.5 rounded-2xl text-sm transition-all ${goalInput == g ? "bg-primary/10 text-primary font-semibold" : "hover:bg-secondary"}`}
              >
                {g} ml/day {g === 2000 && "· Recommended"}
              </button>
            ))}
          </div>

          {/* Today's log */}
          <div>
            <p className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground mb-3">Today's log</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {data?.logs?.map(l => (
                <div key={l.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-xl bg-blue-50/60">
                  <span className="text-blue-700 font-medium">+{l.amount_ml} ml</span>
                  <span className="text-muted-foreground text-xs">{l.created_at?.slice(11, 16)}</span>
                </div>
              ))}
              {(!data?.logs || data.logs.length === 0) && (
                <p className="text-sm text-muted-foreground py-3 text-center">No entries yet today</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="bg-white border rounded-3xl p-7">
          <h3 className="font-display text-xl tracking-tight mb-5">Water Intake Trend (30 days)</h3>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={history}>
                <CartesianGrid stroke="#E8EAE6" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={d => d.slice(5)} fontSize={10} />
                <YAxis fontSize={11} unit="ml" />
                <Tooltip formatter={v => [`${v} ml`, "Water"]} contentStyle={{ borderRadius: 12 }} />
                <Bar dataKey="total_ml" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Exercise Tab ─────────────────────────────────────────────────────
function ExerciseTab() {
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState({ exercise_name: "Walking", duration_min: "", calories_burned: "", notes: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/exercise").then(r => setLogs(r.data)).catch(() => {});
  }, []);

  const estimateCal = (name, dur, weightKg = 70) => {
    const met = MET_MAP[name] || 5;
    return Math.round(met * weightKg * (dur / 60));
  };

  const onExerciseChange = (name) => {
    const dur = form.duration_min;
    setForm(f => ({
      ...f,
      exercise_name: name,
      calories_burned: dur ? estimateCal(name, Number(dur)) : "",
    }));
  };

  const onDurChange = (dur) => {
    setForm(f => ({
      ...f,
      duration_min: dur,
      calories_burned: dur ? estimateCal(f.exercise_name, Number(dur)) : "",
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/exercise", {
        exercise_name: form.exercise_name,
        duration_min: Number(form.duration_min),
        calories_burned: Number(form.calories_burned),
        notes: form.notes,
      });
      setLogs(prev => [data, ...prev]);
      setForm({ exercise_name: "Walking", duration_min: "", calories_burned: "", notes: "" });
      toast.success("Exercise logged!");
    } catch { toast.error("Failed"); }
    finally { setLoading(false); }
  };

  const del = async (id) => {
    await api.delete(`/exercise/${id}`);
    setLogs(prev => prev.filter(l => l.id !== id));
    toast.success("Removed");
  };

  const todayLogs = logs.filter(l => l.date === new Date().toISOString().slice(0, 10));
  const totalBurned = todayLogs.reduce((s, l) => s + l.calories_burned, 0);
  const totalMin = todayLogs.reduce((s, l) => s + l.duration_min, 0);

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-3xl p-7">
          <h3 className="font-display text-xl tracking-tight mb-5">Log Exercise</h3>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">Activity</label>
              <select
                data-testid="exercise-name"
                value={form.exercise_name}
                onChange={e => onExerciseChange(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-2xl bg-background border focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {EXERCISE_LIST.map(ex => <option key={ex}>{ex}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">Duration (min)</label>
                <input
                  data-testid="exercise-duration"
                  type="number"
                  required
                  min="1"
                  value={form.duration_min}
                  onChange={e => onDurChange(e.target.value)}
                  className="mt-2 w-full px-4 py-3 rounded-2xl bg-background border focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="30"
                />
              </div>
              <div>
                <label className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">Calories Burned</label>
                <input
                  data-testid="exercise-calories"
                  type="number"
                  required
                  min="0"
                  value={form.calories_burned}
                  onChange={e => setForm(f => ({ ...f, calories_burned: e.target.value }))}
                  className="mt-2 w-full px-4 py-3 rounded-2xl bg-background border focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Auto-estimated"
                />
              </div>
            </div>
            <div>
              <label className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">Notes (optional)</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="mt-2 w-full px-4 py-3 rounded-2xl bg-background border focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Morning run at the park"
              />
            </div>
            <button
              data-testid="exercise-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-full font-medium disabled:opacity-60 hover:-translate-y-0.5 transition-transform"
            >
              {loading ? "Saving…" : "Log Exercise"}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border rounded-3xl p-6 text-center">
              <Activity className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="font-display text-3xl font-bold">{Math.round(totalBurned)}</p>
              <p className="text-xs text-muted-foreground mt-1">kcal burned today</p>
            </div>
            <div className="bg-white border rounded-3xl p-6 text-center">
              <Heart className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <p className="font-display text-3xl font-bold">{totalMin}</p>
              <p className="text-xs text-muted-foreground mt-1">active minutes today</p>
            </div>
          </div>

          <div className="bg-white border rounded-3xl p-5">
            <h4 className="font-display text-lg tracking-tight mb-3">Today's Activities</h4>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {todayLogs.map(l => (
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 grid place-items-center">
                    <Dumbbell className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{l.exercise_name}</p>
                    <p className="text-xs text-muted-foreground">{l.duration_min} min · {l.calories_burned} kcal</p>
                  </div>
                  <button onClick={() => del(l.id)} className="text-muted-foreground hover:text-destructive p-1 rounded-lg hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {todayLogs.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No activities logged today</p>}
            </div>
          </div>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="bg-white border rounded-3xl p-7">
          <h3 className="font-display text-xl tracking-tight mb-5">Exercise History (30 days)</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {logs.slice(0, 20).map(l => (
              <div key={l.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary transition-colors">
                <div className="text-xs text-muted-foreground w-20">{l.date}</div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{l.exercise_name}</p>
                  <p className="text-xs text-muted-foreground">{l.duration_min} min · {l.notes}</p>
                </div>
                <span className="text-sm font-semibold text-primary">{l.calories_burned} kcal</span>
                <button onClick={() => del(l.id)} className="text-muted-foreground hover:text-destructive p-1 rounded-lg hover:bg-destructive/10">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reminders Tab ────────────────────────────────────────────────────
function RemindersTab() {
  const [form, setForm] = useState({ breakfast: "", lunch: "", dinner: "", snack: "", enabled: false });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/reminders").then(r => setForm({
      breakfast: r.data.breakfast || "",
      lunch: r.data.lunch || "",
      dinner: r.data.dinner || "",
      snack: r.data.snack || "",
      enabled: r.data.enabled || false,
    })).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put("/reminders", {
        breakfast: form.breakfast || null,
        lunch: form.lunch || null,
        dinner: form.dinner || null,
        snack: form.snack || null,
        enabled: form.enabled,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success("Reminders saved!");
    } catch { toast.error("Failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-white border rounded-3xl p-7 max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-xl tracking-tight">Meal Reminders</h3>
        <button
          onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${form.enabled ? "bg-primary text-white" : "bg-secondary border"}`}
        >
          {form.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          {form.enabled ? "Enabled" : "Disabled"}
        </button>
      </div>
      <form onSubmit={save} className="space-y-4">
        {[
          { id: "breakfast", label: "🌅 Breakfast", placeholder: "07:30" },
          { id: "lunch", label: "☀️ Lunch", placeholder: "12:30" },
          { id: "dinner", label: "🌙 Dinner", placeholder: "19:00" },
          { id: "snack", label: "🍎 Snack", placeholder: "15:00" },
        ].map(f => (
          <div key={f.id}>
            <label className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">{f.label}</label>
            <input
              type="time"
              value={form[f.id]}
              onChange={e => setForm(prev => ({ ...prev, [f.id]: e.target.value }))}
              className="mt-2 w-full px-4 py-3 rounded-2xl bg-background border focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        ))}
        <p className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded-xl">
          💡 Reminders appear as in-app notifications when you're using Nourish at the scheduled time.
        </p>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white py-3 rounded-full font-medium disabled:opacity-60 hover:-translate-y-0.5 transition-transform"
        >
          {loading ? "Saving…" : saved ? "✓ Saved!" : "Save Reminders"}
        </button>
      </form>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────
export default function HealthHub() {
  const [activeTab, setActiveTab] = useState("bmi");

  return (
    <div className="space-y-7 max-w-5xl">
      <div className="fade-up">
        <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Health Tools</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-2">Health Hub</h1>
        <p className="text-muted-foreground mt-1.5">Track your BMI, weight, water, and exercise in one place.</p>
      </div>

      <div className="flex flex-wrap gap-2 fade-up-1">
        {TABS.map(t => (
          <TabBtn key={t.id} tab={t} active={activeTab === t.id} onClick={setActiveTab} />
        ))}
      </div>

      <div className="fade-up-2">
        {activeTab === "bmi" && <BMITab />}
        {activeTab === "weight" && <WeightTab />}
        {activeTab === "water" && <WaterTab />}
        {activeTab === "exercise" && <ExerciseTab />}
        {activeTab === "reminders" && <RemindersTab />}
      </div>
    </div>
  );
}
