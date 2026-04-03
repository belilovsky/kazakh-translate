/**
 * PipelineViz v7.1 — Full diagnostic pipeline with text transformation tracking.
 * Shows HOW the text transforms at every stage: engines → critic → ensemble → self-eval.
 */
import { useEffect, useRef, useState } from "react";
import {
  Check, X, Loader2, Sparkles, Timer,
  Zap, Brain, ShieldCheck, BarChart3,
  ChevronDown, ChevronUp, MessageSquareText,
  AlertTriangle, Eye, ArrowRight, Diff,
} from "lucide-react";

export interface EngineStatus {
  status: "idle" | "running" | "done" | "error";
  latencyMs?: number;
}
export interface PipelinePhase { id: string; label: string; }

interface MQMError {
  category: string;
  type: string;
  severity: string;
  description: string;
}

interface EvalDetails {
  score?: number;
  issues?: string[];
  improved?: boolean;
  text?: string;
  mqmScore?: number;
  mqmErrors?: MQMError[];
}

interface PipelineVizProps {
  isRunning: boolean;
  elapsedMs: number;
  totalMs: number | null;
  phase: string;
  engineStatuses: Record<string, EngineStatus>;
  engineLabels: Record<string, string>;
  phases?: PipelinePhase[];
  compact?: boolean;
  engineTexts?: Record<string, string>;
  critiqueText?: string;
  ensembleText?: string;
  evalDetails?: EvalDetails;
}

/* ── Particle background ────────────────────────────────── */
function ParticleBg({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const anim = useRef(0);
  const dots = useRef<Array<{ x: number; y: number; vx: number; vy: number; a: number; r: number }>>([]);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    c.width = c.offsetWidth * 2;
    c.height = c.offsetHeight * 2;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    const w = c.offsetWidth, h = c.offsetHeight;
    const run = () => {
      ctx.clearRect(0, 0, w, h);
      if (active && Math.random() < 0.2) {
        dots.current.push({
          x: Math.random() * w, y: h,
          vx: (Math.random() - 0.5) * 0.6, vy: -0.4 - Math.random() * 1.2,
          a: 0.25 + Math.random() * 0.4, r: 1 + Math.random() * 1.5,
        });
      }
      for (let i = dots.current.length - 1; i >= 0; i--) {
        const p = dots.current[i];
        p.x += p.vx; p.y += p.vy; p.a -= 0.004;
        if (p.a <= 0) { dots.current.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,155,55,${p.a * 0.35})`;
        ctx.fill();
      }
      anim.current = requestAnimationFrame(run);
    };
    run();
    return () => cancelAnimationFrame(anim.current);
  }, [active]);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none opacity-50" />;
}

/* ── Collapsible section ────────────────────────────────── */
function Sec({
  title, icon, badge, open: defaultOpen, children, accent = "muted",
}: {
  title: string; icon: React.ReactNode; badge?: React.ReactNode;
  open?: boolean; children: React.ReactNode;
  accent?: "muted" | "emerald" | "amber" | "primary" | "red";
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const bdr: Record<string, string> = { muted: "border-border/20", emerald: "border-emerald-500/20", amber: "border-amber-500/20", primary: "border-primary/20", red: "border-red-500/20" };
  const bg: Record<string, string> = { muted: "bg-muted/5", emerald: "bg-emerald-500/5", amber: "bg-amber-500/5", primary: "bg-primary/5", red: "bg-red-500/5" };
  return (
    <div className={`rounded-lg border ${bdr[accent]} ${bg[accent]} overflow-hidden`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/10 transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">{title}</span>
          {badge}
        </div>
        {open ? <ChevronUp className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />}
      </button>
      {open && <div className="px-3 pb-3 pt-1">{children}</div>}
    </div>
  );
}

/* ── Stage label with arrow ─────────────────────────────── */
function StageArrow({ label, num }: { label: string; num: number }) {
  return (
    <div className="flex items-center gap-2 my-3">
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/15">
          <span className="text-[9px] font-bold font-display text-primary">{num}</span>
        </div>
        <span className="text-[10px] font-display font-bold text-primary uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-primary/15 to-transparent" />
    </div>
  );
}

/* ── Text comparison block ──────────────────────────────── */
function TextBlock({ label, text, accent = "muted" }: { label: string; text: string; accent?: string }) {
  const colors: Record<string, string> = {
    muted: "bg-muted/10 border-border/20",
    emerald: "bg-emerald-500/5 border-emerald-500/15",
    primary: "bg-primary/5 border-primary/15",
    amber: "bg-amber-500/5 border-amber-500/15",
  };
  return (
    <div className={`rounded-md border ${colors[accent] ?? colors.muted} px-2.5 py-2`}>
      <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">{label}</span>
      <p className="text-[11px] text-foreground leading-relaxed">{text}</p>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────── */
export default function PipelineViz({
  isRunning, elapsedMs, totalMs, phase, engineStatuses, engineLabels,
  engineTexts = {}, critiqueText = "", ensembleText = "", evalDetails = {},
}: PipelineVizProps) {
  const ms = isRunning ? elapsedMs : (totalMs ?? 0);
  const engines = Object.keys(engineLabels).filter(k => k !== "ensemble" && k !== "deepl");
  const done = Object.values(engineStatuses).filter(s => s.status === "done").length;
  const errs = Object.values(engineStatuses).filter(s => s.status === "error").length;
  const total = engines.length;
  const fin = phase === "done" && !isRunning;

  const pi: Record<string, number> = { engines: 0, critic: 1, ensemble: 1, selfeval: 2, done: 3 };
  const idx = pi[phase] ?? 0;

  const steps = [
    { id: "engines", label: "Движки", sub: `${done}/${total}`, icon: <Zap className="h-3 w-3" /> },
    { id: "ensemble", label: "Критик + Ensemble", sub: "Gemini + GPT-4o", icon: <Brain className="h-3 w-3" /> },
    { id: "selfeval", label: "Самооценка", sub: "Контроль", icon: <ShieldCheck className="h-3 w-3" /> },
    { id: "done", label: "Готово", sub: "", icon: <Sparkles className="h-3 w-3" /> },
  ];

  const sortedDone = engines
    .filter(e => engineStatuses[e]?.status === "done" && engineStatuses[e]?.latencyMs)
    .sort((a, b) => (engineStatuses[a]?.latencyMs ?? 0) - (engineStatuses[b]?.latencyMs ?? 0));
  const maxLat = Math.max(...sortedDone.map(e => engineStatuses[e]?.latencyMs ?? 0), 1);

  const engineTextEntries = engines.filter(eng => engineStatuses[eng]?.status === "done" && engineTexts[eng]);
  const errorEntries = Object.entries(engineTexts).filter(([k]) => engineStatuses[k]?.status === "error");

  // Did self-eval change the text?
  const selfEvalChanged = evalDetails.improved && evalDetails.text && evalDetails.text !== ensembleText;

  return (
    <div
      className={`mt-4 rounded-2xl overflow-hidden relative transition-all duration-500 glass-card ${fin ? "ring-1 ring-emerald-500/15" : ""}`}
      data-testid="pipeline-viz"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-card via-background/90 to-card/80" />
      <ParticleBg active={isRunning} />
      {isRunning && (
        <div className="absolute top-0 left-0 right-0 h-[2px] z-20 overflow-hidden">
          <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary/70 to-transparent animate-shimmer" />
        </div>
      )}

      <div className="relative z-10 p-4 sm:p-5">

        {/* ═══ Header ═══ */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isRunning
              ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
              : fin
                ? <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" /></div>
                : null}
            <span className="text-[11px] font-display font-bold text-foreground uppercase tracking-[0.1em]">Пайплайн перевода</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5 text-muted-foreground" />
            <span className={`text-lg font-mono font-bold tabular-nums ${fin ? "text-emerald-500" : "text-primary"}`}>
              {(ms / 1000).toFixed(1)}<span className="text-[9px] font-normal text-muted-foreground ml-0.5">с</span>
            </span>
          </div>
        </div>

        {/* ═══ Phase stepper ═══ */}
        <div className="grid grid-cols-[36px_1fr_36px_1fr_36px_1fr_36px] items-start mb-5">
          {steps.map((s, i) => {
            const active = i === idx && isRunning;
            const ok = i < idx || fin;
            return (
              <div key={s.id} className="contents">
                <div className="flex flex-col items-center gap-1">
                  <div className="relative flex items-center justify-center">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500
                      ${ok ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                        : active ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                        : "bg-muted/50 text-muted-foreground/25"}`}>
                      {ok ? <Check className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : s.icon}
                    </div>
                    {active && <div className="absolute inset-[-3px] rounded-xl border-2 border-primary/30 animate-ping opacity-20" />}
                  </div>
                  <span className={`text-[8px] font-semibold text-center leading-tight whitespace-nowrap
                    ${ok ? "text-emerald-600 dark:text-emerald-400" : active ? "text-primary" : "text-muted-foreground/30"}`}>
                    {s.label}
                  </span>
                  {(ok || active) && s.sub && <span className="text-[7px] text-muted-foreground whitespace-nowrap">{s.sub}</span>}
                </div>
                {i < steps.length - 1 && (
                  <div className="px-2 flex items-center h-8">
                    <div className="w-full h-[3px] rounded-full bg-muted/25 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700
                        ${ok ? "w-full bg-emerald-500" : active ? "w-1/2 bg-primary animate-pulse" : "w-0"}`} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* STAGE 1: ENGINES                                       */}
        {/* ═══════════════════════════════════════════════════════ */}
        <StageArrow label="Параллельный перевод" num={1} />

        {/* Engine grid */}
        <div className="mb-2">
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${Math.min(engines.length, 9)}, minmax(0, 1fr))` }}
          >
            {engines.map(eng => {
              const st = engineStatuses[eng];
              const d = st?.status === "done"; const e = st?.status === "error"; const r = st?.status === "running";
              return (
                <div key={eng} className={`flex flex-col items-center justify-start gap-1 py-2 rounded-lg transition-all duration-300 min-h-[64px]
                  ${d ? "bg-emerald-500/8 ring-1 ring-emerald-500/20" : e ? "bg-red-500/8 ring-1 ring-red-500/20" : r ? "bg-primary/5 ring-1 ring-primary/15" : "bg-muted/15"}`}>
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all duration-500
                    ${d ? "bg-emerald-500 text-white" : e ? "bg-red-500 text-white" : r ? "bg-primary/15 text-primary" : "bg-muted/40 text-muted-foreground/15"}`}>
                    {d ? <Check className="h-3 w-3" /> : e ? <X className="h-3 w-3" /> : r ? <Loader2 className="h-3 w-3 animate-spin" /> : <div className="w-1 h-1 rounded-full bg-current" />}
                  </div>
                  <span className={`text-[8px] font-medium text-center ${d ? "text-foreground" : e ? "text-red-400" : r ? "text-foreground/60" : "text-muted-foreground/20"}`}>
                    {engineLabels[eng]?.split(" ")[0]}
                  </span>
                  <span className="h-3 flex items-center">
                    {d && st?.latencyMs != null && <span className="text-[7px] font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{st.latencyMs < 1000 ? `${st.latencyMs}ms` : `${(st.latencyMs / 1000).toFixed(1)}с`}</span>}
                    {e && <span className="text-[7px] text-red-400">ошибка</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Engine texts */}
        {engineTextEntries.length > 0 && (
          <div className="mb-3">
            <Sec
              title={`Ответы движков (${engineTextEntries.length})`}
              icon={<MessageSquareText className="h-3 w-3 text-muted-foreground" />}
              open={false}
            >
              <div className="space-y-1">
                {engineTextEntries
                  .sort((a, b) => (engineStatuses[a]?.latencyMs ?? 0) - (engineStatuses[b]?.latencyMs ?? 0))
                  .map(eng => (
                    <div key={eng} className="grid grid-cols-[64px_1fr] gap-2 items-start">
                      <span className="text-[9px] font-medium text-muted-foreground text-right pt-1 tabular-nums">{engineLabels[eng]?.split(" ")[0]}</span>
                      <span className="text-[10px] text-foreground leading-snug bg-background/50 rounded px-2 py-1">{engineTexts[eng]?.replace(/—/g, "–")}</span>
                    </div>
                  ))}
                {errorEntries.length > 0 && errorEntries.map(([eng, txt]) => (
                  <div key={eng} className="grid grid-cols-[64px_1fr] gap-2 items-start opacity-60">
                    <span className="text-[9px] font-medium text-red-400 text-right pt-1">{engineLabels[eng]?.split(" ")[0]}</span>
                    <span className="text-[9px] text-red-400/70 truncate pt-1">{txt}</span>
                  </div>
                ))}
              </div>
            </Sec>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* STAGE 2: CRITIC + ENSEMBLE                             */}
        {/* ═══════════════════════════════════════════════════════ */}
        {(critiqueText || ensembleText) && (
          <>
            <StageArrow label="Анализ и синтез" num={2} />
            <div className="space-y-2 mb-3">

              {/* Critic */}
              {critiqueText && (
                <Sec
                  title="Рецензия критика (Gemini 2.5 Flash)"
                  icon={<Eye className="h-3 w-3 text-amber-500" />}
                  open={true}
                  accent="amber"
                >
                  <p className="text-[10px] text-foreground/80 leading-relaxed whitespace-pre-wrap">{critiqueText}</p>
                </Sec>
              )}

              {/* Ensemble output */}
              {ensembleText && (
                <Sec
                  title="Синтез Ensemble (GPT-4o)"
                  icon={<Brain className="h-3 w-3 text-primary" />}
                  open={true}
                  accent="primary"
                  badge={<span className="text-[8px] text-primary/60">{engineTextEntries.length} вариантов + рецензия → 1 лучший</span>}
                >
                  <TextBlock label="Результат ensemble" text={ensembleText.replace(/—/g, "–")} accent="primary" />
                </Sec>
              )}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* STAGE 3: SELF-EVALUATION                               */}
        {/* ═══════════════════════════════════════════════════════ */}
        {evalDetails.score !== undefined && (
          <>
            <StageArrow label="Самооценка и улучшение" num={3} />
            <div className="mb-3">
              <Sec
                title="MQM Контроль качества (GPT-4o)"
                icon={<ShieldCheck className="h-3 w-3 text-emerald-500" />}
                open={true}
                accent={evalDetails.score >= 8 ? "emerald" : evalDetails.score >= 6 ? "amber" : "red"}
                badge={
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold font-mono tabular-nums ${
                      evalDetails.score >= 8 ? "text-emerald-500" : evalDetails.score >= 6 ? "text-amber-500" : "text-red-500"
                    }`}>
                      {evalDetails.score}/10
                    </span>
                    {evalDetails.mqmScore !== undefined && (
                      <span className="text-[8px] text-muted-foreground/60 font-mono">MQM {evalDetails.mqmScore.toFixed(1)}</span>
                    )}
                  </div>
                }
              >
                <div className="space-y-2">
                  {/* Score bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2.5 rounded-full bg-muted/20 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(evalDetails.score / 10) * 100}%`,
                          background: evalDetails.score >= 8 ? "linear-gradient(90deg, #10b981, #34d399)"
                            : evalDetails.score >= 6 ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                            : "linear-gradient(90deg, #ef4444, #f87171)",
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono tabular-nums text-muted-foreground">{evalDetails.score}/10</span>
                  </div>

                  {/* Issues */}
                  {evalDetails.issues && evalDetails.issues.length > 0 && (
                    <div className="rounded-md bg-amber-500/5 border border-amber-500/15 px-2.5 py-2">
                      <div className="flex items-center gap-1 mb-1">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">Найденные проблемы:</span>
                      </div>
                      <ul className="space-y-0.5">
                        {evalDetails.issues.map((issue, i) => (
                          <li key={i} className="text-[10px] text-foreground/70 flex items-start gap-1.5">
                            <span className="text-amber-500 shrink-0 mt-0.5">•</span>
                            <span className="leading-snug">{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Text comparison: ensemble vs improved */}
                  {selfEvalChanged && ensembleText && evalDetails.text && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1">
                        <Diff className="h-3 w-3 text-primary" />
                        <span className="text-[9px] font-bold text-primary">Текст изменён самооценкой:</span>
                      </div>
                      <TextBlock label="До (ensemble)" text={ensembleText} accent="muted" />
                      <div className="flex justify-center"><ArrowRight className="h-3 w-3 text-emerald-500 rotate-90" /></div>
                      <TextBlock label="После (улучшенный)" text={evalDetails.text} accent="emerald" />
                    </div>
                  )}

                  {/* MQM Error breakdown */}
                  {evalDetails.mqmErrors && evalDetails.mqmErrors.length > 0 && (
                    <div className="rounded-md bg-muted/10 border border-border/20 px-2.5 py-2">
                      <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">MQM ошибки</div>
                      <div className="space-y-1">
                        {evalDetails.mqmErrors.map((err, i) => {
                          const sevColor = err.severity === "critical" ? "text-red-500 bg-red-500/10" : err.severity === "major" ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground bg-muted/20";
                          const catLabel: Record<string, string> = { accuracy: "Дәлдік", fluency: "Тіл", terminology: "Термин", style: "Стиль" };
                          return (
                            <div key={i} className="flex items-start gap-1.5 text-[9px]">
                              <span className={`px-1 py-0.5 rounded text-[7px] font-bold uppercase ${sevColor} shrink-0`}>{err.severity}</span>
                              <span className="text-muted-foreground shrink-0">{catLabel[err.category] ?? err.category}/{err.type}</span>
                              <span className="text-foreground/70">{err.description}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!selfEvalChanged && (!evalDetails.mqmErrors || evalDetails.mqmErrors.length === 0) && (
                    <p className="text-[10px] text-muted-foreground/70 italic">Текст не требовал изменений – ensemble дал качественный результат</p>
                  )}
                </div>
              </Sec>
            </div>
          </>
        )}

        {/* ═══ Latency bar chart ═══ */}
        {fin && sortedDone.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart3 className="h-3 w-3 text-muted-foreground" />
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.08em]">Скорость ответа</span>
            </div>
            <div className="grid grid-cols-[60px_1fr_44px] gap-x-2 gap-y-[3px] items-center">
              {sortedDone.map((eng, i) => {
                const lat = engineStatuses[eng]?.latencyMs ?? 0;
                const pct = Math.max(4, (lat / maxLat) * 100);
                return (
                  <div key={eng} className="contents">
                    <span className="text-[9px] font-medium text-muted-foreground text-right truncate">{engineLabels[eng]?.split(" ")[0]}</span>
                    <div className="h-[7px] rounded-full bg-muted/15 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{
                        width: `${pct}%`,
                        background: lat < 500 ? "linear-gradient(90deg, #10b981, #34d399)" : lat < 2000 ? "linear-gradient(90deg, #c89b37, #d4a843)" : lat < 5000 ? "linear-gradient(90deg, #f59e0b, #fbbf24)" : "linear-gradient(90deg, #ef4444, #f87171)",
                        transitionDelay: `${i * 80}ms`,
                      }} />
                    </div>
                    <span className={`text-[9px] font-mono tabular-nums text-right ${lat < 1000 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                      {lat < 1000 ? `${lat}ms` : `${(lat / 1000).toFixed(1)}с`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ Footer ═══ */}
        <div className={`flex items-center justify-between h-9 px-3 rounded-xl transition-all duration-500
          ${fin ? "bg-gradient-to-r from-emerald-500/5 to-primary/5 border border-emerald-500/10" : "bg-muted/5 border border-border/10"}`}>
          <div className="flex items-center gap-4 text-[10px]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-muted-foreground">Движки</span>
              <span className="font-bold text-foreground tabular-nums">{done}/{total}</span>
            </span>
            {errs > 0 && <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" /><span className="text-muted-foreground">Ошибки</span><span className="font-bold text-red-400 tabular-nums">{errs}</span></span>}
            {fin && <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" /><span className="text-muted-foreground">Время</span><span className="font-bold text-foreground tabular-nums">{((totalMs ?? 0) / 1000).toFixed(1)}с</span></span>}
          </div>
          {fin && <div className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /><span className="text-[10px] font-bold text-primary">Ensemble AI</span></div>}
          {isRunning && <span className="text-[10px] text-muted-foreground animate-pulse">{idx === 0 ? "Переводим..." : idx === 1 ? "Синтезируем..." : "Проверяем..."}</span>}
        </div>
      </div>
    </div>
  );
}
