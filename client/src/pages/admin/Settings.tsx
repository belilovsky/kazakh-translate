import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Cpu, Info, Clock } from "lucide-react";
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

interface AppSettings {
  selfEvalThreshold: number;
  maxIterations: number;
  enginePriority: string[];
  version: string;
  uptime: number;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

export default function SettingsPage() {
  const { data, isLoading } = useQuery<AppSettings>({
    queryKey: ["/api/admin/settings"],
    refetchInterval: 30000, // refresh uptime
  });

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-xl font-bold text-foreground" data-testid="text-page-title">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Application configuration (read-only)
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-60 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : data ? (
          <>
            {/* Self-Evaluation */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  Self-Evaluation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Quality Threshold</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-2xl font-bold text-foreground"
                        data-testid="text-eval-threshold"
                      >
                        {data.selfEvalThreshold}
                      </span>
                      <span className="text-sm text-muted-foreground">/ 10</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Translations scoring below this trigger iterative improvement
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Max Iterations</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-2xl font-bold text-foreground"
                        data-testid="text-max-iterations"
                      >
                        {data.maxIterations}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Maximum self-eval improvement cycles per translation
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Engine Priority */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <SettingsIcon className="h-4 w-4 text-primary" />
                  Engine Priority Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Engines are tried in this order when selecting the best translation.
                  Ensemble is always preferred if available.
                </p>
                <div className="space-y-1">
                  {data.enginePriority.map((engine, i) => (
                    <div
                      key={engine}
                      className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/50"
                      data-testid={`engine-priority-${engine}`}
                    >
                      <span className="text-xs font-mono text-muted-foreground w-5">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {ENGINE_LABELS[engine] || engine}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono ml-auto">
                        {engine}
                      </span>
                      {i === 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          Preferred
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* App Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  Application Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Version</p>
                    <p className="text-sm font-mono font-medium text-foreground mt-0.5" data-testid="text-version">
                      v{data.version}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Uptime</p>
                    <p className="text-sm font-medium text-foreground mt-0.5 flex items-center gap-1.5" data-testid="text-uptime">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatUptime(data.uptime)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}
