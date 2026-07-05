import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const PERIODS = [
  { id: "weekly", label: "This Week vs Last Week" },
  { id: "monthly", label: "This Month vs Last Month" },
  { id: "yearly", label: "This Year vs Last Year" },
];

function diff(curr, prev) {
  if (!prev || prev === 0) return null;
  const d = ((curr - prev) / prev) * 100;
  return d.toFixed(1);
}

function DiffBadge({ curr, prev, inverse = false }) {
  const d = diff(curr, prev);
  if (d === null) return <span className="text-xs text-muted-foreground">No data</span>;
  const better = inverse ? Number(d) < 0 : Number(d) > 0;
  const sign = Number(d) > 0 ? "+" : "";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
      better ? "bg-green-50 text-green-600" : Number(d) === 0 ? "bg-secondary text-muted-foreground" : "bg-red-50 text-red-500"
    }`}>
      {Number(d) > 0 ? <TrendingUp className="w-3 h-3" /> : Number(d) < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      {sign}{d}%
    </span>
  );
}

function StatRow({ label, curr, prev, unit = "", inverse = false }) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">{Math.round(curr)} {unit}</span>
        <span className="text-xs text-muted-foreground">vs {Math.round(prev)} {unit}</span>
        <DiffBadge curr={curr} prev={prev} inverse={inverse} />
      </div>
    </div>
  );
}

export default function CompareReports() {
  const [period, setPeriod] = useState("weekly");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get("/report/compare", { params: { period } })
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const chartData = data ? [
    {
      name: "Calories",
      Current: Math.round(data.current.calories),
      Previous: Math.round(data.previous.calories),
    },
    {
      name: "Protein",
      Current: Math.round(data.current.protein),
      Previous: Math.round(data.previous.protein),
    },
    {
      name: "Carbs",
      Current: Math.round(data.current.carbs),
      Previous: Math.round(data.previous.carbs),
    },
    {
      name: "Fat",
      Current: Math.round(data.current.fat),
      Previous: Math.round(data.previous.fat),
    },
  ] : [];

  return (
    <div className="space-y-7 max-w-4xl">
      <div className="fade-up">
        <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Comparison</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-2">Compare Reports</h1>
        <p className="text-muted-foreground mt-1.5">See how your nutrition has changed over time.</p>
      </div>

      {/* Period selector */}
      <div className="grid sm:grid-cols-3 gap-4 fade-up-1">
        {PERIODS.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`text-left p-5 rounded-3xl border transition-all hover:-translate-y-0.5 hover:shadow-sm ${
              period === p.id ? "ring-2 ring-primary border-primary bg-primary/5" : "bg-white"
            }`}
          >
            <p className={`font-display text-lg tracking-tight ${period === p.id ? "text-primary" : ""}`}>{p.label.split(" vs ")[0]}</p>
            <p className="text-sm text-muted-foreground mt-0.5">vs {p.label.split(" vs ")[1]}</p>
          </button>
        ))}
      </div>

      {loading && <div className="text-muted-foreground animate-pulse">Loading comparison…</div>}

      {data && !loading && (
        <>
          {/* Labels */}
          <div className="grid grid-cols-2 gap-4 fade-up-1">
            <div className="bg-primary text-white rounded-3xl p-5">
              <p className="text-xs tracking-[0.18em] uppercase font-semibold opacity-70">Current Period</p>
              <p className="font-display text-sm mt-1 opacity-90">{data.current_label}</p>
              <p className="font-display text-3xl font-bold mt-2">{Math.round(data.current.calories)} kcal</p>
              <p className="text-sm opacity-70 mt-1">{data.current.meals} meals</p>
            </div>
            <div className="bg-secondary border rounded-3xl p-5">
              <p className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">Previous Period</p>
              <p className="font-display text-sm mt-1 text-muted-foreground">{data.previous_label}</p>
              <p className="font-display text-3xl font-bold mt-2">{Math.round(data.previous.calories)} kcal</p>
              <p className="text-sm text-muted-foreground mt-1">{data.previous.meals} meals</p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white border rounded-3xl p-7 fade-up-2">
            <h3 className="font-display text-xl tracking-tight mb-5">Side-by-Side Comparison</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={chartData} barCategoryGap="25%">
                  <CartesianGrid stroke="#E8EAE6" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={11} />
                  <Tooltip contentStyle={{ borderRadius: 12 }} />
                  <Legend />
                  <Bar dataKey="Current" fill="#2C4C3B" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Previous" fill="#8DAA91" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stat breakdown */}
          <div className="bg-white border rounded-3xl p-7 fade-up-3">
            <h3 className="font-display text-xl tracking-tight mb-2">Detailed Breakdown</h3>
            <p className="text-sm text-muted-foreground mb-5">
              <span className="font-semibold text-green-600">Green</span> = improvement, <span className="font-semibold text-red-500">Red</span> = decline
            </p>
            <StatRow label="Total Calories" curr={data.current.calories} prev={data.previous.calories} unit="kcal" inverse />
            <StatRow label="Protein Intake" curr={data.current.protein} prev={data.previous.protein} unit="g" />
            <StatRow label="Carb Intake" curr={data.current.carbs} prev={data.previous.carbs} unit="g" />
            <StatRow label="Fat Intake" curr={data.current.fat} prev={data.previous.fat} unit="g" />
            <StatRow label="Meals Logged" curr={data.current.meals} prev={data.previous.meals} />
            <StatRow label="Avg Healthy Score" curr={data.current.avg_healthy} prev={data.previous.avg_healthy} />
          </div>
        </>
      )}
    </div>
  );
}
