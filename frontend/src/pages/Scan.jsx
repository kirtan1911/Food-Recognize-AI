import { useRef, useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Camera, Upload, Sparkles, X, Check, RotateCcw, Heart, Info, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

function defaultMealType() {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 18) return "snack";
  return "dinner";
}

function scoreColor(score) {
  if (score >= 70) return { bg: "#22C55E22", color: "#16A34A", label: "Excellent" };
  if (score >= 50) return { bg: "#F59E0B22", color: "#D97706", label: "Good" };
  if (score >= 30) return { bg: "#F9731622", color: "#EA580C", label: "Fair" };
  return { bg: "#EF444422", color: "#DC2626", label: "Poor" };
}

function NutrientBar({ label, value, max, unit, color }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1 text-muted-foreground">
        <span>{label}</span>
        <span className="font-semibold text-foreground">{value}{unit}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function Scan() {
  const [tab, setTab] = useState("upload");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [mealType, setMealType] = useState(defaultMealType());
  const [showNutrition, setShowNutrition] = useState(true);
  const [saving, setSaving] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => () => stopCam(), []);

  const stopCam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startCam = async () => {
    try {
      stopCam();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      toast.error("Camera not available. Use Upload instead.");
    }
  };

  useEffect(() => {
    if (tab === "webcam") startCam();
    else stopCam();
  }, [tab]);

  const captureFromWebcam = async () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d").drawImage(v, 0, 0);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.9));
    const f = new File([blob], "capture.jpg", { type: "image/jpeg" });
    setFile(f);
    setPreviewUrl(URL.createObjectURL(blob));
    stopCam();
    setTab("preview");
  };

  const onPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setTab("preview");
  };

  const reset = () => {
    setFile(null); setResult(null); setPreviewUrl(null); setTab("upload");
  };

  const analyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/predict", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const save = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await api.post("/history", {
        food_name: result.food_name,
        confidence: Number(result.confidence) || 0,
        calories: Number(result.calories) || 0,
        protein: Number(result.protein) || 0,
        carbs: Number(result.carbs) || 0,
        fat: Number(result.fat) || 0,
        fiber: Number(result.fiber) || 0,
        sugar: Number(result.sugar) || 0,
        sodium: Number(result.sodium) || 0,
        serving_size: result.serving_size || "",
        healthy_score: Number(result.healthy_score) || 0,
        meal_type: mealType,
        image_b64: result.image_b64,
        items: result.items || [],
      });
      toast.success("Saved to your history!");
      nav("/dashboard");
    } catch {
      toast.error("Could not save meal");
    } finally { setSaving(false); }
  };

  const scoreStyle = result ? scoreColor(result.healthy_score || 0) : null;

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="fade-up">
        <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Scan</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-2">What did you eat?</h1>
        <p className="text-muted-foreground mt-1.5">Upload a photo or use your camera. AI does the rest.</p>
      </div>

      {!result && (
        <div className="bg-white border rounded-3xl overflow-hidden fade-up-1">
          {!previewUrl && (
            <div className="flex border-b">
              {[
                { id: "upload", icon: Upload, label: "Upload" },
                { id: "webcam", icon: Camera, label: "Webcam" },
              ].map((t) => (
                <button
                  key={t.id}
                  data-testid={`tab-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-4 inline-flex items-center justify-center gap-2 text-sm transition-colors ${
                    tab === t.id ? "text-primary border-b-2 border-primary font-semibold" : "text-muted-foreground"
                  }`}
                >
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </div>
          )}

          {tab === "upload" && !previewUrl && (
            <label className="block p-12 cursor-pointer hover:bg-secondary/50 transition-colors">
              <input data-testid="upload-input" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPick} />
              <div className="border-2 border-dashed border-border rounded-3xl py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-accent/30 grid place-items-center mx-auto mb-5">
                  <Upload className="w-7 h-7 text-primary" />
                </div>
                <p className="font-display text-xl">Drop or browse</p>
                <p className="text-sm text-muted-foreground mt-1">JPG / PNG / WEBP · up to 10MB</p>
              </div>
            </label>
          )}

          {tab === "webcam" && !previewUrl && (
            <div className="p-6">
              <div className="rounded-2xl overflow-hidden bg-black aspect-video">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              </div>
              <div className="mt-5 flex justify-center">
                <button
                  data-testid="capture-btn"
                  onClick={captureFromWebcam}
                  className="bg-primary text-white px-8 py-3 rounded-full font-medium hover:-translate-y-0.5 transition-transform inline-flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" /> Capture
                </button>
              </div>
            </div>
          )}

          {previewUrl && (
            <div>
              <img src={previewUrl} alt="preview" className="w-full max-h-[55vh] object-cover" />
              <div className="p-6 flex flex-wrap items-center gap-3">
                <button
                  data-testid="analyze-btn"
                  onClick={analyze}
                  disabled={analyzing}
                  className="bg-primary text-white px-6 py-3 rounded-full font-medium disabled:opacity-60 hover:-translate-y-0.5 transition-transform inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> {analyzing ? "Analyzing…" : "Analyze with AI"}
                </button>
                <button
                  data-testid="retake-btn"
                  onClick={reset}
                  className="border bg-white px-6 py-3 rounded-full font-medium hover:bg-secondary inline-flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Different photo
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {result && (
        <div data-testid="result-card" className="bg-white border rounded-3xl overflow-hidden fade-up">
          {result.image_b64 && (
            <img
              src={`data:image/jpeg;base64,${result.image_b64}`}
              alt={result.food_name}
              className="w-full max-h-[40vh] object-cover"
            />
          )}
          <div className="p-7 md:p-9">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
              <div>
                <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground">Detected</p>
                <h2 data-testid="result-food-name" className="font-display text-3xl sm:text-4xl tracking-tight mt-2">
                  {result.food_name}
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  {result.serving_size && `${result.serving_size} · `}
                  {result.prediction_time}s · {Math.round((result.confidence || 0) * 100)}% match
                </p>
              </div>
              <div
                className="rounded-2xl px-5 py-4 text-center"
                style={{ background: scoreStyle?.bg }}
              >
                <p className="text-xs font-semibold text-muted-foreground mb-1">Health Score</p>
                <p data-testid="healthy-score" className="font-display text-5xl font-bold" style={{ color: scoreStyle?.color }}>
                  {result.healthy_score}
                </p>
                <p className="text-sm font-semibold mt-1" style={{ color: scoreStyle?.color }}>{scoreStyle?.label}</p>
              </div>
            </div>

            {/* Health explanation */}
            {result.health_explanation && (
              <div className="flex gap-3 p-4 rounded-2xl bg-secondary/60 mb-6 text-sm">
                <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">{result.health_explanation}</p>
              </div>
            )}

            {/* Multi-food items */}
            {result.items?.length > 1 && (
              <div className="mb-6 p-4 rounded-2xl border bg-secondary/30">
                <p className="text-xs tracking-[0.18em] uppercase font-semibold text-muted-foreground mb-3">
                  🍽️ Multiple foods detected
                </p>
                <div className="space-y-2">
                  {result.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 text-sm">
                      <span className="font-medium">{item.name}</span>
                      <div className="text-right text-muted-foreground">
                        <span>{item.calories} kcal</span>
                        {item.protein > 0 && <span className="ml-2 text-xs">P:{item.protein}g</span>}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between bg-primary/10 rounded-xl px-4 py-2.5 text-sm font-semibold">
                    <span>Total</span>
                    <span>{Math.round(result.calories)} kcal</span>
                  </div>
                </div>
              </div>
            )}

            {/* Nutrition toggle */}
            <button
              onClick={() => setShowNutrition(v => !v)}
              className="w-full flex items-center justify-between mb-4 group"
            >
              <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                Full Nutrition Info
              </p>
              {showNutrition ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {showNutrition && (
              <div className="mb-6">
                {/* Primary grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { l: "Calories", v: Math.round(result.calories || 0), u: "kcal", c: "#2C4C3B" },
                    { l: "Protein", v: Math.round(result.protein || 0), u: "g", c: "#D96C4A" },
                    { l: "Carbs", v: Math.round(result.carbs || 0), u: "g", c: "#E6B87A" },
                    { l: "Fat", v: Math.round(result.fat || 0), u: "g", c: "#8DAA91" },
                  ].map((m) => (
                    <div key={m.l} className="bg-secondary rounded-2xl py-4 px-4 text-center">
                      <p className="font-display text-2xl font-bold" style={{ color: m.c }}>
                        {m.v}<span className="text-sm text-muted-foreground font-normal ml-0.5">{m.u}</span>
                      </p>
                      <p className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground mt-1">{m.l}</p>
                    </div>
                  ))}
                </div>

                {/* Secondary nutrients */}
                <div className="bg-secondary/40 rounded-2xl p-4 space-y-3">
                  <NutrientBar label="Fiber" value={Math.round(result.fiber || 0)} max={38} unit="g" color="#22C55E" />
                  <NutrientBar label="Sugar" value={Math.round(result.sugar || 0)} max={50} unit="g" color="#F59E0B" />
                  <NutrientBar label="Sodium" value={Math.round(result.sodium || 0)} max={2300} unit="mg" color="#6366F1" />
                </div>

                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Confidence: {Math.round((result.confidence || 0) * 100)}% · Analysis: {result.prediction_time}s
                </p>
              </div>
            )}

            {/* Save as */}
            <div className="border-t pt-6">
              <p className="text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground mb-3">Save as</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {MEAL_TYPES.map((m) => (
                  <button
                    key={m}
                    data-testid={`meal-type-${m}`}
                    onClick={() => setMealType(m)}
                    className={`px-5 py-2 rounded-full text-sm capitalize transition-all ${
                      mealType === m ? "bg-primary text-white" : "bg-secondary text-foreground/70 hover:bg-secondary/70"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  data-testid="save-meal-btn"
                  onClick={save}
                  disabled={saving}
                  className="bg-primary text-white px-7 py-3 rounded-full font-medium hover:-translate-y-0.5 transition-transform inline-flex items-center gap-2 disabled:opacity-60"
                >
                  <Check className="w-4 h-4" /> {saving ? "Saving…" : "Save meal"}
                </button>
                <button
                  data-testid="discard-btn"
                  onClick={reset}
                  className="border bg-white px-7 py-3 rounded-full font-medium hover:bg-secondary inline-flex items-center gap-2"
                >
                  <X className="w-4 h-4" /> Discard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
