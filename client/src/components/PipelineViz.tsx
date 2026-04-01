/**
 * PipelineViz — Reusable AI pipeline visualization component.
 * Premium design with animated progress, glassmorphism, real-time engine status.
 * 
 * Usage:
 *   <PipelineViz
 *     isRunning={true}
 *     elapsedMs={3400}
 *     totalMs={null}
 *     phase="engines"
 *     engineStatuses={{ openai: { status: "done", latencyMs: 1200 }, ... }}
 *     engineLabels={{ openai: "GPT-4o", ... }}
 *     phases={[{ id: "engines", label: "Движки" }, ...]}
 *   />
 */
import { Loader2, Check, X, Zap, Brain, ShieldCheck, Sparkles, Timer } from "lucide-react";

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
  /** Compact mode — hides engine grid */
  compact?: boolean;
}

const DEFAULT_PHASES: PipelinePhase[] = [
  { id: "engines", label: "AI-движки", description: "Параллельный перевод" },
  { id: "critic", label: "Критик", description: "Анализ вариантов" },
  { id: "ensemble", label: "Ensemble", description: "Синтез лучшего" },
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
  const currentPhaseIdx = phaseIds.indexOf(phase);

  const enginesArr = Object.keys(engineLabels).filter(
    (k) => k !== "ensemble" && k !== "deepl"
  );
  const doneCount = Object.values(engineStatuses).filter(
    (s) => s.status === "done"
  ).length;
  const errCount = Object.values(engineStatuses).filter(
    (s) => s.status === "error"
  ).length;
  const totalEngines = enginesArr.length;

  // Overall progress 0-100
  const phaseProgress = phases.length > 1 ? (currentPhaseIdx / (phases.length - 1)) * 100 : 0;

  return (
    <div
      className="relative mt-3 rounded-2xl border border-border/60 overflow-hidden"
      data-testid="pipeline-viz"
    >
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-gradient-to-br from-card/80 via-card/60 to-primary/5 backdrop-blur-sm" />
      
      {/* Animated glow on top edge when running */}
      {isRunning && (
        <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-transparent via-primary to-transparent animate-shimmer" />
        </div>
      )}

      <div className="relative p-4 sm:p-5">
        {/* Header: title + timer */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {isRunning ? (
              <div className="relative">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-primary rounded-full animate-ping" />
              </div>
            ) : phase === "done" ? (
              <div className="h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check className="h-2.5 w-2.5 text-white" />
              </div>
            ) : null}
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Пайплайн
            </span>
            {doneCount > 0 && phase === "engines" && (
              <span className="text-[10px] text-muted-foreground">
                {doneCount}/{totalEngines} движков
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-lg font-mono font-bold tabular-nums text-primary">
              {displayMs > 0 ? `${(displayMs / 1000).toFixed(1)}` : "0.0"}
              <span className="text-xs font-normal text-muted-foreground ml-0.5">с</span>
            </span>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="h-1 rounded-full bg-muted/60 mb-5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${phase === "done" ? 100 : Math.max(5, phaseProgress)}%`,
              background: phase === "done"
                ? "linear-gradient(90deg, #10b981, #059669)"
                : "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))",
            }}
          />
        </div>

        {/* Phase stepper */}
        <div className="flex items-start gap-0 mb-5">
          {phases.map((ph, i) => {
            const isActive = i === currentPhaseIdx && isRunning;
            const isDone = i < currentPhaseIdx || phase === "done";
            const isFuture = i > currentPhaseIdx && phase !== "done";

            return (
              <div key={ph.id} className="flex items-start flex-1 min-w-0">
                {/* Step circle + label */}
                <div className="flex flex-col items-center gap-1.5 min-w-0">
                  <div
                    className={`
                      relative flex items-center justify-center w-9 h-9 rounded-xl shrink-0
                      transition-all duration-500 ease-out
                      ${isDone
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25 scale-100"
                        : isActive
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 scale-110"
                        : "bg-muted/80 text-muted-foreground/40 scale-90"
                      }
                    `}
                  >
                    {PHASE_ICONS[ph.id] ?? <span className="text-xs">{i + 1}</span>}
                    {isActive && (
                      <span className="absolute inset-0 rounded-xl border-2 border-primary animate-ping opacity-30" />
                    )}
                  </div>
                  <div className="text-center px-0.5">
                    <span
                      className={`text-[10px] font-semibold leading-tight block ${
                        isDone
                          ? "text-emerald-600 dark:text-emerald-400"
                          : isActive
                          ? "text-primary"
                          : "text-muted-foreground/40"
                      }`}
                    >
                      {ph.label}
                    </span>
                    {ph.description && (isActive || isDone) && (
                      <span className="text-[9px] text-muted-foreground block mt-0.5">
                        {ph.description}
                      </span>
                    )}
                  </div>
                </div>

                {/* Connector line */}
                {i < phases.length - 1 && (
                  <div className="flex-1 pt-4 px-1 min-w-[12px]">
                    <div className="h-[3px] rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          isDone
                            ? "w-full bg-emerald-500"
                            : isActive
                            ? "w-2/3 bg-primary"
                            : "w-0"
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Engine grid */}
        {!compact && (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5">
            {enginesArr.map((eng) => {
              const st = engineStatuses[eng];
              const done = st?.status === "done";
              const err = st?.status === "error";
              const running = st?.status === "running";
              const idle = !st || st.status === "idle";

              return (
                <div
                  key={eng}
                  className={`
                    group relative flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-center
                    transition-all duration-300 ease-out cursor-default
                    ${done
                      ? "bg-emerald-500/8 ring-1 ring-emerald-500/20"
                      : err
                      ? "bg-destructive/8 ring-1 ring-destructive/20"
                      : running
                      ? "bg-primary/5 ring-1 ring-primary/20"
                      : "bg-muted/20"
                    }
                  `}
                >
                  {/* Status indicator */}
                  <div
                    className={`
                      w-7 h-7 rounded-lg flex items-center justify-center
                      transition-all duration-500 ease-out
                      ${done
                        ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                        : err
                        ? "bg-destructive text-white shadow-sm shadow-destructive/30"
                        : running
                        ? "bg-primary/15 text-primary"
                        : "bg-muted/60 text-muted-foreground/30"
                      }
                    `}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : err ? (
                      <X className="h-3.5 w-3.5" />
                    ) : running ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    )}
                  </div>

                  {/* Engine name */}
                  <span
                    className={`text-[9px] font-medium leading-tight ${
                      done
                        ? "text-foreground"
                        : err
                        ? "text-destructive"
                        : running
                        ? "text-foreground/70"
                        : "text-muted-foreground/40"
                    }`}
                  >
                    {engineLabels[eng]?.split(" ")[0] ?? eng}
                  </span>

                  {/* Latency */}
                  {done && st?.latencyMs != null && (
                    <span className="text-[8px] font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                      {st.latencyMs < 1000
                        ? `${st.latencyMs}ms`
                        : `${(st.latencyMs / 1000).toFixed(1)}с`}
                    </span>
                  )}
                  {err && (
                    <span className="text-[8px] text-destructive/60">ошибка</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Engine latency chart — mini bar chart after completion */}
        {phase === "done" && !isRunning && doneCount > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Латентность движков</span>
              <span className="text-[9px] text-muted-foreground">{doneCount} успешно · {errCount > 0 ? `${errCount} ошибок` : "0 ошибок"}</span>
            </div>
            <div className="space-y-1">
              {enginesArr
                .filter((eng) => engineStatuses[eng]?.status === "done" && engineStatuses[eng]?.latencyMs)
                .sort((a, b) => (engineStatuses[a]?.latencyMs ?? 0) - (engineStatuses[b]?.latencyMs ?? 0))
                .map((eng) => {
                  const ms = engineStatuses[eng]?.latencyMs ?? 0;
                  const maxMs = Math.max(...enginesArr.map((e) => engineStatuses[e]?.latencyMs ?? 0), 1);
                  const pct = Math.max(8, (ms / maxMs) * 100);
                  const isFast = ms < 1000;
                  return (
                    <div key={eng} className="flex items-center gap-2">
                      <span className="text-[9px] font-medium text-muted-foreground w-16 text-right shrink-0">
                        {engineLabels[eng]?.split(" ")[0] ?? eng}
                      </span>
                      <div className="flex-1 h-3 rounded-full bg-muted/30 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${
                            isFast
                              ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                              : ms < 3000
                              ? "bg-gradient-to-r from-primary/70 to-primary"
                              : "bg-gradient-to-r from-amber-400 to-amber-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`text-[9px] font-mono tabular-nums w-10 shrink-0 ${
                        isFast ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                      }`}>
                        {ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}с`}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Summary bar */}
        {phase === "done" && !isRunning && (
          <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500/5 to-primary/5 border border-emerald-500/10">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
              <span className="text-[11px] font-medium text-foreground">
                {doneCount} движков · {((totalMs ?? 0) / 1000).toFixed(1)}с
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-primary">
                Ensemble AI
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
