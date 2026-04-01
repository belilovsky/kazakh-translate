/**
 * PipelineViz v5 — "Command Center"
 * Orbital layout: engines around central Ensemble node.
 * Animated connection beams, real metrics, rich detail.
 */
import { useEffect, useRef, useState } from "react";
import { Check, X, Loader2, Sparkles, Shield, Timer, Zap, Brain } from "lucide-react";

export interface EngineStatus {
  status: "idle" | "running" | "done" | "error";
  latencyMs?: number;
}

export interface PipelinePhase { id: string; label: string; description?: string; }

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

// Animated beams on canvas — lines from engine positions to center
function BeamCanvas({ engines, center, statuses, isActive }: {
  engines: Array<{ x: number; y: number; key: string }>;
  center: { x: number; y: number };
  statuses: Record<string, EngineStatus>;
  isActive: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Array<{
    fromX: number; fromY: number; toX: number; toY: number;
    progress: number; speed: number; size: number; done: boolean;
  }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = 2;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const animate = () => {
      ctx.clearRect(0, 0, w, h);

      // Draw connection lines
      for (const eng of engines) {
        const st = statuses[eng.key];
        const done = st?.status === "done";
        const running = st?.status === "running";
        const err = st?.status === "error";

        if (!done && !running && !err) continue;

        // Line from engine to center
        ctx.beginPath();
        ctx.moveTo(eng.x, eng.y);
        ctx.lineTo(center.x, center.y);
        ctx.strokeStyle = done
          ? "rgba(16, 185, 129, 0.15)"
          : err
          ? "rgba(239, 68, 68, 0.08)"
          : "rgba(200, 155, 55, 0.1)";
        ctx.lineWidth = done ? 2 : 1;
        ctx.stroke();

        // Spawn flowing particles for running engines
        if (running && isActive && Math.random() < 0.15) {
          particlesRef.current.push({
            fromX: eng.x, fromY: eng.y,
            toX: center.x, toY: center.y,
            progress: 0,
            speed: 0.01 + Math.random() * 0.02,
            size: 2 + Math.random() * 2,
            done: false,
          });
        }

        // Done: single bright pulse occasionally
        if (done && Math.random() < 0.03) {
          particlesRef.current.push({
            fromX: eng.x, fromY: eng.y,
            toX: center.x, toY: center.y,
            progress: 0,
            speed: 0.03 + Math.random() * 0.02,
            size: 2.5,
            done: true,
          });
        }
      }

      // Animate particles
      const ps = particlesRef.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.progress += p.speed;
        if (p.progress >= 1) { ps.splice(i, 1); continue; }

        const x = p.fromX + (p.toX - p.fromX) * p.progress;
        const y = p.fromY + (p.toY - p.fromY) * p.progress;
        const alpha = Math.sin(p.progress * Math.PI);

        // Glow
        const grad = ctx.createRadialGradient(x, y, 0, x, y, p.size * 4);
        const color = p.done ? "16, 185, 129" : "200, 155, 55";
        grad.addColorStop(0, `rgba(${color}, ${alpha * 0.5})`);
        grad.addColorStop(1, `rgba(${color}, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(x - p.size * 4, y - p.size * 4, p.size * 8, p.size * 8);

        // Core
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${alpha * 0.9})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [engines, center, statuses, isActive]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

export default function PipelineViz({
  isRunning, elapsedMs, totalMs, phase, engineStatuses, engineLabels,
}: PipelineVizProps) {
  const displayMs = isRunning ? elapsedMs : (totalMs ?? 0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<{
    engines: Array<{ x: number; y: number; key: string }>;
    center: { x: number; y: number };
  }>({ engines: [], center: { x: 0, y: 0 } });

  const enginesArr = Object.keys(engineLabels).filter(k => k !== "ensemble" && k !== "deepl");
  const doneCount = Object.values(engineStatuses).filter(s => s.status === "done").length;
  const errCount = Object.values(engineStatuses).filter(s => s.status === "error").length;
  const totalEngines = enginesArr.length;
  const isDone = phase === "done" && !isRunning;

  const phaseMap: Record<string, number> = { engines: 0, critic: 1, ensemble: 1, selfeval: 2, done: 3 };
  const phaseIdx = phaseMap[phase] ?? 0;

  // Measure positions for canvas beams
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => {
      const rect = container.getBoundingClientRect();
      const centerEl = container.querySelector("[data-node='center']");
      const centerRect = centerEl?.getBoundingClientRect();
      const cx = centerRect ? centerRect.left - rect.left + centerRect.width / 2 : rect.width / 2;
      const cy = centerRect ? centerRect.top - rect.top + centerRect.height / 2 : rect.height / 2;

      const enginePositions = enginesArr.map((key) => {
        const el = container.querySelector(`[data-node='${key}']`);
        if (!el) return { x: 0, y: 0, key };
        const r = el.getBoundingClientRect();
        return { x: r.left - rect.left + r.width / 2, y: r.top - rect.top + r.height / 2, key };
      });
      setPositions({ engines: enginePositions, center: { x: cx, y: cy } });
    };
    measure();
    const timeout = setTimeout(measure, 100);
    return () => clearTimeout(timeout);
  }, [enginesArr.length, phase]);

  // Phase labels
  const phasesInfo = [
    { phase: "engines", label: "Движки", icon: <Zap className="h-3 w-3" />, done: phaseIdx > 0 || isDone, active: phaseIdx === 0 && isRunning },
    { phase: "ensemble", label: "Ensemble", icon: <Brain className="h-3 w-3" />, done: phaseIdx > 1 || isDone, active: phaseIdx === 1 && isRunning },
    { phase: "selfeval", label: "Оценка", icon: <Shield className="h-3 w-3" />, done: phaseIdx > 2 || isDone, active: phaseIdx === 2 && isRunning },
  ];

  return (
    <div
      ref={containerRef}
      className={`mt-3 rounded-2xl overflow-hidden relative transition-all duration-500
        ${isDone ? "border border-emerald-500/20" : "border border-border/40"}
      `}
      data-testid="pipeline-viz"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-card/90 via-background/80 to-card/60" />

      {/* Canvas beams */}
      <BeamCanvas
        engines={positions.engines}
        center={positions.center}
        statuses={engineStatuses}
        isActive={isRunning}
      />

      {/* Shimmer top */}
      {isRunning && (
        <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden z-20">
          <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-shimmer" />
        </div>
      )}

      <div className="relative z-10 p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Phase pills */}
            {phasesInfo.map((p) => (
              <div
                key={p.phase}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-semibold transition-all duration-500
                  ${p.done ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : p.active ? "bg-primary/10 text-primary animate-pulse"
                    : "bg-muted/30 text-muted-foreground/30"
                  }
                `}
              >
                {p.done ? <Check className="h-2.5 w-2.5" /> : p.active ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : p.icon}
                {p.label}
              </div>
            ))}
          </div>
          <span className={`text-lg font-mono font-bold tabular-nums ${isDone ? "text-emerald-500" : "text-primary"}`}>
            {(displayMs / 1000).toFixed(1)}
            <span className="text-[9px] font-normal text-muted-foreground ml-0.5">с</span>
          </span>
        </div>

        {/* Engine ring around center */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap mb-4">
          {/* Left engines */}
          {enginesArr.slice(0, Math.ceil(enginesArr.length / 2)).map((eng) => (
            <EngineNode key={eng} eng={eng} status={engineStatuses[eng]} label={engineLabels[eng]} />
          ))}

          {/* Center: Ensemble */}
          <div
            data-node="center"
            className={`
              relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex flex-col items-center justify-center mx-2
              transition-all duration-700
              ${isDone
                ? "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xl shadow-emerald-500/30"
                : phaseIdx >= 1 && isRunning
                ? "bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 shadow-lg shadow-primary/10"
                : "bg-muted/30 border border-border/30"
              }
            `}
          >
            {isDone ? (
              <>
                <Sparkles className="h-5 w-5 text-white mb-0.5" />
                <span className="text-[8px] font-bold text-white/80">READY</span>
              </>
            ) : phaseIdx >= 1 && isRunning ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-primary mb-0.5" />
                <span className="text-[7px] text-primary font-medium">
                  {phaseIdx === 1 ? "Синтез" : "Оценка"}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 text-muted-foreground/20" />
                <span className="text-[7px] text-muted-foreground/20">Ensemble</span>
              </>
            )}
            {(phaseIdx >= 1 && isRunning) && (
              <div className="absolute -inset-1.5 rounded-2xl border-2 border-primary/20 animate-ping opacity-20" />
            )}
          </div>

          {/* Right engines */}
          {enginesArr.slice(Math.ceil(enginesArr.length / 2)).map((eng) => (
            <EngineNode key={eng} eng={eng} status={engineStatuses[eng]} label={engineLabels[eng]} />
          ))}
        </div>

        {/* Bottom stats strip */}
        <div className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-500
          ${isDone ? "bg-emerald-500/5 border border-emerald-500/10" : "bg-muted/10 border border-border/20"}
        `}>
          <div className="flex items-center gap-3">
            <StatPill label="Движки" value={`${doneCount}/${totalEngines}`} ok={doneCount > 0} />
            {errCount > 0 && <StatPill label="Ошибки" value={String(errCount)} ok={false} />}
            {isDone && <StatPill label="Время" value={`${((totalMs ?? 0) / 1000).toFixed(1)}с`} ok />}
          </div>
          {isDone && (
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-bold text-primary">Ensemble AI</span>
            </div>
          )}
          {isRunning && (
            <span className="text-[10px] text-muted-foreground animate-pulse">
              {phaseIdx === 0 ? "Переводим..." : phaseIdx === 1 ? "Синтезируем..." : "Проверяем..."}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Engine node component
function EngineNode({ eng, status, label }: { eng: string; status?: EngineStatus; label: string }) {
  const done = status?.status === "done";
  const err = status?.status === "error";
  const running = status?.status === "running";

  return (
    <div data-node={eng} className="flex flex-col items-center gap-1">
      <div className={`
        relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center
        transition-all duration-500
        ${done ? "bg-emerald-500/10 border border-emerald-500/30 shadow-md shadow-emerald-500/10"
          : err ? "bg-red-500/10 border border-red-500/30"
          : running ? "bg-primary/5 border border-primary/20 shadow-sm shadow-primary/5"
          : "bg-muted/20 border border-border/10"
        }
      `}>
        {done ? <Check className="h-4 w-4 text-emerald-500" />
          : err ? <X className="h-4 w-4 text-red-400" />
          : running ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
          : <div className="w-2 h-2 rounded-full bg-muted-foreground/10" />}
        {running && <div className="absolute -inset-0.5 rounded-xl border border-primary/20 animate-pulse" />}
      </div>
      <span className={`text-[8px] sm:text-[9px] font-medium leading-none
        ${done ? "text-emerald-600 dark:text-emerald-400"
          : err ? "text-red-400"
          : running ? "text-foreground/60"
          : "text-muted-foreground/25"
        }
      `}>
        {label?.split(" ")[0]}
      </span>
      {done && status?.latencyMs != null && (
        <span className="text-[7px] font-mono tabular-nums text-emerald-600/70 dark:text-emerald-400/70">
          {status.latencyMs < 1000 ? `${status.latencyMs}ms` : `${(status.latencyMs / 1000).toFixed(1)}с`}
        </span>
      )}
    </div>
  );
}

// Small stat pill
function StatPill({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-red-400"}`} />
      <span className="text-[9px] text-muted-foreground">{label}</span>
      <span className={`text-[9px] font-bold ${ok ? "text-foreground" : "text-red-400"}`}>{value}</span>
    </div>
  );
}
