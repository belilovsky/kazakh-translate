import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Sun, Moon, Copy, Check, ThumbsUp, ThumbsDown,
  ChevronDown, ChevronUp, History, X, ArrowRight,
  Sparkles, Clock, Loader2, Mic, MicOff, Volume2,
  Shield, Languages,
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

interface TranslationMeta {
  evalScore?: number;
  evalIterations?: number;
  evalIssues?: string[];
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
  meta?: TranslationMeta;
}

const ENGINE_LABELS: Record<string, string> = {
  ensemble: "Ensemble AI",
  openai: "GPT-4o",
  gemini: "Gemini 2.5",
  tilmash: "Qwen 72B",
  deepl: "DeepL",
  yandex: "Yandex",
};

// Kazakh shanyrak (шаңырақ) inspired logo — the crown of the yurt
function KaztilshiLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Қазтілші логотип"
      className="shrink-0"
    >
      {/* Outer circle — sun/shanyrak */}
      <circle cx="20" cy="20" r="18" stroke="hsl(var(--primary))" strokeWidth="2.5" fill="none" />
      {/* Inner diamond — ornamental */}
      <path
        d="M20 6L30 20L20 34L10 20Z"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        fill="hsl(var(--primary))"
        fillOpacity="0.12"
      />
      {/* Cross beams like shanyrak */}
      <line x1="8" y1="20" x2="32" y2="20" stroke="hsl(var(--primary))" strokeWidth="1.5" />
      <line x1="20" y1="8" x2="20" y2="32" stroke="hsl(var(--primary))" strokeWidth="1.5" />
      {/* Center dot */}
      <circle cx="20" cy="20" r="3" fill="hsl(var(--primary))" />
      {/* Қ letter hint */}
      <text
        x="20"
        y="22"
        textAnchor="middle"
        dominantBaseline="central"
        fill="hsl(var(--primary-foreground))"
        fontSize="5"
        fontWeight="700"
        fontFamily="sans-serif"
      >
        Қ
      </text>
    </svg>
  );
}

function QualityBadge({ score }: { score: number }) {
  const color =
    score >= 9
      ? "text-emerald-600 dark:text-emerald-400"
      : score >= 7
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-500 dark:text-red-400";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
          <Shield className="h-3 w-3" />
          {score}/10
        </span>
      </TooltipTrigger>
      <TooltipContent>
        Аударма сапасы: {score >= 9 ? "жоғары" : score >= 7 ? "орташа" : "жақсарту қажет"}
      </TooltipContent>
    </Tooltip>
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

  // Voice input
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const speechSupported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const LANG_CODES: Record<SourceLang, string> = {
    ru: "ru-RU",
    en: "en-US",
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Браузер дауыстық енгізуді қолдамайды", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = LANG_CODES[sourceLang];
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = sourceText;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + transcript;
          setSourceText(finalTranscript);
        } else {
          interim += transcript;
        }
      }
      if (interim) {
        setSourceText(finalTranscript + (finalTranscript ? " " : "") + interim);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "aborted") {
        toast({ title: "Дауыстық енгізу қатесі", description: event.error, variant: "destructive" });
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  // TTS
  const handleSpeak = (text: string) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "kk-KZ";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

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
      el.style.height = Math.max(180, Math.min(el.scrollHeight, 400)) + "px";
    }
  }, [sourceText]);

  const charCount = sourceText.length;
  const maxChars = 5000;
  const isLoading = translateMutation.isPending;

  const langOptions: { value: SourceLang; label: string; flag: string }[] = [
    { value: "ru", label: "Русский", flag: "🇷🇺" },
    { value: "en", label: "English", flag: "🇬🇧" },
  ];

  const engineResults = result?.allResults?.filter((r) => r.engine !== "ensemble") ?? [];
  const ensembleResult = result?.allResults?.find((r) => r.engine === "ensemble");
  const displayedText = ensembleResult?.text ?? result?.bestTranslation?.text ?? "";
  const displayedEngine = ensembleResult ? "ensemble" : result?.bestTranslation?.engine ?? "";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <KaztilshiLogo size={32} />
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight leading-none">Қазтілші</span>
              <span className="text-[10px] text-muted-foreground leading-tight hidden sm:block">AI аудармашы</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link href="/history" data-testid="history-link">
                <History className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Тарих</span>
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

      {/* Main */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6">
        {/* Language selector bar */}
        <div className="flex items-center gap-0 mb-0 rounded-t-xl border border-b-0 border-border bg-card/50 overflow-hidden">
          {/* Source language tabs */}
          <div className="flex items-center flex-1 min-w-0">
            {langOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSourceLang(opt.value)}
                data-testid={`lang-${opt.value}`}
                className={`flex items-center gap-1.5 px-3 sm:px-5 py-3 text-sm font-medium transition-all relative whitespace-nowrap ${
                  sourceLang === opt.value
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="text-base leading-none">{opt.flag}</span>
                <span className="hidden sm:inline">{opt.label}</span>
                {sourceLang === opt.value && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Arrow */}
          <div className="flex items-center px-2 sm:px-4">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <ArrowRight className="h-3 w-3 text-primary" />
            </div>
          </div>

          {/* Target language */}
          <div className="flex items-center flex-1 min-w-0 justify-end sm:justify-start">
            <button
              className="flex items-center gap-1.5 px-3 sm:px-5 py-3 text-sm font-medium text-primary relative whitespace-nowrap"
              data-testid="lang-kk"
            >
              <span className="text-base leading-none">🇰🇿</span>
              <span className="hidden sm:inline">Қазақша</span>
              <span className="sm:hidden">ҚАЗ</span>
              <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full" />
            </button>
          </div>
        </div>

        {/* Two-panel translation area */}
        <div className="grid grid-cols-1 md:grid-cols-2 border border-border rounded-b-xl overflow-hidden shadow-sm" data-testid="translation-panels">
          {/* LEFT PANEL — Source */}
          <div className="relative bg-background border-b md:border-b-0 md:border-r border-border flex flex-col">
            <textarea
              ref={textareaRef}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value.slice(0, maxChars))}
              onKeyDown={handleKeyDown}
              placeholder="Мәтінді енгізіңіз..."
              className="w-full resize-none bg-transparent text-base leading-relaxed p-4 sm:p-5 pb-14 outline-none placeholder:text-muted-foreground/50 min-h-[180px]"
              data-testid="source-textarea"
              aria-label="Бастапқы мәтін"
            />

            {/* Source panel footer */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 sm:px-4 py-2 bg-background/90 backdrop-blur-sm border-t border-border/50">
              <div className="flex items-center gap-0.5">
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
                {speechSupported && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleListening}
                        className={`h-8 w-8 ${
                          isListening
                            ? "text-destructive animate-pulse"
                            : "text-muted-foreground"
                        }`}
                        data-testid="voice-input"
                      >
                        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isListening ? "Тоқтату" : "Дауыспен енгізу"}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <span
                  className={`text-[11px] tabular-nums ${
                    charCount > maxChars * 0.9
                      ? "text-destructive"
                      : "text-muted-foreground/50"
                  }`}
                >
                  {charCount.toLocaleString()}/{maxChars.toLocaleString()}
                </span>
                <Button
                  onClick={handleTranslate}
                  disabled={isLoading || !sourceText.trim()}
                  size="sm"
                  className="font-medium gap-1.5 px-4 sm:px-5 rounded-lg"
                  data-testid="translate-button"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span className="hidden sm:inline">Аударылуда...</span>
                      <span className="sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <Languages className="h-3.5 w-3.5 sm:hidden" />
                      <span className="hidden sm:inline">Аудару</span>
                      <span className="sm:hidden">Аудару</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL — Translation Result */}
          <div className="relative bg-card/30 flex flex-col min-h-[180px]">
            {/* Loading state */}
            {isLoading && (
              <div className="p-4 sm:p-5 space-y-3" data-testid="loading-skeleton">
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-primary rounded-full animate-ping" />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Аудармашылар жұмыс істеуде...
                  </span>
                </div>
                <Skeleton className="h-4 w-full bg-muted/60" />
                <Skeleton className="h-4 w-5/6 bg-muted/60" />
                <Skeleton className="h-4 w-4/6 bg-muted/60" />
              </div>
            )}

            {/* Result */}
            {result && !isLoading && (
              <div className="flex flex-col flex-1">
                {/* Translation text */}
                <div className="flex-1 p-4 sm:p-5 pb-14">
                  <p className="text-base leading-relaxed text-foreground" data-testid="best-translation-text">
                    {displayedText}
                  </p>

                  {/* Quality and engine info */}
                  <div className="mt-3 flex items-center flex-wrap gap-2">
                    {displayedEngine === "ensemble" && (
                      <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                        <Sparkles className="h-3 w-3" />
                        Ensemble
                      </span>
                    )}
                    {result.meta?.evalScore !== undefined && result.meta.evalScore > 0 && (
                      <QualityBadge score={result.meta.evalScore} />
                    )}
                    {result.meta?.evalIterations !== undefined && result.meta.evalIterations > 1 && (
                      <span className="text-[11px] text-muted-foreground">
                        +{result.meta.evalIterations - 1} итерация
                      </span>
                    )}
                  </div>
                </div>

                {/* Result panel footer */}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 sm:px-4 py-2 bg-card/50 backdrop-blur-sm border-t border-border/50">
                  <div className="flex items-center gap-0.5">
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
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Көшіру</TooltipContent>
                    </Tooltip>

                    {/* Listen */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSpeak(displayedText)}
                          className="h-8 w-8 text-muted-foreground"
                          data-testid="speak-translation"
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Тыңдау</TooltipContent>
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
                          className="h-8 w-8 text-muted-foreground hover:text-emerald-600"
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

                  <Badge variant="outline" className="text-[11px] text-muted-foreground font-normal">
                    {ENGINE_LABELS[displayedEngine] ?? displayedEngine}
                  </Badge>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!result && !isLoading && (
              <div className="flex items-center justify-center flex-1 p-5">
                <div className="text-center">
                  <Languages className="h-8 w-8 text-muted-foreground/25 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground/40">Аударма</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Keyboard hint */}
        {!result && !isLoading && (
          <div className="text-center text-muted-foreground/40 text-xs py-3 hidden sm:block">
            <kbd className="px-1.5 py-0.5 bg-muted/50 border border-border rounded text-[10px]">Ctrl</kbd>
            {" + "}
            <kbd className="px-1.5 py-0.5 bg-muted/50 border border-border rounded text-[10px]">Enter</kbd>
            {" — жылдам аудару"}
          </div>
        )}

        {/* All variants collapsible */}
        {result && !isLoading && engineResults.length > 0 && (
          <div className="mt-3 sm:mt-4">
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
                    className={`rounded-xl border p-3 sm:p-4 ${
                      er.error
                        ? "border-destructive/20 bg-destructive/5"
                        : "border-border bg-card/50"
                    }`}
                    data-testid={`engine-result-${idx}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
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
                          className="h-7 w-7 text-muted-foreground shrink-0"
                        >
                          {copiedId === `engine-${idx}` ? (
                            <Check className="h-3 w-3 text-emerald-500" />
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

        {/* Self-eval issues (shown when expanded) */}
        {result && !isLoading && variantsOpen && result.meta?.evalIssues && result.meta.evalIssues.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Сапа бағалау ескертулері
              </span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              {result.meta.evalIssues.map((issue, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5">•</span>
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-3 text-center">
        <p className="text-[11px] text-muted-foreground/40">
          Қазтілші — AI негізіндегі қазақ тілі аудармашысы
        </p>
      </footer>
    </div>
  );
}
