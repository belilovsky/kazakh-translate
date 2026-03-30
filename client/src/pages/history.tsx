import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, ChevronDown, ChevronUp, Clock, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/theme-provider";

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

const LANG_LABELS: Record<string, string> = {
  ru: "Русский",
  en: "English",
  kk: "Қазақша",
};

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

interface HistoryItemProps {
  translation: Translation;
}

function HistoryItem({ translation }: HistoryItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className="cursor-pointer hover:bg-muted/30 transition-colors"
      data-testid={`history-item-${translation.id}`}
      onClick={() => setExpanded((v) => !v)}
    >
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {LANG_LABELS[translation.sourceLang] ?? translation.sourceLang}
            </Badge>
            <span className="text-xs text-muted-foreground">→</span>
            <Badge variant="secondary" className="text-xs">
              {LANG_LABELS[translation.targetLang] ?? translation.targetLang}
            </Badge>
            <Badge variant="outline" className="text-xs font-normal">
              {translation.engine}
            </Badge>
            {translation.rating !== null && (
              <Badge
                variant="outline"
                className={`text-xs ${
                  translation.rating >= 4
                    ? "border-green-500/50 text-green-600 dark:text-green-400"
                    : "border-destructive/50 text-destructive"
                }`}
              >
                {translation.rating >= 4 ? "👍" : "👎"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <Clock className="h-3 w-3" />
            <span>{formatDate(translation.createdAt)}</span>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5 ml-1" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 ml-1" />
            )}
          </div>
        </div>

        {/* Collapsed: truncated preview */}
        {!expanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5 font-medium uppercase tracking-wide">
                Исходный текст
              </p>
              <p className="text-sm text-foreground leading-snug">
                {truncate(translation.sourceText, 120)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5 font-medium uppercase tracking-wide">
                Перевод
              </p>
              <p className="text-sm text-foreground leading-snug">
                {truncate(translation.translatedText, 120)}
              </p>
            </div>
          </div>
        )}

        {/* Expanded: full text */}
        {expanded && (
          <div className="space-y-3 mt-1" data-testid={`history-item-${translation.id}-expanded`}>
            <div>
              <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">
                Исходный текст ({LANG_LABELS[translation.sourceLang] ?? translation.sourceLang})
              </p>
              <p className="text-sm text-foreground leading-relaxed bg-muted/40 rounded-md p-3">
                {translation.sourceText}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">
                Перевод (Қазақша)
              </p>
              <p className="text-sm text-foreground leading-relaxed bg-primary/5 border border-primary/10 rounded-md p-3">
                {translation.translatedText}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function HistoryPage() {
  const { theme, toggleTheme } = useTheme();
  const { data, isLoading, error } = useQuery<Translation[]>({
    queryKey: ["/api/translations"],
    queryFn: async () => {
      const res = await fetch("/api/translations?limit=50");
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/" data-testid="back-to-translate">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Переводчик
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            data-testid="theme-toggle-history"
            aria-label="Переключить тему"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground mb-1">
            История переводов
          </h1>
          <p className="text-sm text-muted-foreground">
            Последние 50 переводов
          </p>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3" data-testid="history-loading">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <Card className="border-destructive/30 bg-destructive/5" data-testid="history-error">
            <CardContent className="p-6 text-center">
              <p className="text-destructive font-medium mb-1">Не удалось загрузить историю</p>
              <p className="text-sm text-muted-foreground">
                {(error as Error).message}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && !error && data && data.length === 0 && (
          <Card data-testid="history-empty">
            <CardContent className="p-10 text-center">
              <p className="text-muted-foreground mb-3">История переводов пуста</p>
              <Button asChild size="sm">
                <Link href="/">Начать перевод</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Translation list */}
        {!isLoading && !error && data && data.length > 0 && (
          <div className="space-y-2" data-testid="history-list">
            {data.map((translation) => (
              <HistoryItem key={translation.id} translation={translation} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
