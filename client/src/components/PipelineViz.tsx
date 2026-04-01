/**
 * PipelineViz v7 — Detailed diagnostic pipeline.
 * Shows intermediate data at every stage so user can see where quality issues arise.
 */
import { useEffect, useRef, useState } from "react";
import {
  Check, X, Loader2, Sparkles, Timer,
  Zap, Brain, ShieldCheck, BarChart3,
  ChevronDown, ChevronUp, MessageSquareText,
  ArrowDown, AlertTriangle, Eye,
} from "lucide-react";

export interface EngineStatus {
  status: "idle" | "running" | "done" | "error";
  latencyMs?: number;
}
export interface PipelinePhase { id: string; label: string; }

interface EvalDetails {
  score?: number;
  issues?: string[];
  improved?: boolean;
  text?: string;
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
  /** Diagnostic data */
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
    const dpr = 2;
    c.width = c.offsetWidth * dpr;
    c.height = c.offsetHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
      const d = dots.current;
      for (let i = d.length - 1; i >= 0; i--) {
        const p = d[i];
        p.x += p.vx; p.y += p.vy; p.a -= 0.004;
        if (p.a <= 0) { d.splice(i, 1); continue; }
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
function Section({
  title, icon, badge, defaultOpen, children, color = "muted",
}: {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  color?: "muted" | "emerald" | "amber" | "primary" | "red";
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const borderColors: Record<string, string> = {
    muted: "border-border/20",
    emerald: "border-emerald-500/20",
    amber: "border-amber-500/20",
    primary: "border-primary/20",
    red: "border-red-500/20",
  };
  const bgColors: Record<string, string> = {
    muted: "bg-muted/5",
    emerald: "bg-emerald-500/5",
    amber: "bg-amber-500/5",
    primary: "bg-primary/5",
    red: "bg-red-500/5",
  };
  return (
    <div className={`rounded-lg border ${borderColors[color]} ${bgColors[color]} overflow-hidden transition-all`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
          {badge}
        </div>
        {open ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
      </button>
      {open && <div className="px-3 pb-3 pt-1">{children}</div>}
    </div>
  );
}

/* ── Phase stepper (compact) ────────────────────────────── */
function PhaseStepper({ idx, fin, isRunning, steps }: {
  idx: number;
  fin: boolean;
  isRunning: boolean;
  steps: Array<{ id: string; label: string; sub: string; icon: React.ReactNode }>;
}) {
  return (
    <div className="grid grid-cols-[36px_1fr_36px_1fr_36px_1fr_36px] items-start mb-5">
      {steps.map((s, i) => {
        const active = i === idx && isRunning;
        const ok = i < idx || fin;
        return (
          <div key={s.id} className="contents">
            <div className="flex flex-col items-center gap-1">
              <div className="relative flex items-center justify-center">
                <div className={`
                  w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500
                  ${ok ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                    : active ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "bg-muted/50 text-muted-foreground/25"}
                `}>
                  {ok ? <Check className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : s.icon}
                </div>
                {active && <div className="absolute inset-[-3px] rounded-xl border-2 border-primary/30 animate-ping opacity-20" />}
              </div>
              <span className={`text-[8px] font-semibold text-center leading-tight whitespace-nowrap
                ${ok ? "text-emerald-600 dark:text-emerald-400" : active ? "text-primary" : "text-muted-foreground/30"}`}>
                {s.label}
              </span>
              {(ok || active) && s.sub && (
                <span className="text-[7px] text-muted-foreground text-center whitespace-nowrap">{s.sub}</span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div className="px-2 flex items-center h-8">
                <div className="w-full h-[3px] rounded-full bg-muted/25 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700
                    ${ok ? "w-full bg-emerald-500"
                      : active ? "w-1/2 bg-primary animate-pulse"
                      : "w-0"}`}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
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

  // How many engine texts we have
  const engineTextCount = Object.keys(engineTexts).filter(k => engineStatuses[k]?.status === "done").length;
  const errorTexts = Object.entries(engineTexts).filter(([k]) => engineStatuses[k]?.status === "error");

  return (
    <div
      className={`mt-3 rounded-2xl overflow-hidden relative transition-all duration-500 ${fin ? "border border-emerald-500/20" : "border border-border/30"}`}
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
            <span className="text-[11px] font-bold text-foreground uppercase tracking-[0.08em]">Пайплайн перевода</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5 text-muted-foreground" />
            <span className={`text-lg font-mono font-bold tabular-nums ${fin ? "text-emerald-500" : "text-primary"}`}>
              {(ms / 1000).toFixed(1)}<span className="text-[9px] font-normal text-muted-foreground ml-0.5">с</span>
            </span>
          </div>
        </div>

        {/* ═══ Phase stepper ═══ */}
        <PhaseStepper idx={idx} fin={fin} isRunning={isRunning} steps={steps} />

        {/* ═══ STAGE 1: Engine grid + texts ═══ */}
        <div className="space-y-2 mb-3">
          {/* Engine status grid (always visible) */}
          <div>
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.08em] mb-2">Движки перевода</div>
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${Math.min(engines.length, 9)}, minmax(0, 1fr))` }}
            >
              {engines.map(eng => {
                const st = engineStatuses[eng];
                const d = st?.status === "done";
                const e = st?.status === "error";
                const r = st?.status === "running";
                return (
                  <div key={eng} className={`
                    flex flex-col items-center justify-start gap-1 py-2 rounded-lg transition-all duration-300 min-h-[68px]
                    ${d ? "bg-emerald-500/8 ring-1 ring-emerald-500/20"
                      : e ? "bg-red-500/8 ring-1 ring-red-500/20"
                      : r ? "bg-primary/5 ring-1 ring-primary/15"
                      : "bg-muted/15"}
                  `}>
                    <div className={`
                      w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all duration-500
                      ${d ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/25"
                        : e ? "bg-red-500 text-white"
                        : r ? "bg-primary/15 text-primary"
                        : "bg-muted/40 text-muted-foreground/15"}
                    `}>
                      {d ? <Check className="h-3 w-3" />
                        : e ? <X className="h-3 w-3" />
                        : r ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <div className="w-1 h-1 rounded-full bg-current" />}
                    </div>
                    <span className={`text-[8px] font-medium leading-tight text-center
                      ${d ? "text-foreground" : e ? "text-red-400" : r ? "text-foreground/60" : "text-muted-foreground/20"}`}>
                      {engineLabels[eng]?.split(" ")[0]}
                    </span>
                    <span className="h-3 flex items-center">
                      {d && st?.latencyMs != null && (
                        <span className="text-[7px] font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                          {st.latencyMs < 1000 ? `${st.latencyMs}ms` : `${(st.latencyMs / 1000).toFixed(1)}с`}
                        </span>
                      )}
                      {e && <span className="text-[7px] text-red-400">ошибка</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Engine translations — collapsible diagnostic detail */}
          {engineTextCount > 0 && (
            <Section
              title={`Ответы движков (${engineTextCount})`}
              icon={<MessageSquareText className="h-3 w-3 text-muted-foreground" />}
              defaultOpen={false}
              color="muted"
            >
              <div className="space-y-1.5">
                {engines
                  .filter(eng => engineStatuses[eng]?.status === "done" && engineTexts[eng])
                  .sort((a, b) => (engineStatuses[a]?.latencyMs ?? 0) - (engineStatuses[b]?.latencyMs ?? 0))
                  .map(eng => (
                    <div key={eng} className="flex gap-2 items-start">
                      <span className="text-[9px] font-medium text-muted-foreground w-[60px] shrink-0 text-right pt-0.5 tabular-nums">
                        {engineLabels[eng]?.split(" ")[0]}
                      </span>
                      <span className="text-[10px] text-foreground leading-snug flex-1 bg-background/50 rounded px-2 py-1">
                        {engineTexts[eng]}
                      </span>
                    </div>
                  ))}
                {errorTexts.length > 0 && (
                  <div className="mt-1 pt-1 border-t border-border/10">
                    {errorTexts.map(([eng, txt]) => (
                      <div key={eng} className="flex gap-2 items-start">
                        <span className="text-[9px] font-medium text-red-400 w-[60px] shrink-0 text-right pt-0.5">
                          {engineLabels[eng]?.split(" ")[0]}
                        </span>
                        <span className="text-[9px] text-red-400/70 leading-snug flex-1 truncate">{txt}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Section>
          )}
        </div>

        {/* ═══ STAGE 2: Critic + Ensemble ═══ */}
        {(critiqueText || ensembleText) && (
          <div className="space-y-2 mb-3">
            {/* Critic review from Gemini */}
            {critiqueText && (
              <Section
                title="Критик (Gemini)"
                icon={<Eye className="h-3 w-3 text-amber-500" />}
                defaultOpen={false}
                color="amber"
                badge={<span className="text-[8px] text-amber-500 font-mono">рецензия</span>}
              >
                <p className="text-[10px] text-foreground/80 leading-relaxed whitespace-pre-wrap">{critiqueText}</p>
              </Section>
            )}

            {/* Ensemble result */}
            {ensembleText && (
              <Section
                title="Ensemble (GPT-4o)"
                icon={<Brain className="h-3 w-3 text-primary" />}
                defaultOpen={false}
                color="primary"
                badge={<span className="text-[8px] text-primary font-mono">синтез</span>}
              >
                <p className="text-[10px] text-foreground leading-relaxed bg-background/50 rounded px-2 py-1.5">{ensembleText}</p>
              </Section>
            )}
          </div>
        )}

        {/* ═══ STAGE 3: Self-evaluation ═══ */}
        {evalDetails.score !== undefined && (
          <div className="mb-3">
            <Section
              title="Самооценка"
              icon={<ShieldCheck className="h-3 w-3 text-emerald-500" />}
              defaultOpen={evalDetails.improved || (evalDetails.issues && evalDetails.issues.length > 0) ? true : false}
              color={evalDetails.score >= 8 ? "emerald" : evalDetails.score >= 6 ? "amber" : "red"}
              badge={
                <span className={`text-[9px] font-bold font-mono tabular-nums ${
                  evalDetails.score >= 8 ? "text-emerald-500" : evalDetails.score >= 6 ? "text-amber-500" : "text-red-500"
                }`}>
                  {evalDetails.score}/10
                </span>
              }
            >
              <div className="space-y-2">
                {/* Score breakdown visualization */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-muted/20 overflow-hidden">
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
                  <span className="text-[9px] font-mono tabular-nums text-muted-foreground">{evalDetails.score}/10</span>
                </div>

                {/* Issues */}
                {evalDetails.issues && evalDetails.issues.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400">Замечания:</span>
                    </div>
                    <ul className="space-y-0.5">
                      {evalDetails.issues.map((issue, i) => (
                        <li key={i} className="text-[9px] text-muted-foreground flex items-start gap-1.5">
                          <span className="text-amber-500 shrink-0 mt-0.5">•</span>
                          <span className="leading-snug">{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Improved text */}
                {evalDetails.improved && evalDetails.text && (
                  <div className="pt-1 border-t border-border/10">
                    <div className="flex items-center gap-1 mb-1">
                      <ArrowDown className="h-3 w-3 text-emerald-500" />
                      <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">Улучшенный вариант:</span>
                    </div>
                    <p className="text-[10px] text-foreground bg-emerald-500/5 rounded px-2 py-1.5 leading-relaxed">{evalDetails.text}</p>
                  </div>
                )}

                {!evalDetails.improved && evalDetails.score !== undefined && (
                  <p className="text-[9px] text-muted-foreground italic">Текст не требовал изменений</p>
                )}
              </div>
            </Section>
          </div>
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
                    <span className="text-[9px] font-medium text-muted-foreground text-right truncate">
                      {engineLabels[eng]?.split(" ")[0]}
                    </span>
                    <div className="h-[7px] rounded-full bg-muted/15 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${pct}%`,
                          background: lat < 500 ? "linear-gradient(90deg, #10b981, #34d399)"
                            : lat < 2000 ? "linear-gradient(90deg, #c89b37, #d4a843)"
                            : lat < 5000 ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                            : "linear-gradient(90deg, #ef4444, #f87171)",
                          transitionDelay: `${i * 80}ms`,
                        }}
                      />
                    </div>
                    <span className={`text-[9px] font-mono tabular-nums text-right
                      ${lat < 1000 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
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
            {errs > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                <span className="text-muted-foreground">Ошибки</span>
                <span className="font-bold text-red-400 tabular-nums">{errs}</span>
              </span>
            )}
            {fin && (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span className="text-muted-foreground">Время</span>
                <span className="font-bold text-foreground tabular-nums">{((totalMs ?? 0) / 1000).toFixed(1)}с</span>
              </span>
            )}
          </div>
          {fin && (
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-bold text-primary">Ensemble AI</span>
            </div>
          )}
          {isRunning && (
            <span className="text-[10px] text-muted-foreground animate-pulse">
              {idx === 0 ? "Переводим..." : idx === 1 ? "Синтезируем..." : "Проверяем..."}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
