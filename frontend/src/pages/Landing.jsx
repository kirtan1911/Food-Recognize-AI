import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Leaf, Camera, Sparkles, ChartLine } from "lucide-react";

export default function Landing() {
  const { user, ready } = useAuth();
  if (ready && user) return <Navigate to="/dashboard" replace />;
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-grain opacity-40 pointer-events-none" />
      <nav className="relative max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-primary grid place-items-center text-white">
            <Leaf className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-xl">Nourish</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" data-testid="nav-login" className="text-sm text-foreground/70 hover:text-foreground px-4 py-2">Log in</Link>
          <Link to="/register" data-testid="nav-register" className="text-sm bg-primary text-white px-5 py-2.5 rounded-full hover:-translate-y-0.5 transition-transform">Get started</Link>
        </div>
      </nav>

      <section className="relative max-w-6xl mx-auto px-6 pt-12 md:pt-20 pb-24 grid lg:grid-cols-2 gap-12 items-center">
        <div className="fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-border mb-6 text-xs tracking-[0.18em] uppercase font-semibold text-primary">
            <Sparkles className="w-3.5 h-3.5" /> AI Vision · Gemini 3 Flash
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-none text-foreground">
            Snap a meal.<br />
            <span className="text-primary">Know exactly</span> what you ate.
          </h1>
          <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-lg leading-relaxed">
            Frictionless nutrition tracking for people who'd rather live than log. Point your camera at any plate — get calories, macros, and a healthy score in seconds.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/register" data-testid="hero-get-started" className="bg-primary text-white px-7 py-3.5 rounded-full font-medium hover:-translate-y-1 hover:shadow-lg transition-all">
              Start tracking free
            </Link>
            <Link to="/login" data-testid="hero-login" className="border border-border bg-white px-7 py-3.5 rounded-full font-medium hover:bg-secondary transition-colors">
              I have an account
            </Link>
          </div>
          <div className="mt-10 flex items-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2"><Camera className="w-4 h-4 text-primary" /> Photo or webcam</div>
            <div className="flex items-center gap-2"><ChartLine className="w-4 h-4 text-primary" /> Weekly insights</div>
          </div>
        </div>

        <div className="relative fade-up-2">
          <div className="absolute -inset-6 bg-accent/20 rounded-[3rem] blur-3xl -z-10" />
          <div className="relative bg-white rounded-[2.5rem] border shadow-sm overflow-hidden animate-float">
            <img
              src="https://images.pexels.com/photos/4519049/pexels-photo-4519049.jpeg"
              alt="healthy meal"
              className="w-full h-[420px] object-cover"
            />
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="font-display font-semibold text-xl">Greek Bowl</p>
                <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-semibold">94% match</span>
              </div>
              <div className="grid grid-cols-4 gap-3 text-center">
                {[
                  { l: "kcal", v: "462" },
                  { l: "Protein", v: "28g" },
                  { l: "Carbs", v: "44g" },
                  { l: "Fat", v: "18g" },
                ].map((m) => (
                  <div key={m.l} className="bg-secondary rounded-xl py-3">
                    <p className="font-display font-bold text-lg">{m.v}</p>
                    <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mt-1">{m.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
