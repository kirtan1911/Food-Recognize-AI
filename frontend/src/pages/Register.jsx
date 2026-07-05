import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Leaf } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const { user, ready, register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  if (ready && user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const r = await register(form.email, form.password, form.name);
    setLoading(false);
    if (r.ok) { toast.success("Account created!"); nav("/profile"); }
    else setErr(r.error);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="flex items-center justify-center p-8 order-2 lg:order-1">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-xl bg-primary grid place-items-center text-white"><Leaf className="w-5 h-5" /></div>
            <span className="font-display font-bold text-xl">Nourish</span>
          </div>
          <h1 className="font-display text-4xl tracking-tight">Start tracking</h1>
          <p className="text-muted-foreground mt-2 text-sm">Build a healthier you in 60 seconds.</p>

          <div className="mt-8 space-y-4">
            {[
              { label: "Full name", id: "name", type: "text", placeholder: "Maya Chen", testid: "register-name" },
              { label: "Email", id: "email", type: "email", placeholder: "you@example.com", testid: "register-email" },
              { label: "Password", id: "password", type: "password", placeholder: "min 6 characters", testid: "register-password" },
            ].map((f) => (
              <div key={f.id}>
                <label className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">{f.label}</label>
                <input
                  data-testid={f.testid}
                  type={f.type}
                  required
                  value={form[f.id]}
                  onChange={(e) => setForm({ ...form, [f.id]: e.target.value })}
                  className="mt-2 w-full px-4 py-3 rounded-2xl bg-white border focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>

          {err && <p data-testid="register-error" className="mt-4 text-sm text-destructive">{err}</p>}

          <button data-testid="register-submit" type="submit" disabled={loading}
            className="mt-8 w-full bg-primary text-white py-3.5 rounded-full font-medium disabled:opacity-60 hover:-translate-y-0.5 transition-transform">
            {loading ? "Creating…" : "Create account"}
          </button>

          <p className="mt-6 text-sm text-muted-foreground text-center">
            Already have one? <Link to="/login" data-testid="link-login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
      <div className="hidden lg:block relative order-1 lg:order-2">
        <img src="https://images.pexels.com/photos/32810338/pexels-photo-32810338.jpeg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-primary/30" />
      </div>
    </div>
  );
}
