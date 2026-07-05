import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { Leaf, Mail, KeyRound, Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const STEPS = ["email", "otp", "reset", "done"];

export default function ForgotPassword() {
  const nav = useNavigate();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const sendOtp = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      toast.success("OTP sent! Check your email inbox.");
      setStep("otp");
    } catch (ex) {
      setErr(formatApiErrorDetail(ex.response?.data?.detail) || ex.message);
    } finally { setLoading(false); }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await api.post("/auth/verify-otp", { email, otp });
      toast.success("OTP verified!");
      setStep("reset");
    } catch (ex) {
      setErr(formatApiErrorDetail(ex.response?.data?.detail) || "Invalid OTP");
    } finally { setLoading(false); }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) { setErr("Passwords do not match"); return; }
    setErr(""); setLoading(true);
    try {
      await api.post("/auth/reset-password", { email, otp, new_password: newPw });
      setStep("done");
      toast.success("Password reset successfully!");
    } catch (ex) {
      setErr(formatApiErrorDetail(ex.response?.data?.detail) || ex.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left Panel */}
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
            &ldquo;Your health journey continues &mdash; reset and keep going.&rdquo;
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-xl bg-primary grid place-items-center text-white">
              <Leaf className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-xl">Nourish</span>
          </div>

          {/* Step: Email */}
          {step === "email" && (
            <form onSubmit={sendOtp}>
              <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to login
              </Link>
              <h1 className="font-display text-4xl tracking-tight">Forgot password?</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Enter your email and we'll send you a 6-digit OTP to reset your password.
              </p>
              <div className="mt-8 space-y-4">
                <div>
                  <label className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">
                    Email address
                  </label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      data-testid="forgot-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
              </div>
              {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
              <button
                data-testid="send-otp-btn"
                type="submit"
                disabled={loading}
                className="mt-8 w-full bg-primary text-white py-3.5 rounded-full font-medium disabled:opacity-60 hover:-translate-y-0.5 transition-transform"
              >
                {loading ? "Sending OTP…" : "Send OTP"}
              </button>
            </form>
          )}

          {/* Step: OTP */}
          {step === "otp" && (
            <form onSubmit={verifyOtp}>
              <button type="button" onClick={() => setStep("email")} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <h1 className="font-display text-4xl tracking-tight">Enter OTP</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.
              </p>
              <div className="mt-8 space-y-4">
                <div>
                  <label className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">
                    6-Digit OTP
                  </label>
                  <div className="relative mt-2">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      data-testid="otp-input"
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border focus:outline-none focus:ring-2 focus:ring-accent text-center text-xl font-bold tracking-[0.5em]"
                      placeholder="000000"
                    />
                  </div>
                </div>
              </div>
              {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
              <button
                data-testid="verify-otp-btn"
                type="submit"
                disabled={loading || otp.length < 6}
                className="mt-8 w-full bg-primary text-white py-3.5 rounded-full font-medium disabled:opacity-60 hover:-translate-y-0.5 transition-transform"
              >
                {loading ? "Verifying…" : "Verify OTP"}
              </button>
              <button
                type="button"
                onClick={sendOtp}
                disabled={loading}
                className="mt-3 w-full text-sm text-primary hover:underline"
              >
                Resend OTP
              </button>
            </form>
          )}

          {/* Step: Reset */}
          {step === "reset" && (
            <form onSubmit={resetPassword}>
              <h1 className="font-display text-4xl tracking-tight">Set new password</h1>
              <p className="text-muted-foreground mt-2 text-sm">Choose a strong password (min 6 characters).</p>
              <div className="mt-8 space-y-4">
                <div>
                  <label className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">New Password</label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      data-testid="new-password"
                      type="password"
                      required
                      minLength={6}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground">Confirm Password</label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      data-testid="confirm-password"
                      type="password"
                      required
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
              {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
              <button
                data-testid="reset-password-btn"
                type="submit"
                disabled={loading}
                className="mt-8 w-full bg-primary text-white py-3.5 rounded-full font-medium disabled:opacity-60 hover:-translate-y-0.5 transition-transform"
              >
                {loading ? "Resetting…" : "Reset Password"}
              </button>
            </form>
          )}

          {/* Step: Done */}
          {step === "done" && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 grid place-items-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <h1 className="font-display text-3xl tracking-tight">Password reset!</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Your password has been updated successfully. You can now log in.
              </p>
              <button
                onClick={() => nav("/login")}
                className="mt-8 w-full bg-primary text-white py-3.5 rounded-full font-medium hover:-translate-y-0.5 transition-transform"
              >
                Back to Login
              </button>
            </div>
          )}

          {/* Step indicator */}
          <div className="mt-8 flex justify-center gap-2">
            {["email", "otp", "reset", "done"].map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s === step ? "w-6 bg-primary" :
                  STEPS.indexOf(s) < STEPS.indexOf(step) ? "w-3 bg-primary/40" : "w-3 bg-border"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
