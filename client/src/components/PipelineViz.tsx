/**
 * PipelineViz v3 — Neural Network inspired AI pipeline visualization.
 * Engines as glowing nodes in an arc, data flows converge to Ensemble center.
 * Animated particles, pulsing connections, glassmorphism.
 */
import { useEffect, useRef, useState } from "react";
import { Check, X, Loader2, Timer, Sparkles, Zap, Brain, ShieldCheck } from "lucide-react";

export interface EngineStatus {
  status: "idle" | "running" | "done" | "error";
  latencyMs?: number;
}

export interface PipelinePhase {
  id: string;
  label: string;
  description?: string;
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
}

const DEFAULT_PHASES: PipelinePhase[] = [
  { id: "engines", label: "AI-движки", description: "Параллельный перевод" },
  { id: "critic", label: "Критик", description: "Gemini анализ" },
  { id: "ensemble", label: "Ensemble", description: "GPT-4o синтез" },
  { id: "selfeval", label: "Оценка", description: "Контроль качества" },
  { id: "done", label: "Готово", description: "" },
];

const PHASE_ICONS: Record<string, React.ReactNode> = {
  engines: <Zap className="h-4 w-4" />,
  critic: <Brain className="h-4 w-4" />,
  ensemble: <Sparkles className="h-4 w-4" />,
  selfeval: <ShieldCheck className="h-4 w-4" />,
  done: <Check className="h-4 w-4" />,
};

// Particle animation on canvas
function ParticleCanvas({ isActive, color }: { isActive: boolean; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    const animate = () => {
      ctx.clearRect(0, 0, w / 2, h / 2);
      const particles = particlesRef.current;

      // Spawn particles when active
      if (isActive && Math.random() < 0.3) {
        particles.push({
          x: Math.random() * w / 2,
          y: h / 2 + 5,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -Math.random() * 2 - 0.5,
          life: 0,
          maxLife: 30 + Math.random() * 40,
        });
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        const alpha = 1 - p.life / p.maxLife;
        if (alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = color.replace("1)", `${alpha * 0.6})`);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [isActive, color]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: isActive ? 1 : 0, transition: "opacity 0.5s" }}
    />
  );
}

export default function PipelineViz({
  isRunning,
  elapsedMs,
  totalMs,
  phase,
  engineStatuses,
  engineLabels,
  phases = DEFAULT_PHASES,
  compact = false,
}: PipelineVizProps) {
  const displayMs = isRunning ? elapsedMs : (totalMs ?? 0);
  const phaseIds = phases.map((p) => p.id);
  const currentPhaseIdx = Math.max(0, phaseIds.indexOf(phase));

  const enginesArr = Object.keys(engineLabels).filter(
    (k) => k !== "ensemble" && k !== "deepl"
  );
  const doneCount = Object.values(engineStatuses).filter((s) => s.status === "done").length;
  const errCount = Object.values(engineStatuses).filter((s) => s.status === "error").length;
  const totalEngines = enginesArr.length;
  const allEnginesDone = doneCount + errCount >= totalEngines && totalEngines > 0;

  // Pulse animation counter
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setPulse((p) => p + 1), 150);
    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <div className="mt-3 rounded-2xl border border-border/40 overflow-hidden" data-testid="pipeline-viz">
      {/* Background layers */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-primary/3" />
        {isRunning && <ParticleCanvas isActive={isRunning} color="rgba(200, 155, 55, 1)" />}

        {/* Shimmer line */}
        {isRunning && (
          <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden z-10">
            <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary/80 to-transparent animate-shimmer" />
          </div>
        )}

        <div className="relative p-4 sm:p-5 z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              {isRunning ? (
                <div className="relative w-5 h-5">
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                  <div className="relative w-5 h-5 rounded-full bg-primary/30 flex items-center justify-center">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  </div>
                </div>
              ) : phase === "done" ? (
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Check className="h-3 w-3 text-white" />
                </div>
              ) : null}
              <div>
                <span className="text-xs font-bold text-foreground tracking-wide">
                  {isRunning ? "Перевод" : phase === "done" ? "Завершено" : "Пайплайн"}
                </span>
                {isRunning && (
                  <span className="text-[10px] text-muted-foreground ml-2">
                    {doneCount}/{totalEngines} движков
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Timer className="h-3 w-3 text-muted-foreground" />
              <span className="text-base font-mono font-bold tabular-nums text-primary">
                {(displayMs / 1000).toFixed(1)}
                <span className="text-[10px] font-normal text-muted-foreground ml-0.5">с</span>
              </span>
            </div>
          </div>

          {/* Neural network layout: engines arc → center node → output */}
          <div className="flex items-center gap-3 mb-4">
            {/* Engine nodes */}
            <div className="flex-1 grid grid-cols-5 sm:grid-cols-9 gap-1.5">
              {enginesArr.map((eng, i) => {
                const st = engineStatuses[eng];
                const done = st?.status === "done";
                const err = st?.status === "error";
                const running = st?.status === "running";
                const isFlashing = running && pulse % 3 === i % 3;

                return (
                  <div key={eng} className="flex flex-col items-center gap-0.5">
                    {/* Node */}
                    <div
                      className={`
                        relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center
                        transition-all duration-500 ease-out
                        ${done
                          ? "bg-emerald-500 shadow-lg shadow-emerald-500/30 scale-100"
                          : err
                          ? "bg-red-500 shadow-md shadow-red-500/20 scale-95"
                          : running
                          ? `bg-primary/20 ${isFlashing ? "shadow-md shadow-primary/30 scale-105" : "scale-100"}`
                          : "bg-muted/40 scale-90"
                        }
                      `}
                    >
                      {done ? (
                        <Check className="h-3.5 w-3.5 text-white" />
                      ) : err ? (
                        <X className="h-3.5 w-3.5 text-white" />
                      ) : running ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                      )}
                      {/* Glow ring for active */}
                      {running && (
                        <div className="absolute -inset-0.5 rounded-xl border border-primary/30 animate-pulse" />
                      )}
                    </div>
                    {/* Label */}
                    <span className={`text-[8px] sm:text-[9px] font-medium leading-none text-center ${
                      done ? "text-emerald-600 dark:text-emerald-400"
                        : err ? "text-red-500"
                        : running ? "text-foreground/70"
                        : "text-muted-foreground/30"
                    }`}>
                      {engineLabels[eng]?.split(" ")[0] ?? eng}
                    </span>
                    {/* Latency */}
                    {done && st?.latencyMs != null && (
                      <span className="text-[7px] sm:text-[8px] font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        {st.latencyMs < 1000 ? `${st.latencyMs}ms` : `${(st.latencyMs / 1000).toFixed(1)}с`}
                      </span>
                    )}
                    {err && <span className="text-[7px] text-red-400">err</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Phase flow — horizontal pipeline stages */}
          <div className="flex items-center gap-0">
            {phases.map((ph, i) => {
              const isActive = i === currentPhaseIdx && isRunning;
              const isDone = i < currentPhaseIdx || phase === "done";
              const isCurrent = i === currentPhaseIdx;

              return (
                <div key={ph.id} className="flex items-center flex-1 min-w-0">
                  {/* Phase node */}
                  <div className="flex flex-col items-center gap-1 min-w-0">
                    <div
                      className={`
                        w-8 h-8 rounded-lg flex items-center justify-center
                        transition-all duration-500 ease-out
                        ${isDone
                          ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                          : isActive
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                          : "bg-muted/50 text-muted-foreground/30"
                        }
                      `}
                    >
                      {PHASE_ICONS[ph.id] ?? <span className="text-[10px]">{i + 1}</span>}
                    </div>
                    <span className={`text-[9px] font-medium text-center leading-tight ${
                      isDone ? "text-emerald-600 dark:text-emerald-400"
                        : isActive ? "text-primary"
                        : "text-muted-foreground/30"
                    }`}>
                      {ph.label}
                    </span>
                  </div>
                  {/* Connector */}
                  {i < phases.length - 1 && (
                    <div className="flex-1 h-[3px] mx-1 rounded-full bg-muted/30 overflow-hidden min-w-[8px]">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          isDone ? "w-full bg-emerald-500"
                            : isActive ? "w-1/2 bg-primary"
                            : "w-0"
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Latency chart — after completion */}
          {phase === "done" && !isRunning && doneCount > 0 && (
            <div className="mt-4 pt-3 border-t border-border/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                  Скорость движков
                </span>
                <span className="text-[9px] text-muted-foreground">
                  {doneCount} ✓ · {errCount > 0 ? `${errCount} ✗` : ""}
                </span>
              </div>
              <div className="space-y-0.5">
                {enginesArr
                  .filter((eng) => engineStatuses[eng]?.status === "done" && engineStatuses[eng]?.latencyMs)
                  .sort((a, b) => (engineStatuses[a]?.latencyMs ?? 0) - (engineStatuses[b]?.latencyMs ?? 0))
                  .map((eng, i) => {
                    const ms = engineStatuses[eng]?.latencyMs ?? 0;
                    const maxMs = Math.max(
                      ...enginesArr.map((e) => engineStatuses[e]?.latencyMs ?? 0), 1
                    );
                    const pct = Math.max(6, (ms / maxMs) * 100);
                    return (
                      <div key={eng} className="flex items-center gap-1.5 h-5">
                        <span className="text-[8px] font-medium text-muted-foreground w-14 text-right shrink-0 tabular-nums">
                          {engineLabels[eng]?.split(" ")[0]}
                        </span>
                        <div className="flex-1 h-2.5 rounded-full bg-muted/20 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{
                              width: `${pct}%`,
                              background: ms < 500
                                ? "linear-gradient(90deg, #10b981, #34d399)"
                                : ms < 2000
                                ? "linear-gradient(90deg, #c89b37, #d4a843)"
                                : ms < 5000
                                ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                                : "linear-gradient(90deg, #ef4444, #f87171)",
                              animationDelay: `${i * 100}ms`,
                            }}
                          />
                        </div>
                        <span className={`text-[8px] font-mono tabular-nums w-9 shrink-0 ${
                          ms < 1000 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                        }`}>
                          {ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}с`}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Done summary */}
          {phase === "done" && !isRunning && (
            <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500/8 via-transparent to-primary/8 border border-emerald-500/15">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span className="text-[11px] font-medium text-foreground">
                  {doneCount} движков · {((totalMs ?? 0) / 1000).toFixed(1)}с
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] font-bold text-primary">
                  Ensemble AI
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
