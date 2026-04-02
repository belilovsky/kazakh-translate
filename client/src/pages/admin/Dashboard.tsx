import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { FileText, Calendar, Trophy, Clock } from "lucide-react";
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

const CHART_COLORS = [
  "hsl(42, 85%, 48%)",
  "hsl(185, 55%, 38%)",
  "hsl(15, 65%, 52%)",
  "hsl(142, 45%, 42%)",
  "hsl(262, 40%, 52%)",
  "hsl(42, 60%, 60%)",
  "hsl(185, 40%, 50%)",
  "hsl(15, 45%, 60%)",
  "hsl(142, 30%, 50%)",
  "hsl(262, 30%, 60%)",
  "hsl(30, 50%, 45%)",
];

interface Stats {
  totalCount: number;
  todayCount: number;
  avgEvalScore: number | null;
  engineBestCounts: Record<string, number>;
}

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

interface Translation {
  id: number;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  engine: string;
  rating: number | null;
  createdAt: string;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-20 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="p-2 rounded-md bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: engineStats, isLoading: engineLoading } = useQuery<EngineStatEntry[]>({
    queryKey: ["/api/admin/engine-stats"],
  });

  const { data: recentData, isLoading: recentLoading } = useQuery<{
    data: Translation[];
    total: number;
  }>({
    queryKey: ["/api/admin/translations", "?page=1&limit=10"],
    queryFn: async () => {
      const res = await fetch("/api/admin/translations?page=1&limit=10");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  // Prepare chart data for engine best counts
  const bestCountData = stats
    ? Object.entries(stats.engineBestCounts)
        .map(([engine, count]) => ({
          engine: ENGINE_LABELS[engine] || engine,
          count,
          rawEngine: engine,
        }))
        .sort((a, b) => b.count - a.count)
    : [];

  // Prepare latency chart data
  const latencyData = engineStats
    ? engineStats
        .filter((e) => e.avgLatencyMs > 0)
        .map((e) => ({
          engine: ENGINE_LABELS[e.engine] || e.engine,
          latency: e.avgLatencyMs,
          rawEngine: e.engine,
        }))
        .sort((a, b) => a.latency - b.latency)
    : [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground" data-testid="text-page-title">
            Обзор
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Статистика сервиса переводов
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Всего переводов"
            value={stats?.totalCount ?? 0}
            icon={FileText}
            loading={statsLoading}
          />
          <StatCard
            title="Сегодня"
            value={stats?.todayCount ?? 0}
            icon={Calendar}
            loading={statsLoading}
          />
          <StatCard
            title="Лучший движок"
            value={
              bestCountData.length > 0
                ? bestCountData[0].engine
                : "–"
            }
            subtitle={
              bestCountData.length > 0
                ? `Выбран ${bestCountData[0].count} раз`
                : undefined
            }
            icon={Trophy}
            loading={statsLoading}
          />
          <StatCard
            title="Самый быстрый"
            value={
              latencyData.length > 0
                ? latencyData[0].engine
                : "–"
            }
            subtitle={
              latencyData.length > 0
                ? `${latencyData[0].latency}мс средн.`
                : undefined
            }
            icon={Clock}
            loading={engineLoading}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Engine Performance Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Рейтинг движков</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : bestCountData.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                  Нет данных
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={bestCountData}
                    margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="engine"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      angle={-35}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {bestCountData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Average Latency Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Средняя латентность (мс)</CardTitle>
            </CardHeader>
            <CardContent>
              {engineLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : latencyData.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                  Нет данных
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={latencyData}
                    margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="engine"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      angle={-35}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number) => [`${value}мс`, "Латентность"]}
                    />
                    <Bar dataKey="latency" radius={[4, 4, 0, 0]} fill="hsl(185, 55%, 38%)">
                      {latencyData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[(i + 1) % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Translations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Последние переводы</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !recentData?.data?.length ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Переводов пока нет
              </p>
            ) : (
              <div className="divide-y divide-border">
                {recentData.data.map((t) => (
                  <div key={t.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{t.sourceText}</p>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        → {t.translatedText}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-[10px]">
                        {t.sourceLang.toUpperCase()} → KK
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {ENGINE_LABELS[t.engine] || t.engine}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
