import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Sun, Moon, Copy, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, History, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "@/components/theme-provider";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SourceLang = "ru" | "en";

interface EngineResult {
  engine: string;
  text?: string;
  error?: string;
  latencyMs?: number;
}

interface TranslateResponse {
  id: number;
  bestTranslation: {
    engine: string;
    text: string;
  };
  allResults: EngineResult[];
  sourceLang: string;
  targetLang: string;
}

// Kazakh ornament SVG logo
function KaztilshiLogo() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Қазтілші логотип"
      className="shrink-0"
    >
      {/* Background circle with primary color */}
      <circle cx="16" cy="16" r="15" fill="hsl(var(--primary))" />
      {/* Stylized Қ letter */}
      <rect x="8" y="9" width="2.5" height="14" rx="1.25" fill="white" />
      <line x1="10.5" y1="16" x2="20" y2="9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="10.5" y1="16" x2="20" y2="23" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      {/* Small ornament dots */}
      <circle cx="22.5" cy="8.5" r="1.2" fill="white" opacity="0.6" />
      <circle cx="22.5" cy="23.5" r="1.2" fill="white" opacity="0.6" />
    </svg>
  );
}

export default function TranslatePage() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [sourceText, setSourceText] = useState("");
  const [sourceLang, setSourceLang] = useState<SourceLang>("ru");
  const [result, setResult] = useState<TranslateResponse | null>(null);
  const [allVariantsOpen, setAllVariantsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const translateMutation = useMutation({
    mutationFn: async (payload: { text: string; sourceLang: string; targetLang: string }) => {
      const res = await apiRequest("POST", "/api/translate", payload);
      return res.json() as Promise<TranslateResponse>;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/translations"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Ошибка перевода",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const rateMutation = useMutation({
    mutationFn: async ({ id, rating }: { id: number; rating: number }) => {
      const res = await apiRequest("POST", `/api/translations/${id}/rate`, { rating });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Оценка сохранена" });
    },
    onError: (err: Error) => {
      toast({
        title: "Не удалось сохранить оценку",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleTranslate = () => {
    if (!sourceText.trim()) {
      toast({ title: "Введите текст для перевода", variant: "destructive" });
      return;
    }
    setResult(null);
    translateMutation.mutate({
      text: sourceText.trim(),
      sourceLang,
      targetLang: "kk",
    });
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast({ title: "Скопировано!" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "Не удалось скопировать", variant: "destructive" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleTranslate();
    }
  };

  const charCount = sourceText.length;
  const maxChars = 5000;

  const langLabels: Record<SourceLang, string> = {
    ru: "Русский",
    en: "English",
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo + Name */}
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <KaztilshiLogo />
            <span className="font-semibold text-base tracking-tight">Қазтілші</span>
          </Link>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  data-testid="theme-toggle"
                  aria-label="Переключить тему"
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
              </TooltipContent>
            </Tooltip>

            <Button variant="ghost" size="sm" asChild>
              <Link href="/history" data-testid="history-link">
                <History className="h-4 w-4 mr-1.5" />
                История
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground mb-1">
            Перевод на казахский язык
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            Перевод с русского или английского на казахский (қазақша)
          </p>
        </div>

        {/* Source language selector */}
        <div className="flex items-center gap-2 mb-3">
          {(["ru", "en"] as SourceLang[]).map((lang) => (
            <Button
              key={lang}
              variant={sourceLang === lang ? "default" : "outline"}
              size="sm"
              onClick={() => setSourceLang(lang)}
              data-testid={`lang-${lang}`}
              className="min-w-[90px]"
            >
              {langLabels[lang]}
            </Button>
          ))}
          <span className="mx-2 text-muted-foreground text-sm">→</span>
          <Badge variant="secondary" className="text-sm font-medium px-3 py-1">
            Қазақша
          </Badge>
        </div>

        {/* Textarea input */}
        <div className="relative mb-3">
          <Textarea
            ref={textareaRef}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value.slice(0, maxChars))}
            onKeyDown={handleKeyDown}
            placeholder="Введите текст для перевода..."
            className="min-h-[200px] resize-y text-base pr-4 pb-8"
            data-testid="source-textarea"
            aria-label="Исходный текст"
          />
          {/* Char counter */}
          <span
            className={`absolute bottom-2.5 right-3 text-xs tabular-nums ${
              charCount > maxChars * 0.9
                ? "text-destructive"
                : "text-muted-foreground"
            }`}
          >
            {charCount.toLocaleString()} / {maxChars.toLocaleString()}
          </span>
        </div>

        {/* Translate button */}
        <Button
          onClick={handleTranslate}
          disabled={translateMutation.isPending || !sourceText.trim()}
          size="lg"
          className="w-full mb-8 font-semibold"
          data-testid="translate-button"
        >
          {translateMutation.isPending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Перевожу...
            </span>
          ) : (
            "Перевести"
          )}
        </Button>

        {/* Loading skeleton */}
        {translateMutation.isPending && (
          <div className="space-y-4" data-testid="loading-skeleton">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <Skeleton className="h-4 w-24 animate-pulse" />
                  <Skeleton className="h-6 w-16 rounded-full animate-pulse" />
                </div>
                <Skeleton className="h-5 w-full mb-2 animate-pulse" />
                <Skeleton className="h-5 w-4/5 mb-2 animate-pulse" />
                <Skeleton className="h-5 w-3/5 animate-pulse" />
                <div className="flex gap-2 mt-4">
                  <Skeleton className="h-8 w-24 rounded animate-pulse" />
                  <Skeleton className="h-8 w-8 rounded animate-pulse" />
                  <Skeleton className="h-8 w-8 rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Results */}
        {result && !translateMutation.isPending && (
          <div className="space-y-4" data-testid="translation-results">
            {/* Best translation card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Лучший перевод
                  </span>
                  <Badge
                    variant="outline"
                    className="text-xs font-medium border-primary/30 text-primary shrink-0"
                    data-testid="best-engine-badge"
                  >
                    {result.bestTranslation.engine}
                  </Badge>
                </div>

                <p className="text-base leading-relaxed text-foreground mb-4" data-testid="best-translation-text">
                  {result.bestTranslation.text}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Copy button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(result.bestTranslation.text, "best")}
                    data-testid="copy-best-translation"
                    className="gap-1.5"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copiedId === "best" ? "Скопировано!" : "Копировать"}
                  </Button>

                  {/* Rating buttons */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => rateMutation.mutate({ id: result.id, rating: 5 })}
                        disabled={rateMutation.isPending}
                        data-testid="rate-thumbs-up"
                        className="h-8 w-8 text-muted-foreground hover:text-green-600"
                        aria-label="Хороший перевод"
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Хороший перевод</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => rateMutation.mutate({ id: result.id, rating: 1 })}
                        disabled={rateMutation.isPending}
                        data-testid="rate-thumbs-down"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label="Плохой перевод"
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Плохой перевод</TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>

            {/* All variants collapsible */}
            {result.allResults && result.allResults.length > 1 && (
              <Collapsible
                open={allVariantsOpen}
                onOpenChange={setAllVariantsOpen}
                data-testid="all-variants-collapsible"
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between font-medium text-muted-foreground hover:text-foreground"
                    data-testid="all-variants-trigger"
                  >
                    <span>
                      Все варианты ({result.allResults.length})
                    </span>
                    {allVariantsOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-2 mt-2">
                  {result.allResults.map((engineResult, idx) => (
                    <Card
                      key={`${engineResult.engine}-${idx}`}
                      className={engineResult.error ? "border-destructive/30 bg-destructive/5" : ""}
                      data-testid={`engine-result-${idx}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={engineResult.error ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {engineResult.engine}
                            </Badge>
                            {engineResult.latencyMs !== undefined && !engineResult.error && (
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {engineResult.latencyMs}ms
                              </span>
                            )}
                          </div>
                          {!engineResult.error && engineResult.text && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleCopy(engineResult.text!, `engine-${idx}`)
                              }
                              className="h-7 w-7 shrink-0"
                              aria-label={`Копировать перевод от ${engineResult.engine}`}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>

                        {engineResult.error ? (
                          <p className="text-sm text-destructive">{engineResult.error}</p>
                        ) : (
                          <p className="text-sm text-foreground leading-relaxed">
                            {engineResult.text}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Translate another */}
            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSourceText("");
                  setResult(null);
                  setTimeout(() => textareaRef.current?.focus(), 50);
                }}
                data-testid="translate-another"
                className="text-muted-foreground hover:text-foreground"
              >
                Перевести ещё один текст
              </Button>
            </div>
          </div>
        )}

        {/* Empty state hint */}
        {!result && !translateMutation.isPending && (
          <div className="text-center text-muted-foreground text-sm py-4">
            <p>Нажмите <kbd className="px-1.5 py-0.5 text-xs bg-muted border border-border rounded">Ctrl+Enter</kbd> для быстрого перевода</p>
          </div>
        )}
      </main>
    </div>
  );
}
