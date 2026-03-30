import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Sun, Moon, Copy, Check, ThumbsUp, ThumbsDown,
  ChevronDown, ChevronUp, History, X, ArrowRightLeft,
  Sparkles, Clock, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  confidence?: number;
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

const ENGINE_LABELS: Record<string, string> = {
  ensemble: "Ensemble",
  openai: "GPT-4o",
  gemini: "Gemini",
  tilmash: "Qwen 72B",
  deepl: "DeepL",
  yandex: "Yandex",
};

// Kazakh ornament SVG logo
function KaztilshiLogo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Қазтілші логотип"
      className="shrink-0"
    >
      <circle cx="16" cy="16" r="15" fill="hsl(var(--primary))" />
      <rect x="8" y="9" width="2.5" height="14" rx="1.25" fill="white" />
      <line x1="10.5" y1="16" x2="20" y2="9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="10.5" y1="16" x2="20" y2="23" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
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
  const [variantsOpen, setVariantsOpen] = useState(false);
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
        title: "Қате",
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
      toast({ title: "Бағалау сақталды" });
    },
  });

  const handleTranslate = () => {
    const trimmed = sourceText.trim();
    if (!trimmed) return;
    setResult(null);
    setVariantsOpen(false);
    translateMutation.mutate({
      text: trimmed,
      sourceLang,
      targetLang: "kk",
    });
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "Көшіру сәтсіз", variant: "destructive" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleTranslate();
    }
  };

  const handleClear = () => {
    setSourceText("");
    setResult(null);
    setVariantsOpen(false);
    textareaRef.current?.focus();
  };

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.max(200, Math.min(el.scrollHeight, 400)) + "px";
    }
  }, [sourceText]);

  const charCount = sourceText.length;
  const maxChars = 5000;
  const isLoading = translateMutation.isPending;

  const langOptions: { value: SourceLang; label: string }[] = [
    { value: "ru", label: "Русский" },
    { value: "en", label: "English" },
  ];

  // Get individual engine results (excluding ensemble)
  const engineResults = result?.allResults?.filter((r) => r.engine !== "ensemble") ?? [];
  const ensembleResult = result?.allResults?.find((r) => r.engine === "ensemble");
  // The displayed translation is ensemble if available, otherwise bestTranslation
  const displayedText = ensembleResult?.text ?? result?.bestTranslation?.text ?? "";
  const displayedEngine = ensembleResult ? "ensemble" : result?.bestTranslation?.engine ?? "";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <KaztilshiLogo size={28} />
            <span className="font-semibold text-base tracking-tight">Қазтілші</span>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link href="/history" data-testid="history-link">
                <History className="h-4 w-4 mr-1.5" />
                Тарих
              </Link>
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  data-testid="theme-toggle"
                  className="text-muted-foreground"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{theme === "dark" ? "Жарық тема" : "Қараңғы тема"}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>

      {/* Main Translation Area */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {/* Language bar */}
        <div className="flex items-center gap-0 mb-0 rounded-t-lg border border-b-0 border-border bg-muted/30 overflow-hidden">
          {/* Source language tabs */}
          <div className="flex items-center flex-1">
            {langOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSourceLang(opt.value)}
                data-testid={`lang-${opt.value}`}
                className={`px-5 py-3 text-sm font-medium transition-colors relative ${
                  sourceLang === opt.value
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
                {sourceLang === opt.value && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
                )}
              </button>
            ))}
          </div>

          {/* Arrow divider */}
          <div className="flex items-center px-3">
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Target language */}
          <div className="flex items-center flex-1">
            <button
              className="px-5 py-3 text-sm font-medium text-primary relative"
              data-testid="lang-kk"
            >
              Қазақша
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
            </button>
          </div>
        </div>

        {/* Two-panel translation area */}
        <div className="grid grid-cols-1 md:grid-cols-2 border border-border rounded-b-lg overflow-hidden" data-testid="translation-panels">
          {/* LEFT PANEL — Source */}
          <div className="relative bg-background border-r-0 md:border-r border-border flex flex-col">
            <textarea
              ref={textareaRef}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value.slice(0, maxChars))}
              onKeyDown={handleKeyDown}
              placeholder="Мәтінді енгізіңіз..."
              className="w-full resize-none bg-transparent text-base leading-relaxed p-5 pb-12 outline-none placeholder:text-muted-foreground/60 min-h-[200px]"
              data-testid="source-textarea"
              aria-label="Бастапқы мәтін"
            />

            {/* Source panel footer */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2.5 bg-background/80 backdrop-blur-sm">
              <div className="flex items-center gap-1">
                {sourceText && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClear}
                        className="h-8 w-8 text-muted-foreground"
                        data-testid="clear-source"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Тазарту</TooltipContent>
                  </Tooltip>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`text-xs tabular-nums ${
                    charCount > maxChars * 0.9
                      ? "text-destructive"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {charCount.toLocaleString()} / {maxChars.toLocaleString()}
                </span>
                <Button
                  onClick={handleTranslate}
                  disabled={isLoading || !sourceText.trim()}
                  size="sm"
                  className="font-medium gap-1.5"
                  data-testid="translate-button"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Аудару...
                    </>
                  ) : (
                    "Аудару"
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL — Translation Result */}
          <div className="relative bg-muted/20 flex flex-col min-h-[200px]">
            {/* Loading state */}
            {isLoading && (
              <div className="p-5 space-y-3" data-testid="loading-skeleton">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Аудармашылар жұмыс істеуде...</span>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            )}

            {/* Result */}
            {result && !isLoading && (
              <div className="flex flex-col flex-1">
                {/* Translation text */}
                <div className="flex-1 p-5 pb-12">
                  <p className="text-base leading-relaxed text-foreground" data-testid="best-translation-text">
                    {displayedText}
                  </p>

                  {/* Ensemble badge */}
                  {displayedEngine === "ensemble" && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs text-primary font-medium">
                        Ensemble — барлық аудармашылардың ең жақсы нұсқасы
                      </span>
                    </div>
                  )}
                </div>

                {/* Result panel footer */}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2.5 bg-muted/20">
                  <div className="flex items-center gap-1">
                    {/* Copy */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(displayedText, "best")}
                          className="h-8 w-8 text-muted-foreground"
                          data-testid="copy-best-translation"
                        >
                          {copiedId === "best" ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Көшіру</TooltipContent>
                    </Tooltip>

                    {/* Rating */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => rateMutation.mutate({ id: result.id, rating: 5 })}
                          disabled={rateMutation.isPending}
                          data-testid="rate-thumbs-up"
                          className="h-8 w-8 text-muted-foreground hover:text-green-600"
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Жақсы аударма</TooltipContent>
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
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Нашар аударма</TooltipContent>
                    </Tooltip>
                  </div>

                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {ENGINE_LABELS[displayedEngine] ?? displayedEngine}
                  </Badge>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!result && !isLoading && (
              <div className="flex items-center justify-center flex-1 p-5">
                <p className="text-sm text-muted-foreground/50">Аударма</p>
              </div>
            )}
          </div>
        </div>

        {/* Keyboard hint */}
        {!result && !isLoading && (
          <div className="text-center text-muted-foreground/50 text-xs py-3">
            <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px]">Ctrl</kbd>
            {" + "}
            <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px]">Enter</kbd>
            {" — жылдам аудару"}
          </div>
        )}

        {/* All variants collapsible */}
        {result && !isLoading && engineResults.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setVariantsOpen((v) => !v)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2"
              data-testid="all-variants-trigger"
            >
              {variantsOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              <span>Барлық нұсқалар ({engineResults.length})</span>
            </button>

            {variantsOpen && (
              <div className="space-y-2 mt-2" data-testid="all-variants-list">
                {engineResults.map((er, idx) => (
                  <div
                    key={`${er.engine}-${idx}`}
                    className={`rounded-lg border p-4 ${
                      er.error
                        ? "border-destructive/20 bg-destructive/5"
                        : "border-border bg-card"
                    }`}
                    data-testid={`engine-result-${idx}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={er.error ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {ENGINE_LABELS[er.engine] ?? er.engine}
                        </Badge>
                        {er.latencyMs !== undefined && !er.error && (
                          <span className="text-xs text-muted-foreground tabular-nums flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {(er.latencyMs / 1000).toFixed(1)}с
                          </span>
                        )}
                        {er.confidence !== undefined && !er.error && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {Math.round(er.confidence * 100)}%
                          </span>
                        )}
                      </div>
                      {!er.error && er.text && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(er.text!, `engine-${idx}`)}
                          className="h-7 w-7 text-muted-foreground"
                        >
                          {copiedId === `engine-${idx}` ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                    {er.error ? (
                      <p className="text-sm text-destructive">{er.error}</p>
                    ) : (
                      <p className="text-sm text-foreground leading-relaxed">{er.text}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
