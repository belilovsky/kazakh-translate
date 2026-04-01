/**
 * PipelineViz v6 — Best of all versions.
 * Top: phase stepper with icons. Middle: engine grid with real data.
 * Bottom: latency bar chart. Canvas particles in background.
 */
import { useEffect, useRef, useState } from "react";
import {
  Check, X, Loader2, Sparkles, Timer,
  Zap, Brain, ShieldCheck, BarChart3,
} from "lucide-react";

export interface EngineStatus {
  status: "idle" | "running" | "done" | "error";
  latencyMs?: number;
}
export interface PipelinePhase { id: string; label: string; }

interface PipelineVizProps {
  isRunning: boolean;
  elapsedMs: number;
  totalMs: number | null;
  phase: string;
  engineStatuses: Record<string, EngineStatus>;
  engineLabels: Record<string, string>;
  phases?: PipelinePhase[];
  compact?: boolean;
}

// Background particle canvas
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
    ctx.scale(dpr, dpr);
    const w = c.offsetWidth, h = c.offsetHeight;

    const run = () => {
      ctx.clearRect(0, 0, w, h);
      if (active && Math.random() < 0.25) {
        dots.current.push({
          x: Math.random() * w, y: h,
          vx: (Math.random() - 0.5) * 0.8, vy: -0.5 - Math.random() * 1.5,
          a: 0.3 + Math.random() * 0.5, r: 1 + Math.random() * 1.5,
        });
      }
      const d = dots.current;
      for (let i = d.length - 1; i >= 0; i--) {
        const p = d[i];
        p.x += p.vx; p.y += p.vy; p.a -= 0.005;
        if (p.a <= 0) { d.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,155,55,${p.a * 0.4})`;
        ctx.fill();
      }
      anim.current = requestAnimationFrame(run);
    };
    run();
    return () => cancelAnimationFrame(anim.current);
  }, [active]);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none opacity-60" />;
}

export default function PipelineViz({
  isRunning, elapsedMs, totalMs, phase, engineStatuses, engineLabels,
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
    { id: "engines", label: "Движки", sub: `${done}/${total}`, icon: <Zap className="h-3.5 w-3.5" /> },
    { id: "ensemble", label: "Критик + Ensemble", sub: "GPT-4o + Gemini", icon: <Brain className="h-3.5 w-3.5" /> },
    { id: "selfeval", label: "Самооценка", sub: "Контроль качества", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    { id: "done", label: "Готово", sub: "", icon: <Sparkles className="h-3.5 w-3.5" /> },
  ];

  // Sorted engines for bar chart
  const sortedDone = engines
    .filter(e => engineStatuses[e]?.status === "done" && engineStatuses[e]?.latencyMs)
    .sort((a, b) => (engineStatuses[a]?.latencyMs ?? 0) - (engineStatuses[b]?.latencyMs ?? 0));
  const maxLat = Math.max(...sortedDone.map(e => engineStatuses[e]?.latencyMs ?? 0), 1);

  return (
    <div className={`mt-3 rounded-2xl overflow-hidden relative transition-all duration-500 ${fin ? "border border-emerald-500/20" : "border border-border/30"}`} data-testid="pipeline-viz">
      <div className="absolute inset-0 bg-gradient-to-b from-card via-background/90 to-card/80" />
      <ParticleBg active={isRunning} />
      {isRunning && (
        <div className="absolute top-0 left-0 right-0 h-[2px] z-20 overflow-hidden">
          <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary/70 to-transparent animate-shimmer" />
        </div>
      )}

      <div className="relative z-10 p-4 sm:p-5">
        {/* Header: timer */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
              : fin ? <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" /></div>
              : null}
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Пайплайн перевода</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5 text-muted-foreground" />
            <span className={`text-lg font-mono font-bold tabular-nums ${fin ? "text-emerald-500" : "text-primary"}`}>
              {(ms / 1000).toFixed(1)}<span className="text-[9px] font-normal text-muted-foreground ml-0.5">с</span>
            </span>
          </div>
        </div>

        {/* Phase stepper */}
        <div className="flex items-start gap-0 mb-5">
          {steps.map((s, i) => {
            const active = i === idx && isRunning;
            const ok = i < idx || fin;
            return (
              <div key={s.id} className="flex items-start flex-1 min-w-0">
                <div className="flex flex-col items-center gap-1">
                  <div className={`
                    w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500
                    ${ok ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                      : active ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "bg-muted/50 text-muted-foreground/25"}
                  `}>
                    {ok ? <Check className="h-4 w-4" /> : active ? <Loader2 className="h-4 w-4 animate-spin" /> : s.icon}
                    {active && <div className="absolute -inset-0.5 rounded-xl border-2 border-primary/30 animate-ping opacity-20" />}
                  </div>
                  <span className={`text-[9px] font-semibold text-center leading-tight ${ok ? "text-emerald-600 dark:text-emerald-400" : active ? "text-primary" : "text-muted-foreground/30"}`}>
                    {s.label}
                  </span>
                  {(ok || active) && s.sub && (
                    <span className="text-[8px] text-muted-foreground text-center">{s.sub}</span>
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div className="flex-1 pt-4 px-1 min-w-[8px]">
                    <div className="h-[3px] rounded-full bg-muted/30 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${ok ? "w-full bg-emerald-500" : active ? "w-1/2 bg-primary animate-pulse" : "w-0"}`} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Engine grid */}
        <div className="mb-4">
          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Движки перевода</div>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5">
            {engines.map(eng => {
              const st = engineStatuses[eng];
              const d = st?.status === "done";
              const e = st?.status === "error";
              const r = st?.status === "running";
              return (
                <div key={eng} className={`
                  flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all duration-300
                  ${d ? "bg-emerald-500/8 ring-1 ring-emerald-500/20"
                    : e ? "bg-red-500/8 ring-1 ring-red-500/20"
                    : r ? "bg-primary/5 ring-1 ring-primary/15"
                    : "bg-muted/15"}
                `}>
                  <div className={`
                    w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-500
                    ${d ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/25"
                      : e ? "bg-red-500 text-white"
                      : r ? "bg-primary/15 text-primary"
                      : "bg-muted/40 text-muted-foreground/15"}
                  `}>
                    {d ? <Check className="h-3.5 w-3.5" />
                      : e ? <X className="h-3.5 w-3.5" />
                      : r ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                  </div>
                  <span className={`text-[9px] font-medium leading-tight ${d ? "text-foreground" : e ? "text-red-400" : r ? "text-foreground/60" : "text-muted-foreground/20"}`}>
                    {engineLabels[eng]?.split(" ")[0]}
                  </span>
                  {d && st?.latencyMs != null && (
                    <span className="text-[8px] font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      {st.latencyMs < 1000 ? `${st.latencyMs}ms` : `${(st.latencyMs / 1000).toFixed(1)}с`}
                    </span>
                  )}
                  {e && <span className="text-[7px] text-red-400">ошибка</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Latency bar chart — visible after completion */}
        {fin && sortedDone.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart3 className="h-3 w-3 text-muted-foreground" />
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Скорость ответа</span>
            </div>
            <div className="space-y-[3px]">
              {sortedDone.map((eng, i) => {
                const lat = engineStatuses[eng]?.latencyMs ?? 0;
                const pct = Math.max(5, (lat / maxLat) * 100);
                return (
                  <div key={eng} className="flex items-center gap-1.5 h-[18px]">
                    <span className="text-[8px] font-medium text-muted-foreground w-[52px] text-right shrink-0">
                      {engineLabels[eng]?.split(" ")[0]}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-muted/15 overflow-hidden">
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
                    <span className={`text-[8px] font-mono tabular-nums w-[36px] shrink-0 text-right ${lat < 1000 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                      {lat < 1000 ? `${lat}ms` : `${(lat / 1000).toFixed(1)}с`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer summary */}
        <div className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-500
          ${fin ? "bg-gradient-to-r from-emerald-500/5 to-primary/5 border border-emerald-500/10" : "bg-muted/5 border border-border/10"}`}>
          <div className="flex items-center gap-4 text-[9px]">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> <span className="text-muted-foreground">Движки</span> <span className="font-bold text-foreground">{done}/{total}</span></span>
            {errs > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> <span className="text-muted-foreground">Ошибки</span> <span className="font-bold text-red-400">{errs}</span></span>}
            {fin && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> <span className="text-muted-foreground">Время</span> <span className="font-bold text-foreground">{((totalMs ?? 0) / 1000).toFixed(1)}с</span></span>}
          </div>
          {fin && <div className="flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-primary" /><span className="text-[10px] font-bold text-primary">Ensemble AI</span></div>}
          {isRunning && <span className="text-[10px] text-muted-foreground animate-pulse">{idx === 0 ? "Переводим..." : idx === 1 ? "Синтезируем..." : "Проверяем..."}</span>}
        </div>
      </div>
    </div>
  );
}
