import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Leaf, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { user, ready, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  if (ready && user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const r = await login(email, password);
    setLoading(false);
    if (r.ok) { toast.success("Welcome back!"); nav("/dashboard"); }
    else setErr(r.error);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:block relative">
        <img
          src="https://images.pexels.com/photos/4519049/pexels-photo-4519049.jpeg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/35" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <Leaf className="w-8 h-8 mb-4" />
          <p className="font-display text-3xl tracking-tight leading-tight max-w-md">
            &ldquo;Logging meals shouldn&apos;t feel like a chore. Just snap and go.&rdquo;
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-xl bg-primary grid place-items-center text-white">
              <Leaf className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-xl">Nourish</span>
          </div>
          <h1 className="font-display text-4xl tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground mt-2 text-sm">Sign in to continue your nutrition journey.</p>

          <div className="mt-8 space-y-4">
            <div>
              <label className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">Email</label>
              <input
                data-testid="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-2xl bg-white border focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">Password</label>
                <Link
                  to="/forgot-password"
                  data-testid="forgot-password-link"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-2">
                <input
                  data-testid="login-password"
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-2xl bg-white border focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {err && <p data-testid="login-error" className="mt-4 text-sm text-destructive">{err}</p>}

          <button
            data-testid="login-submit"
            type="submit"
            disabled={loading}
            className="mt-8 w-full bg-primary text-white py-3.5 rounded-full font-medium disabled:opacity-60 hover:-translate-y-0.5 transition-transform"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="mt-6 text-sm text-muted-foreground text-center">
            No account?{" "}
            <Link to="/register" data-testid="link-register" className="text-primary font-semibold hover:underline">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
