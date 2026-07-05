import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const FIELDS = [
  { id: "name", label: "Full name", type: "text" },
  { id: "age", label: "Age", type: "number" },
  { id: "height_cm", label: "Height (cm)", type: "number" },
  { id: "weight_kg", label: "Weight (kg)", type: "number" },
  { id: "daily_calorie_target", label: "Daily calorie target", type: "number" },
];

export default function Profile() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setForm({
      name: user.name || "",
      age: user.age || "",
      gender: user.gender || "",
      height_cm: user.height_cm || "",
      weight_kg: user.weight_kg || "",
      fitness_goal: user.fitness_goal || "",
      daily_calorie_target: user.daily_calorie_target || 2000,
    });
  }, [user]);

  const set = (k, v) => setForm({ ...form, [k]: v });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {};
      Object.entries(form).forEach(([k, v]) => {
        if (v === "" || v === null) return;
        if (["age", "height_cm", "weight_kg", "daily_calorie_target"].includes(k)) payload[k] = Number(v);
        else payload[k] = v;
      });
      await api.put("/profile", payload);
      await refresh();
      toast.success("Profile saved");
    } catch (e) {
      toast.error("Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-7 max-w-3xl">
      <div className="fade-up">
        <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Profile</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-2">Your details</h1>
        <p className="text-muted-foreground mt-1.5">Personalize your calorie target and tracking.</p>
      </div>

      <form onSubmit={save} className="bg-white border rounded-3xl p-7 md:p-9 fade-up-1 space-y-6">
        <div className="grid sm:grid-cols-2 gap-5">
          {FIELDS.map((f) => (
            <div key={f.id} className={f.id === "name" ? "sm:col-span-2" : ""}>
              <label className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">{f.label}</label>
              <input
                data-testid={`profile-${f.id}`}
                type={f.type}
                value={form[f.id] ?? ""}
                onChange={(e) => set(f.id, e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-2xl bg-background border focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
          ))}

          <div>
            <label className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">Gender</label>
            <div className="mt-2 flex gap-2">
              {["male", "female", "other"].map((g) => (
                <button key={g} type="button" data-testid={`gender-${g}`} onClick={() => set("gender", g)}
                  className={`px-5 py-2.5 rounded-full text-sm capitalize transition-all ${form.gender === g ? "bg-primary text-white" : "bg-background border text-foreground/70"}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">Fitness goal</label>
            <div className="mt-2 flex gap-2 flex-wrap">
              {[["lose", "Lose"], ["maintain", "Maintain"], ["gain", "Gain"]].map(([v, l]) => (
                <button key={v} type="button" data-testid={`goal-${v}`} onClick={() => set("fitness_goal", v)}
                  className={`px-5 py-2.5 rounded-full text-sm transition-all ${form.fitness_goal === v ? "bg-primary text-white" : "bg-background border text-foreground/70"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{user?.email}</p>
          <button data-testid="profile-save-btn" type="submit" disabled={saving}
            className="bg-primary text-white px-7 py-3 rounded-full font-medium disabled:opacity-60 hover:-translate-y-0.5 transition-transform">
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
