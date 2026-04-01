/**
 * PipelineViz v4 — "AI Flow" — minimal, cinematic pipeline visualization.
 * A horizontal beam of light flows through 3 phase nodes.
 * Engines are tiny dots inside the first node that light up as they complete.
 * No bar charts, no DevOps metrics. Pure visual storytelling.
 */
import { useEffect, useRef } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";

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

// Canvas beam animation — particles flowing left to right along a line
function BeamCanvas({ isActive, progress }: { isActive: boolean; progress: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particles = useRef<Array<{ x: number; y: number; speed: number; size: number; alpha: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();

    const w = () => canvas.offsetWidth;
    const h = () => canvas.offsetHeight;
    const midY = () => h() / 2;

    const animate = () => {
      ctx.clearRect(0, 0, w(), h());

      // Draw the base beam line
      const beamEnd = w() * Math.min(1, progress);
      if (beamEnd > 0) {
        const grad = ctx.createLinearGradient(0, midY(), beamEnd, midY());
        grad.addColorStop(0, "rgba(200, 155, 55, 0.05)");
        grad.addColorStop(0.5, "rgba(200, 155, 55, 0.15)");
        grad.addColorStop(1, "rgba(200, 155, 55, 0.05)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, midY() - 1.5, beamEnd, 3);
      }

      // Spawn particles
      if (isActive && Math.random() < 0.4) {
        particles.current.push({
          x: Math.random() * beamEnd * 0.3,
          y: midY() + (Math.random() - 0.5) * 8,
          speed: 1 + Math.random() * 3,
          size: 1 + Math.random() * 2,
          alpha: 0.4 + Math.random() * 0.6,
        });
      }

      // Update and draw particles
      const ps = particles.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.x += p.speed;
        p.alpha -= 0.008;
        if (p.alpha <= 0 || p.x > w()) {
          ps.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 155, 55, ${p.alpha})`;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 155, 55, ${p.alpha * 0.15})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [isActive, progress]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
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
}: PipelineVizProps) {
  const displayMs = isRunning ? elapsedMs : (totalMs ?? 0);

  const enginesArr = Object.keys(engineLabels).filter(
    (k) => k !== "ensemble" && k !== "deepl"
  );
  const doneCount = Object.values(engineStatuses).filter((s) => s.status === "done").length;
  const errCount = Object.values(engineStatuses).filter((s) => s.status === "error").length;
  const totalEngines = enginesArr.length;

  // 3 main phases for visual
  const phaseMap: Record<string, number> = { engines: 0, critic: 1, ensemble: 1, selfeval: 2, done: 3 };
  const phaseIdx = phaseMap[phase] ?? 0;
  const progress = phase === "done" ? 1 : phaseIdx / 3;

  const isDone = phase === "done" && !isRunning;

  return (
    <div
      className={`
        mt-3 rounded-2xl overflow-hidden transition-all duration-700
        ${isDone ? "border border-emerald-500/20 bg-gradient-to-r from-emerald-500/[0.03] to-transparent" : "border border-border/30 bg-card/30"}
      `}
      data-testid="pipeline-viz"
    >
      <div className="relative px-4 sm:px-5 py-4">
        {/* Particle beam */}
        <div className="absolute inset-0">
          <BeamCanvas isActive={isRunning} progress={progress + 0.15} />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Timer row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {isRunning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : isDone ? (
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 text-white" />
                </div>
              ) : null}
              <span className="text-[11px] font-medium text-muted-foreground">
                {isRunning ? `${doneCount}/${totalEngines} движков` : isDone ? `${doneCount} движков · ${((totalMs ?? 0) / 1000).toFixed(1)}с` : ""}
              </span>
            </div>
            {displayMs > 0 && (
              <span className={`text-sm font-mono font-bold tabular-nums ${isDone ? "text-emerald-500" : "text-primary"}`}>
                {(displayMs / 1000).toFixed(1)}
                <span className="text-[9px] font-normal text-muted-foreground ml-0.5">с</span>
              </span>
            )}
          </div>

          {/* Main flow: 3 nodes connected by beams */}
          <div className="flex items-center gap-0">
            {/* NODE 1: Engines */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className={`
                relative w-14 h-14 rounded-2xl flex flex-col items-center justify-center
                transition-all duration-700
                ${phaseIdx > 0 || isDone
                  ? "bg-emerald-500/10 border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                  : phaseIdx === 0 && isRunning
                  ? "bg-primary/10 border border-primary/30 shadow-lg shadow-primary/10"
                  : "bg-muted/30 border border-border/30"
                }
              `}>
                {/* Mini engine dots inside the node */}
                <div className="grid grid-cols-3 gap-[3px]">
                  {enginesArr.slice(0, 9).map((eng) => {
                    const st = engineStatuses[eng];
                    const d = st?.status === "done";
                    const e = st?.status === "error";
                    const r = st?.status === "running";
                    return (
                      <div
                        key={eng}
                        className={`
                          w-[6px] h-[6px] rounded-full transition-all duration-300
                          ${d ? "bg-emerald-400 shadow-sm shadow-emerald-400/50"
                            : e ? "bg-red-400"
                            : r ? "bg-primary/60 animate-pulse"
                            : "bg-muted-foreground/15"
                          }
                        `}
                      />
                    );
                  })}
                </div>
                {/* Pulse ring when active */}
                {phaseIdx === 0 && isRunning && (
                  <div className="absolute -inset-1 rounded-2xl border border-primary/20 animate-ping opacity-30" />
                )}
              </div>
              <span className={`text-[10px] font-medium ${phaseIdx >= 0 && (isRunning || isDone) ? "text-foreground" : "text-muted-foreground/40"}`}>
                Движки
              </span>
            </div>

            {/* Beam 1→2 */}
            <div className="flex-1 flex items-center max-w-[80px] sm:max-w-[120px]">
              <div className="w-full h-[2px] rounded-full bg-muted/20 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ease-out ${
                  phaseIdx > 0 || isDone ? "w-full bg-emerald-500/50" : phaseIdx === 0 && isRunning ? "w-1/3 bg-primary/40 animate-pulse" : "w-0"
                }`} />
              </div>
            </div>

            {/* NODE 2: Critic + Ensemble */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className={`
                relative w-14 h-14 rounded-2xl flex items-center justify-center
                transition-all duration-700
                ${phaseIdx > 1 || isDone
                  ? "bg-emerald-500/10 border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                  : phaseIdx === 1 && isRunning
                  ? "bg-primary/10 border border-primary/30 shadow-lg shadow-primary/10"
                  : "bg-muted/20 border border-border/20"
                }
              `}>
                <Sparkles className={`h-5 w-5 transition-all duration-500 ${
                  phaseIdx > 1 || isDone ? "text-emerald-500"
                    : phaseIdx === 1 && isRunning ? "text-primary animate-pulse"
                    : "text-muted-foreground/20"
                }`} />
                {phaseIdx === 1 && isRunning && (
                  <div className="absolute -inset-1 rounded-2xl border border-primary/20 animate-ping opacity-30" />
                )}
              </div>
              <span className={`text-[10px] font-medium ${phaseIdx >= 1 && (isRunning || isDone) ? "text-foreground" : "text-muted-foreground/40"}`}>
                Ensemble
              </span>
            </div>

            {/* Beam 2→3 */}
            <div className="flex-1 flex items-center max-w-[80px] sm:max-w-[120px]">
              <div className="w-full h-[2px] rounded-full bg-muted/20 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ease-out ${
                  phaseIdx > 2 || isDone ? "w-full bg-emerald-500/50" : phaseIdx === 2 && isRunning ? "w-1/3 bg-primary/40 animate-pulse" : "w-0"
                }`} />
              </div>
            </div>

            {/* NODE 3: Quality check */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className={`
                relative w-14 h-14 rounded-2xl flex items-center justify-center
                transition-all duration-700
                ${isDone
                  ? "bg-emerald-500 border border-emerald-400 shadow-xl shadow-emerald-500/30"
                  : phaseIdx === 2 && isRunning
                  ? "bg-primary/10 border border-primary/30 shadow-lg shadow-primary/10"
                  : "bg-muted/20 border border-border/20"
                }
              `}>
                {isDone ? (
                  <Check className="h-6 w-6 text-white" />
                ) : phaseIdx === 2 && isRunning ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <Check className="h-5 w-5 text-muted-foreground/20" />
                )}
                {phaseIdx === 2 && isRunning && (
                  <div className="absolute -inset-1 rounded-2xl border border-primary/20 animate-ping opacity-30" />
                )}
              </div>
              <span className={`text-[10px] font-medium ${phaseIdx >= 2 && (isRunning || isDone) ? "text-foreground" : "text-muted-foreground/40"}`}>
                Качество
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
