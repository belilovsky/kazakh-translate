import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

interface EngineResult {
  engine: string;
  text?: string;
  error?: string;
  confidence?: number;
  latencyMs?: number;
}

interface Translation {
  id: number;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  engine: string;
  allResults: string;
  rating: number | null;
  createdAt: string;
}

interface PaginatedResponse {
  data: Translation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function TranslationsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sourceLang, setSourceLang] = useState<string>("all");
  const [engine, setEngine] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { toast } = useToast();

  // Debounce search
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (value: string) => {
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
    setSearchTimeout(timeout);
  };

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", "20");
  if (debouncedSearch) queryParams.set("search", debouncedSearch);
  if (sourceLang !== "all") queryParams.set("sourceLang", sourceLang);
  if (engine !== "all") queryParams.set("engine", engine);

  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ["/api/admin/translations", queryParams.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/admin/translations?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/translations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/translations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Перевод удалён" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleExport = () => {
    window.open("/api/admin/translations/export", "_blank");
  };

  const parseResults = (json: string): EngineResult[] => {
    try {
      return JSON.parse(json) as EngineResult[];
    } catch {
      return [];
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("ru-RU", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground" data-testid="text-page-title">
              Переводы
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {data ? `Всего: ${data.total}` : "Загрузка..."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            data-testid="button-export-csv"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Экспорт CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск переводов..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8 h-9"
              data-testid="input-search"
            />
          </div>
          <Select
            value={sourceLang}
            onValueChange={(v) => {
              setSourceLang(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[130px] h-9" data-testid="select-source-lang">
              <SelectValue placeholder="Source Lang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все языки</SelectItem>
              <SelectItem value="ru">Русский</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={engine}
            onValueChange={(v) => {
              setEngine(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px] h-9" data-testid="select-engine">
              <SelectValue placeholder="Engine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все движки</SelectItem>
              {Object.entries(ENGINE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !data?.data?.length ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Переводы не найдены
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Исходник</TableHead>
                      <TableHead>Перевод</TableHead>
                      <TableHead className="w-20">Язык</TableHead>
                      <TableHead className="w-28">Движок</TableHead>
                      <TableHead className="w-28">Дата</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((t) => {
                      const isExpanded = expandedId === t.id;
                      const results = isExpanded ? parseResults(t.allResults) : [];
                      return (
                        <>
                          <TableRow
                            key={t.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setExpandedId(isExpanded ? null : t.id)}
                            data-testid={`row-translation-${t.id}`}
                          >
                            <TableCell className="text-xs text-muted-foreground font-mono">
                              {t.id}
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              <p className="text-sm truncate">{t.sourceText}</p>
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              <p className="text-sm truncate">{t.translatedText}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px]">
                                {t.sourceLang.toUpperCase()}→KK
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">
                                {ENGINE_LABELS[t.engine] || t.engine}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDate(t.createdAt)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedId(isExpanded ? null : t.id);
                                  }}
                                  data-testid={`button-expand-${t.id}`}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteMutation.mutate(t.id);
                                  }}
                                  disabled={deleteMutation.isPending}
                                  data-testid={`button-delete-${t.id}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`${t.id}-expanded`}>
                              <TableCell colSpan={7} className="bg-muted/30 p-4">
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Все результаты движков
                                  </p>
                                  {results.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                      Детальные результаты недоступны
                                    </p>
                                  ) : (
                                    <div className="grid gap-2">
                                      {results.map((r, i) => (
                                        <div
                                          key={i}
                                          className="flex items-start gap-3 p-2 rounded-md bg-background border border-border"
                                        >
                                          <Badge
                                            variant={r.error ? "destructive" : "secondary"}
                                            className="text-[10px] shrink-0 mt-0.5"
                                          >
                                            {ENGINE_LABELS[r.engine] || r.engine}
                                          </Badge>
                                          <div className="flex-1 min-w-0">
                                            {r.error ? (
                                              <p className="text-sm text-destructive">{r.error}</p>
                                            ) : (
                                              <p className="text-sm">{r.text}</p>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                                            {r.latencyMs != null && r.latencyMs > 0 && (
                                              <span>{r.latencyMs}ms</span>
                                            )}
                                            {r.confidence != null && (
                                              <span>{(r.confidence * 100).toFixed(0)}%</span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Страница {data.page} из {data.totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= (data?.totalPages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
