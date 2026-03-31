import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Trophy,
  AlertTriangle,
  Key,
} from "lucide-react";
import AdminLayout from "./AdminLayout";

const ENGINE_LABELS: Record<string, string> = {
  ensemble: "Ensemble AI",
  openai: "GPT-4o",
  claude: "Claude",
  gemini: "Gemini 2.5",
  deepseek: "DeepSeek",
  grok: "Grok",
  tilmash: "Qwen 72B",
  mistral: "Mistral",
  perplexity: "Perplexity",
  deepl: "DeepL",
  yandex: "Yandex",
};

interface EngineStatEntry {
  engine: string;
  totalCalls: number;
  successCount: number;
  errorCount: number;
  avgLatencyMs: number;
  successRate: number;
  lastError: string | null;
  bestCount: number;
}

interface EngineStatus {
  name: string;
  status: string;
  keyEnvVar: string;
  hasApiKey: boolean;
}

export default function EnginesPage() {
  const { data: engineStats, isLoading: statsLoading } = useQuery<EngineStatEntry[]>({
    queryKey: ["/api/admin/engine-stats"],
  });

  const { data: enginesData, isLoading: enginesLoading } = useQuery<{ engines: EngineStatus[] }>({
    queryKey: ["/api/engines"],
  });

  const isLoading = statsLoading || enginesLoading;

  // Merge stats with engine status
  const mergedEngines = (enginesData?.engines ?? []).map((e) => {
    const stat = engineStats?.find((s) => s.engine === e.name);
    return {
      ...e,
      label: ENGINE_LABELS[e.name] || e.name,
      totalCalls: stat?.totalCalls ?? 0,
      successCount: stat?.successCount ?? 0,
      errorCount: stat?.errorCount ?? 0,
      avgLatencyMs: stat?.avgLatencyMs ?? 0,
      successRate: stat?.successRate ?? 0,
      lastError: stat?.lastError ?? null,
      bestCount: stat?.bestCount ?? 0,
    };
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground" data-testid="text-page-title">
            Engines
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Translation engine status and performance
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        ) : mergedEngines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No engines configured</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {mergedEngines.map((eng) => (
              <Card
                key={eng.name}
                className={`relative overflow-hidden ${
                  !eng.hasApiKey ? "opacity-60" : ""
                }`}
                data-testid={`card-engine-${eng.name}`}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{eng.label}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{eng.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {eng.hasApiKey ? (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-0.5" />
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-destructive/10 text-destructive border-0"
                        >
                          <XCircle className="h-3 w-3 mr-0.5" />
                          No Key
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Calls</p>
                      <p className="text-lg font-bold text-foreground">{eng.totalCalls}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Avg Latency</p>
                      <p className="text-lg font-bold text-foreground">
                        {eng.avgLatencyMs > 0 ? `${eng.avgLatencyMs}` : "—"}
                        {eng.avgLatencyMs > 0 && (
                          <span className="text-xs font-normal text-muted-foreground">ms</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Best Picks</p>
                      <p className="text-lg font-bold text-foreground">
                        {eng.bestCount > 0 ? eng.bestCount : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Success rate bar */}
                  {eng.totalCalls > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] text-muted-foreground">Success Rate</p>
                        <p
                          className={`text-xs font-medium ${
                            eng.successRate >= 90
                              ? "text-emerald-600 dark:text-emerald-400"
                              : eng.successRate >= 50
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-destructive"
                          }`}
                        >
                          {eng.successRate}%
                        </p>
                      </div>
                      <Progress
                        value={eng.successRate}
                        className="h-1.5"
                      />
                    </div>
                  )}

                  {/* API Key status */}
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Key className="h-3 w-3" />
                    <span className="font-mono">{eng.keyEnvVar}</span>
                    <span>—</span>
                    <span>{eng.hasApiKey ? "Configured" : "Missing"}</span>
                  </div>

                  {/* Last error */}
                  {eng.lastError && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-start gap-1.5 p-2 rounded bg-destructive/5 border border-destructive/10 cursor-help">
                          <AlertTriangle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                          <p className="text-[10px] text-destructive truncate">
                            {eng.lastError}
                          </p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-sm">
                        <p className="text-xs">{eng.lastError}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
