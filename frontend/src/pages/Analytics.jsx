import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from "recharts";

const TABS = [
  { id: "daily", label: "Daily (7d)" },
  { id: "weekly", label: "Weekly (4w)" },
  { id: "monthly", label: "Monthly (30d)" },
  { id: "yearly", label: "Yearly (12m)" },
  { id: "nutrition", label: "Nutrition" },
  { id: "weight", label: "Weight" },
  { id: "water", label: "Water" },
  { id: "exercise", label: "Exercise" },
];

const COLORS = ["#2C4C3B", "#D96C4A", "#E6B87A", "#8DAA91", "#3B82F6", "#8B5CF6"];

const MEAL_COLORS = {
  breakfast: "#E6B87A",
  lunch: "#D96C4A",
  dinner: "#2C4C3B",
  snack: "#8DAA91",
};

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white border rounded-3xl p-6">
      <div className="mb-5">
        <h3 className="font-display text-xl tracking-tight">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, unit = "kcal" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border rounded-2xl p-3 shadow-sm text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value} {unit}</strong></p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [dash, setDash] = useState(null);
  const [history, setHistory] = useState([]);
  const [weights, setWeights] = useState([]);
  const [waterHist, setWaterHist] = useState([]);
  const [exerciseLogs, setExerciseLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("daily");

  useEffect(() => {
    Promise.all([
      api.get("/dashboard"),
      api.get("/history"),
      api.get("/weight"),
      api.get("/water/history"),
      api.get("/exercise"),
    ]).then(([d, h, w, wh, ex]) => {
      setDash(d.data);
      setHistory(h.data);
      setWeights([...w.data].reverse());
      setWaterHist(wh.data);
      setExerciseLogs(ex.data);
    }).catch(() => {});
  }, []);

  if (!dash) return <div className="text-muted-foreground animate-pulse">Loading analytics…</div>;

  // Meal frequency by type
  const mealFreq = history.reduce((acc, item) => {
    acc[item.meal_type] = (acc[item.meal_type] || 0) + 1;
    return acc;
  }, {});
  const mealFreqData = Object.entries(mealFreq).map(([name, value]) => ({ name, value }));

  // Macro distribution today
  const macroData = [
    { name: "Protein", value: Math.round(dash.protein), color: "#D96C4A" },
    { name: "Carbs", value: Math.round(dash.carbs), color: "#E6B87A" },
    { name: "Fat", value: Math.round(dash.fat), color: "#8DAA91" },
  ];

  // Weekly 4 weeks (group by week from monthly data)
  const weeklyGrouped = (() => {
    const weeks = [];
    const data = [...dash.monthly];
    for (let i = 0; i < 4; i++) {
      const chunk = data.slice(i * 7, (i + 1) * 7);
      if (chunk.length > 0) {
        weeks.push({
          week: `W${i + 1} ${chunk[0]?.date?.slice(5)}`,
          calories: Math.round(chunk.reduce((s, d) => s + d.calories, 0)),
        });
      }
    }
    return weeks;
  })();

  // Exercise by day
  const exerciseByDay = exerciseLogs.reduce((acc, e) => {
    acc[e.date] = (acc[e.date] || 0) + e.calories_burned;
    return acc;
  }, {});
  const exerciseChartData = Object.entries(exerciseByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, cal]) => ({ date: date.slice(5), calories_burned: Math.round(cal) }));

  // Average healthy score by meal type
  const scoreByMeal = history.reduce((acc, item) => {
    if (!acc[item.meal_type]) acc[item.meal_type] = { total: 0, count: 0 };
    acc[item.meal_type].total += item.healthy_score || 0;
    acc[item.meal_type].count++;
    return acc;
  }, {});
  const scoreData = Object.entries(scoreByMeal).map(([name, { total, count }]) => ({
    name, avg_score: Math.round(total / count)
  }));

  return (
    <div className="space-y-7 max-w-5xl">
      <div className="fade-up">
        <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Insights</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-2">Charts & Analytics</h1>
        <p className="text-muted-foreground mt-1.5">Visual breakdown of your nutrition journey.</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 fade-up-1">
        {[
          { label: "Total Meals", value: dash.recognition_count, sub: "all time" },
          { label: "Avg Healthy Score", value: dash.avg_healthy_score, sub: "out of 100" },
          { label: "Weekly Calories", value: Math.round(dash.weekly_total), sub: "last 7 days" },
          { label: "Monthly Calories", value: Math.round(dash.monthly_total), sub: "last 30 days" },
        ].map(s => (
          <div key={s.label} className="bg-white border rounded-3xl p-5">
            <p className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">{s.label}</p>
            <p className="font-display text-3xl font-bold mt-2">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tab selector */}
      <div className="flex flex-wrap gap-2 fade-up-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === t.id ? "bg-primary text-white" : "bg-white border text-foreground/70 hover:bg-secondary"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-6 fade-up-2">
        {/* Daily / Weekly / Monthly / Yearly */}
        {activeTab === "daily" && (
          <ChartCard title="Daily Calories (Last 7 Days)" subtitle="Calorie intake per day this week">
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={dash.weekly}>
                  <defs>
                    <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2C4C3B" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2C4C3B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E8EAE6" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={d => d.slice(5)} fontSize={11} stroke="#5C7365" />
                  <YAxis fontSize={11} stroke="#5C7365" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="calories" stroke="#2C4C3B" strokeWidth={3} fill="url(#calGrad)" dot={{ r: 5, fill: "#D96C4A" }} name="Calories" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {activeTab === "weekly" && (
          <ChartCard title="Weekly Calories (Last 4 Weeks)" subtitle="Total calories consumed per week">
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={weeklyGrouped}>
                  <CartesianGrid stroke="#E8EAE6" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" fontSize={11} stroke="#5C7365" />
                  <YAxis fontSize={11} stroke="#5C7365" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="calories" fill="#2C4C3B" radius={[8, 8, 0, 0]} name="Calories" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {activeTab === "monthly" && (
          <ChartCard title="Daily Calories (Last 30 Days)" subtitle="Full month calorie breakdown">
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={dash.monthly}>
                  <defs>
                    <linearGradient id="monthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8DAA91" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8DAA91" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E8EAE6" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={d => d.slice(5)} fontSize={9} stroke="#5C7365" interval={4} />
                  <YAxis fontSize={11} stroke="#5C7365" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="calories" stroke="#8DAA91" strokeWidth={2} fill="url(#monthGrad)" name="Calories" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {activeTab === "yearly" && (
          <ChartCard title="Monthly Calories (Last 12 Months)" subtitle="Year-at-a-glance calorie overview">
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={dash.yearly}>
                  <CartesianGrid stroke="#E8EAE6" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={d => d.slice(5)} fontSize={11} stroke="#5C7365" />
                  <YAxis fontSize={11} stroke="#5C7365" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="calories" fill="#2C4C3B" radius={[6, 6, 0, 0]} name="Calories" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {activeTab === "nutrition" && (
          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="Macro Distribution Today" subtitle="Protein / Carbs / Fat breakdown">
              <div className="h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={macroData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} dataKey="value" nameKey="name" paddingAngle={3}>
                      {macroData.map((m, i) => <Cell key={m.name} fill={m.color} />)}
                    </Pie>
                    <Tooltip formatter={v => [`${v}g`]} contentStyle={{ borderRadius: 12 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Meal Frequency" subtitle="How often you eat each meal type">
              <div className="h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={mealFreqData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={3}>
                      {mealFreqData.map((entry) => (
                        <Cell key={entry.name} fill={MEAL_COLORS[entry.name] || "#8DAA91"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Avg Healthy Score by Meal Type" subtitle="How nutritious each meal type tends to be">
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={scoreData}>
                    <CartesianGrid stroke="#E8EAE6" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis domain={[0, 100]} fontSize={11} />
                    <Tooltip formatter={v => [v, "Avg Score"]} contentStyle={{ borderRadius: 12 }} />
                    <Bar dataKey="avg_score" name="Avg Score" radius={[6, 6, 0, 0]}>
                      {scoreData.map((entry) => (
                        <Cell key={entry.name} fill={MEAL_COLORS[entry.name] || "#8DAA91"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        )}

        {activeTab === "weight" && (
          <ChartCard title="Weight Trend" subtitle="Your weight progress over time">
            {weights.length > 1 ? (
              <div className="h-72">
                <ResponsiveContainer>
                  <LineChart data={weights}>
                    <CartesianGrid stroke="#E8EAE6" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="created_at" tickFormatter={d => d.slice(5, 10)} fontSize={11} />
                    <YAxis domain={["auto", "auto"]} fontSize={11} unit=" kg" />
                    <Tooltip formatter={v => [`${v} kg`, "Weight"]} contentStyle={{ borderRadius: 12 }} />
                    <Line type="monotone" dataKey="weight_kg" stroke="#2C4C3B" strokeWidth={3} dot={{ r: 5, fill: "#D96C4A" }} name="Weight" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 grid place-items-center text-muted-foreground">
                <p>Log at least 2 weight entries to see the trend.</p>
              </div>
            )}
          </ChartCard>
        )}

        {activeTab === "water" && (
          <ChartCard title="Water Intake Trend (30 days)" subtitle="Daily water consumption in milliliters">
            {waterHist.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={waterHist}>
                    <CartesianGrid stroke="#E8EAE6" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={d => d.slice(5)} fontSize={10} interval={3} />
                    <YAxis fontSize={11} unit="ml" />
                    <Tooltip formatter={v => [`${v} ml`, "Water"]} contentStyle={{ borderRadius: 12 }} />
                    <Bar dataKey="total_ml" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Water (ml)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 grid place-items-center text-muted-foreground">
                <p>Start logging water intake to see your trends.</p>
              </div>
            )}
          </ChartCard>
        )}

        {activeTab === "exercise" && (
          <ChartCard title="Exercise Calories Burned (14 days)" subtitle="Calories burned through exercise per day">
            {exerciseChartData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={exerciseChartData}>
                    <CartesianGrid stroke="#E8EAE6" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={v => [`${v} kcal`, "Burned"]} contentStyle={{ borderRadius: 12 }} />
                    <Bar dataKey="calories_burned" fill="#D96C4A" radius={[6, 6, 0, 0]} name="Calories Burned" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 grid place-items-center text-muted-foreground">
                <p>Log exercise activities to see your burn trends.</p>
              </div>
            )}
          </ChartCard>
        )}
      </div>
    </div>
  );
}
