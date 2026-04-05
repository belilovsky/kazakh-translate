import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Sun, Moon, Copy, Check, ThumbsUp, ThumbsDown,
  ChevronDown, ChevronUp, History, X, ArrowLeftRight,
  Sparkles, Clock, Loader2, Mic, MicOff, Volume2,
  Shield, Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "@/components/theme-provider";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PipelineViz from "@/components/PipelineViz";
import TTSPlayer from "@/components/TTSPlayer";

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
  claude: "Claude Sonnet",
  gemini: "Gemini 2.5",
  deepseek: "DeepSeek",
  grok: "Grok",
  tilmash: "Qwen 72B",
  mistral: "Mistral",
  perplexity: "Perplexity",
  deepl: "DeepL",
  yandex: "Yandex",
};

// Engine accent colors for variant cards
const ENGINE_COLORS: Record<string, { badge: string; ring: string }> = {
  openai:     { badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20", ring: "ring-emerald-500/15" },
  claude:     { badge: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20",   ring: "ring-orange-500/15"  },
  gemini:     { badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",           ring: "ring-blue-500/15"    },
  deepseek:   { badge: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",           ring: "ring-cyan-500/15"    },
  grok:       { badge: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20",   ring: "ring-purple-500/15"  },
  tilmash:    { badge: "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/20",           ring: "ring-teal-500/15"    },
  mistral:    { badge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",   ring: "ring-indigo-500/15"  },
  perplexity: { badge: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20",           ring: "ring-rose-500/15"    },
  deepl:      { badge: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/20",              ring: "ring-sky-500/15"     },
  yandex:     { badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",       ring: "ring-amber-500/15"   },
  ensemble:   { badge: "bg-primary/15 text-primary border-primary/20",                                 ring: "ring-primary/15"     },
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

// Score ring — a small SVG circle progress indicator
function ScoreRing({ score }: { score: number }) {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const pct = score / 10;
  const dashOffset = circumference * (1 - pct);
  const color =
    score >= 9 ? "#10b981"
    : score >= 7 ? "#f59e0b"
    : "#ef4444";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative inline-flex items-center justify-center w-9 h-9 shrink-0">
          <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
            <circle
              cx="18" cy="18" r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-muted/20"
            />
            <circle
              cx="18" cy="18" r={radius}
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 0.7s ease" }}
            />
          </svg>
          <span
            className="absolute text-[9px] font-bold font-mono tabular-nums"
            style={{ color }}
          >
            {score}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        Качество перевода: {score >= 9 ? "высокое" : score >= 7 ? "среднее" : "требует улучшения"} ({score}/10)
      </TooltipContent>
    </Tooltip>
  );
}

// Animated shimmer loading skeleton
function ResultSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-5 sm:p-6 flex-1">
      {[100, 85, 92, 60].map((w, i) => (
        <div
          key={i}
          className="relative h-5 rounded-lg bg-muted/25 overflow-hidden"
          style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }}
        >
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-shimmer"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        </div>
      ))}
      <div
        className="relative h-5 rounded-lg bg-muted/20 overflow-hidden mt-1"
        style={{ width: "45%" }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-shimmer" style={{ animationDelay: "600ms" }} />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <div className="relative h-5 w-20 rounded-full bg-muted/20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-shimmer" style={{ animationDelay: "800ms" }} />
        </div>
        <div className="relative h-5 w-14 rounded-full bg-muted/15 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-shimmer" style={{ animationDelay: "950ms" }} />
        </div>
      </div>
    </div>
  );
}

export default function TranslateV2Page() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [textareaFocused, setTextareaFocused] = useState(false);

  const [sourceText, setSourceText] = useState("");
  const [sourceLang, setSourceLang] = useState<SourceLang>("ru");
  const [result, setResult] = useState<TranslateResponse | null>(null);
  const [variantsOpen, setVariantsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pipeline progress tracking
  const [elapsedMs, setElapsedMs] = useState(0);
  const translateStartTimeRef = useRef<number>(0);
  const [totalTimeMs, setTotalTimeMs] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pipelinePhase, setPipelinePhase] = useState<string>("");
  const [engineStatuses, setEngineStatuses] = useState<Record<string, { status: "idle" | "running" | "done" | "error"; latencyMs?: number }>>({});
  // Detailed pipeline diagnostics
  const [engineTexts, setEngineTexts] = useState<Record<string, string>>({});
  const [critiqueText, setCritiqueText] = useState<string>("");
  const [ensembleText, setEnsembleText] = useState<string>("");
  const [evalDetails, setEvalDetails] = useState<{ score?: number; issues?: string[]; improved?: boolean; text?: string; mqmScore?: number; mqmErrors?: Array<{ category: string; type: string; severity: string; description: string }> }>({});

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
      toast({ title: "Браузер не поддерживает голосовой ввод", variant: "destructive" });
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
        toast({ title: "Ошибка голосового ввода", description: event.error, variant: "destructive" });
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

  // TTS state
  const [showTTS, setShowTTS] = useState(false);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  // SSE-based translation with live pipeline progress
  const doTranslate = async (text: string, srcLang: string) => {
    setIsLoading(true);
    setResult(null);
    setVariantsOpen(false);
    setElapsedMs(0);
    setTotalTimeMs(null);
    setPipelinePhase("engines");
    setEngineStatuses({});
    setEngineTexts({});
    setCritiqueText("");
    setEnsembleText("");
    setEvalDetails({});
    setShowTTS(false);
    window.speechSynthesis?.cancel();
    translateStartTimeRef.current = Date.now();

    try {
      const resp = await fetch("/api/translate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sourceLang: srcLang, targetLang: "kk" }),
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";

      const processSSE = (text: string) => {
        const blocks = text.split("\n\n");
        for (const block of blocks) {
          if (!block.trim()) continue;
          const lines = block.split("\n");
          let eventType = "";
          let eventData = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
            else if (line.startsWith("data: ")) eventData = line.slice(6);
          }
          if (!eventType || !eventData) continue;
          try {
            const data = JSON.parse(eventData);
            if (eventType === "progress") {
              if (data.phase) setPipelinePhase(data.phase);
              if (data.engine && data.status) {
                setEngineStatuses((prev) => ({
                  ...prev,
                  [data.engine]: { status: data.status as "idle" | "running" | "done" | "error", latencyMs: data.latencyMs },
                }));
              }
              if (data.engine && data.text && data.phase === "engines") {
                setEngineTexts((prev) => ({ ...prev, [data.engine]: data.text }));
              }
              if (data.critique) {
                setCritiqueText(data.critique);
              }
              if (data.phase === "ensemble" && data.text) {
                setEnsembleText(data.text);
              }
              if (data.phase === "selfeval" && (data.evalScore !== undefined || data.evalIssues)) {
                setEvalDetails({
                  score: data.evalScore,
                  issues: data.evalIssues,
                  improved: data.evalImproved,
                  text: data.text,
                  mqmScore: data.mqmScore,
                  mqmErrors: data.mqmErrors,
                });
              }
            } else if (eventType === "result") {
              setTotalTimeMs(Date.now() - translateStartTimeRef.current);
              setResult(data as TranslateResponse);
              queryClient.invalidateQueries({ queryKey: ["/api/translations"] });
            } else if (eventType === "error") {
              toast({ title: "Ошибка", description: data.message, variant: "destructive" });
            }
          } catch {}
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.trim()) processSSE(buffer);
          break;
        }
        buffer += decoder.decode(value, { stream: true });

        const lastDoubleNewline = buffer.lastIndexOf("\n\n");
        if (lastDoubleNewline !== -1) {
          const complete = buffer.slice(0, lastDoubleNewline + 2);
          buffer = buffer.slice(lastDoubleNewline + 2);
          processSSE(complete);
        }
      }
    } catch (err: any) {
      toast({ title: "Ошибка", description: err?.message ?? "Ошибка перевода", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Timer
  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - translateStartTimeRef.current);
    }, 100);
    return () => clearInterval(interval);
  }, [isLoading]);

  const rateMutation = useMutation({
    mutationFn: async ({ id, rating }: { id: number; rating: number }) => {
      const res = await apiRequest("POST", `/api/translations/${id}/rate`, { rating });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Оценка сохранена" });
    },
  });

  const handleTranslate = () => {
    const trimmed = sourceText.trim();
    if (!trimmed) return;
    doTranslate(trimmed, sourceLang);
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
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

  const handleClear = () => {
    setSourceText("");
    setResult(null);
    setVariantsOpen(false);
    setTotalTimeMs(null);
    textareaRef.current?.focus();
  };

  const charCount = sourceText.length;
  const maxChars = 5000;

  const langOptions: { value: SourceLang; label: string }[] = [
    { value: "ru", label: "Русский" },
    { value: "en", label: "English" },
  ];

  const engineResults = result?.allResults?.filter((r) => r.engine !== "ensemble") ?? [];
  const ensembleResult = result?.allResults?.find((r) => r.engine === "ensemble");
  const rawDisplayedText = ensembleResult?.text ?? result?.bestTranslation?.text ?? "";
  // Normalize: mdash → ndash throughout
  const displayedText = rawDisplayedText.replace(/—/g, "–");
  const displayedEngine = ensembleResult ? "ensemble" : result?.bestTranslation?.engine ?? "";

  const evalScore = result?.meta?.evalScore;
  const hasScore = evalScore !== undefined && evalScore > 0;

  // Score badge color
  const scoreBadgeClass = !hasScore ? "" :
    evalScore! >= 9 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25" :
    evalScore! >= 7 ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25" :
    "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25";

  return (
    <div className={`min-h-screen text-foreground flex flex-col bg-noise ${theme === "dark" ? "page-gradient-dark" : "page-gradient-light"}`}>

      {/* ─── Header ─── */}
      <header className="sticky top-0 z-50 bg-background/75 backdrop-blur-xl border-b border-transparent"
        style={{ boxShadow: "0 1px 0 0 hsl(var(--border) / 0.4), 0 4px 24px -4px hsl(var(--primary) / 0.04)" }}
      >
        <div className="max-w-5xl mx-auto px-4 h-[4.5rem] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="animate-float">
              <KaztilshiLogo size={38} />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg tracking-[0.03em] leading-none gradient-text">
                Қазтілші
              </span>
              <span className="text-[10px] text-muted-foreground/60 leading-tight hidden sm:block tracking-[0.12em] uppercase mt-0.5">
                AI-переводчик
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-muted-foreground hover:text-foreground h-9 rounded-xl px-3"
            >
              <Link href="/history" data-testid="history-link-v2">
                <History className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline text-sm">История</span>
              </Link>
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  data-testid="theme-toggle-v2"
                  className="text-muted-foreground hover:text-foreground h-9 w-9 rounded-xl"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{theme === "dark" ? "Светлая тема" : "Тёмная тема"}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>

      {/* ─── Main ─── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-4 py-6 sm:py-10 relative z-10">

        {/* ─── Language bar ─── */}
        <div
          className="flex items-center rounded-2xl rounded-b-none border border-b-0 border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden"
          style={{ boxShadow: "inset 0 -1px 0 0 hsl(var(--border) / 0.3)" }}
        >
          {/* Source language pills */}
          <div className="flex items-center gap-1 flex-1 min-w-0 px-2 sm:px-3 py-2.5">
            {langOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSourceLang(opt.value)}
                data-testid={`lang-v2-${opt.value}`}
                className={`
                  relative flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-sm font-semibold
                  transition-all duration-200 whitespace-nowrap
                  ${sourceLang === opt.value
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }
                `}
              >
                <span>{opt.label}</span>
                {sourceLang === opt.value && (
                  <span className="absolute -bottom-[1px] left-3 right-3 h-[2px] bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Swap arrow — larger, prominent, rotate animation on hover */}
          <div className="flex items-center px-2 sm:px-4 shrink-0">
            <div
              className="group w-9 h-9 rounded-full border border-border/60 bg-background/60 flex items-center justify-center
                cursor-default hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 shadow-sm"
            >
              <ArrowLeftRight
                className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all duration-300
                  group-hover:scale-110"
              />
            </div>
          </div>

          {/* Target language */}
          <div className="flex items-center flex-1 min-w-0 justify-end sm:justify-start px-2 sm:px-3 py-2.5">
            <button
              className="relative flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-sm font-semibold
                bg-primary/10 text-primary cursor-default"
              data-testid="lang-v2-kk"
            >
              <span>Қазақша</span>
              <span className="absolute -bottom-[1px] left-3 right-3 h-[2px] bg-primary rounded-full" />
            </button>
          </div>
        </div>

        {/* ─── Two-panel translation area ─── */}
        <div
          className="glass-card grid grid-cols-1 md:grid-cols-2 rounded-b-2xl overflow-hidden"
          data-testid="translation-panels-v2"
        >
          {/* ════ LEFT PANEL — Source ════ */}
          <div className="relative flex flex-col bg-background/40">

            {/* Textarea — with keyboard hint overlay */}
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value.slice(0, maxChars))}
                onKeyDown={handleKeyDown}
                onFocus={() => setTextareaFocused(true)}
                onBlur={() => setTextareaFocused(false)}
                placeholder="Введите текст..."
                className="w-full resize-none bg-transparent text-[18px] leading-relaxed p-5 sm:p-6 pb-16
                  outline-none placeholder:text-muted-foreground/35 min-h-[280px] overflow-y-auto max-h-[500px]
                  font-sans"
                data-testid="source-textarea-v2"
                aria-label="Исходный текст"
                style={{
                  boxShadow: textareaFocused
                    ? "inset 0 0 0 2px hsl(var(--primary) / 0.12), inset 0 2px 8px hsl(var(--primary) / 0.04)"
                    : "inset 0 2px 8px hsl(var(--foreground) / 0.03)",
                }}
              />

              {/* Keyboard hint — ghost overlay, only when empty */}
              {!sourceText && !isListening && (
                <div className="absolute bottom-4 right-4 sm:right-5 flex items-center gap-1 pointer-events-none select-none opacity-40">
                  <kbd className="px-1.5 py-0.5 bg-muted/60 border border-border/60 rounded text-[10px] font-mono text-muted-foreground">
                    Ctrl
                  </kbd>
                  <span className="text-[10px] text-muted-foreground">+</span>
                  <kbd className="px-1.5 py-0.5 bg-muted/60 border border-border/60 rounded text-[10px] font-mono text-muted-foreground">
                    Enter
                  </kbd>
                  <span className="text-[10px] text-muted-foreground ml-0.5">– перевести</span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

            {/* Source panel footer */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 bg-background/30 backdrop-blur-sm">
              <div className="flex items-center gap-0.5">
                {sourceText && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClear}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                        data-testid="clear-source-v2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Очистить</TooltipContent>
                  </Tooltip>
                )}
                {speechSupported && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleListening}
                        className={`h-8 w-8 rounded-lg ${
                          isListening
                            ? "text-destructive animate-pulse bg-destructive/10"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        data-testid="voice-input-v2"
                      >
                        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isListening ? "Остановить запись" : "Голосовой ввод"}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              <div className="flex items-center gap-2.5 sm:gap-3">
                <span
                  className={`text-[11px] tabular-nums font-mono ${
                    charCount > maxChars * 0.9
                      ? "text-destructive font-medium"
                      : "text-muted-foreground/40"
                  }`}
                >
                  {charCount.toLocaleString()}/{maxChars.toLocaleString()}
                </span>
                <Button
                  onClick={handleTranslate}
                  disabled={isLoading || !sourceText.trim()}
                  size="sm"
                  className="font-semibold gap-1.5 px-5 sm:px-6 h-9 rounded-xl btn-glow"
                  data-testid="translate-button-v2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span className="hidden sm:inline">Переводим...</span>
                      <span className="sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <Languages className="h-3.5 w-3.5 sm:hidden" />
                      <span>Перевести</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* ════ Vertical divider ════ */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border/40 to-transparent pointer-events-none" />

          {/* ════ RIGHT PANEL — Translation Result ════ */}
          <div className="relative flex flex-col bg-card/20 min-h-[280px] border-t md:border-t-0 border-border/30">

            {/* Loading — shimmer skeleton */}
            {isLoading && (
              <div className="flex flex-col flex-1">
                <ResultSkeleton />
                <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
                <div className="px-4 sm:px-5 py-2.5 flex items-center gap-2">
                  <div className="relative h-4 w-4 rounded-full bg-primary/20 overflow-hidden animate-pulse" />
                  <div className="relative h-4 w-24 rounded-lg bg-muted/20 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-shimmer" />
                  </div>
                  <div className="text-xs text-muted-foreground/50 tabular-nums font-mono">
                    {(elapsedMs / 1000).toFixed(1)}с
                  </div>
                </div>
              </div>
            )}

            {/* Result — displayed */}
            {result && !isLoading && (
              <div className="flex flex-col flex-1">
                {/* Translation text — hero */}
                <div className="flex-1 p-5 sm:p-6 pb-20 overflow-y-auto max-h-[500px]">
                  <div
                    className="text-[22px] leading-relaxed text-foreground font-medium tracking-tight space-y-3"
                    data-testid="best-translation-text-v2"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {displayedText.split("\n\n").map((para, pIdx) => (
                      <p key={pIdx} className="mb-3">
                        {para.split("\n").map((line, lIdx, arr) => (
                          <span key={lIdx}>
                            {line}
                            {lIdx < arr.length - 1 && <br />}
                          </span>
                        ))}
                      </p>
                    ))}
                  </div>

                  {/* Source reference — smaller, muted */}
                  {sourceText && (
                    <p className="mt-4 text-[15px] text-muted-foreground/50 leading-relaxed border-t border-border/20 pt-3 italic">
                      {sourceText}
                    </p>
                  )}

                  {/* Meta row */}
                  <div className="mt-4 flex items-center flex-wrap gap-2">
                    {displayedEngine === "ensemble" && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold bg-primary/8 px-2.5 py-1 rounded-full border border-primary/15">
                        <Sparkles className="h-3 w-3" />
                        Ensemble AI
                      </span>
                    )}
                    {hasScore && (
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${scoreBadgeClass}`}>
                        <Shield className="h-3 w-3" />
                        {evalScore}/10
                      </span>
                    )}
                    {result.meta?.evalIterations !== undefined && result.meta.evalIterations > 1 && (
                      <span className="text-[11px] text-muted-foreground/50">
                        +{result.meta.evalIterations - 1} итераций
                      </span>
                    )}
                  </div>
                </div>

                {/* TTS player row */}
                {showTTS && displayedText && (
                  <>
                    <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
                    <div className="px-4 sm:px-5 pt-2.5 pb-1">
                      <TTSPlayer text={displayedText} />
                    </div>
                  </>
                )}

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

                {/* Result panel footer — grouped controls */}
                <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 bg-card/30 backdrop-blur-sm">
                  {/* Left group: Copy | TTS | Rate */}
                  <div className="flex items-center gap-1">
                    {/* Copy — filled, prominent */}
                    <Button
                      size="sm"
                      onClick={() => handleCopy(displayedText, "best")}
                      className={`h-8 gap-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                        copiedId === "best"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                          : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/15"
                      }`}
                      data-testid="copy-best-translation-v2"
                    >
                      {copiedId === "best" ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Скопировано</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Копировать</span>
                        </>
                      )}
                    </Button>

                    {/* TTS toggle */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={showTTS ? "secondary" : "ghost"}
                          size="icon"
                          onClick={() => {
                            if (showTTS) window.speechSynthesis?.cancel();
                            setShowTTS(!showTTS);
                          }}
                          className={`h-8 w-8 rounded-lg ${showTTS ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
                          data-testid="speak-translation-v2"
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{showTTS ? "Скрыть плеер" : "Прослушать"}</TooltipContent>
                    </Tooltip>

                    {/* Separator */}
                    <div className="w-px h-4 bg-border/50 mx-0.5" />

                    {/* Rating */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => rateMutation.mutate({ id: result.id, rating: 5 })}
                          disabled={rateMutation.isPending}
                          data-testid="rate-thumbs-up-v2"
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
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
                          data-testid="rate-thumbs-down-v2"
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Плохой перевод</TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Right group: Time | Engine */}
                  <div className="flex items-center gap-1.5">
                    {totalTimeMs !== null && (
                      <div className="flex items-center gap-1 text-[11px] text-primary font-mono tabular-nums font-medium">
                        <Clock className="h-3 w-3" />
                        {(totalTimeMs / 1000).toFixed(1)}с
                      </div>
                    )}
                    <Badge
                      variant="outline"
                      className="text-[11px] text-muted-foreground font-normal h-6 px-2"
                    >
                      {ENGINE_LABELS[displayedEngine] ?? displayedEngine}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Empty state — animated Sparkles ─── */}
            {!result && !isLoading && (
              <div className="flex items-center justify-center flex-1 p-8">
                <div className="text-center select-none">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/6 border border-primary/10 mb-4 animate-[pulse_3s_ease-in-out_infinite]">
                    <Sparkles className="h-6 w-6 text-primary/40" />
                  </div>
                  <p className="text-sm text-muted-foreground/50 font-medium tracking-wide">
                    Начните вводить текст для перевода
                  </p>
                  <p className="text-xs text-muted-foreground/30 mt-1">
                    Казахский · Ensemble AI
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Pipeline Visualization ─── */}
        {(isLoading || (result && pipelinePhase)) && (
          <div className="mt-4 rounded-2xl overflow-hidden ring-1 ring-border/20" style={{
            background: "linear-gradient(180deg, hsl(var(--card) / 0.8) 0%, hsl(var(--background) / 0.95) 100%)",
          }}>
            <PipelineViz
              isRunning={isLoading}
              elapsedMs={elapsedMs}
              totalMs={totalTimeMs}
              phase={pipelinePhase}
              engineStatuses={engineStatuses}
              engineLabels={ENGINE_LABELS}
              engineTexts={engineTexts}
              critiqueText={critiqueText}
              ensembleText={ensembleText}
              evalDetails={evalDetails}
            />
          </div>
        )}

        {/* ─── All Variants collapsible ─── */}
        {result && !isLoading && engineResults.length > 0 && (
          <div className="mt-4 sm:mt-5">
            <button
              onClick={() => setVariantsOpen((v) => !v)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-2 group"
              data-testid="all-variants-trigger-v2"
            >
              <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${variantsOpen ? "bg-primary/10" : "bg-muted/50"}`}>
                {variantsOpen ? (
                  <ChevronUp className="h-3 w-3 text-primary" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
                )}
              </div>
              <span>Все варианты</span>
              <Badge variant="outline" className="text-[11px] h-5 px-1.5 font-mono">
                {engineResults.length}
              </Badge>
            </button>

            {variantsOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2" data-testid="all-variants-list-v2">
                {engineResults.map((er, idx) => {
                  const colors = ENGINE_COLORS[er.engine] ?? ENGINE_COLORS.ensemble;
                  return (
                    <div
                      key={`${er.engine}-${idx}`}
                      className={`glass-card rounded-xl p-4 ring-1 transition-all ${
                        er.error
                          ? "ring-destructive/15 bg-destructive/5"
                          : `${colors.ring}`
                      }`}
                      data-testid={`engine-result-v2-${idx}`}
                    >
                      {/* Card header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            er.error ? "bg-destructive/10 text-destructive border-destructive/20" : colors.badge
                          }`}>
                            {ENGINE_LABELS[er.engine] ?? er.engine}
                          </span>
                          {er.latencyMs !== undefined && !er.error && (
                            <span className="text-[11px] text-muted-foreground/60 tabular-nums flex items-center gap-0.5 font-mono">
                              <Clock className="h-2.5 w-2.5" />
                              {(er.latencyMs / 1000).toFixed(1)}с
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Score ring */}
                          {er.confidence !== undefined && !er.error && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-[11px] text-muted-foreground/60 tabular-nums font-mono">
                                  {Math.round(er.confidence * 100)}%
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Уверенность модели</TooltipContent>
                            </Tooltip>
                          )}
                          {!er.error && er.text && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopy(er.text!, `engine-${idx}`)}
                              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
                            >
                              {copiedId === `engine-${idx}` ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Card body */}
                      {er.error ? (
                        <p className="text-sm text-destructive leading-relaxed">{er.error}</p>
                      ) : (
                        <p className="text-sm text-foreground leading-relaxed">
                          {er.text?.replace(/—/g, "–")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Self-eval issues ─── */}
        {result && !isLoading && variantsOpen && result.meta?.evalIssues && result.meta.evalIssues.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <Shield className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Замечания по качеству
              </span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              {result.meta.evalIssues.map((issue, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/20 py-5 text-center relative z-10">
        <p className="text-[11px] text-muted-foreground/35 tracking-[0.08em] font-medium">
          Қазтілші – AI-переводчик на казахский язык
        </p>
      </footer>
    </div>
  );
}
