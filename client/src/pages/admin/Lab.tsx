import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FlaskConical, Clock, Trophy, AlertTriangle, Sparkles } from "lucide-react";
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

interface TranslateResponse {
  id: number;
  bestTranslation: {
    engine: string;
    text: string;
  };
  allResults: EngineResult[];
  sourceLang: string;
  targetLang: string;
  meta?: {
    evalScore?: number;
    evalIterations?: number;
    evalIssues?: string[];
  };
}

export default function LabPage() {
  const [text, setText] = useState("");
  const [sourceLang, setSourceLang] = useState("ru");
  const [result, setResult] = useState<TranslateResponse | null>(null);

  const translateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/translate", {
        text,
        sourceLang,
        targetLang: "kk",
      });
      return (await res.json()) as TranslateResponse;
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const successResults = result?.allResults.filter((r) => !r.error && r.text) ?? [];
  const errorResults = result?.allResults.filter((r) => r.error) ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground" data-testid="text-page-title">
            Translation Lab
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Compare all engine outputs side-by-side
          </p>
        </div>

        {/* Input section */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[250px]">
                <Textarea
                  placeholder="Enter text to translate..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  className="resize-none"
                  data-testid="input-lab-text"
                />
              </div>
              <div className="flex items-end gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">From</label>
                  <Select value={sourceLang} onValueChange={setSourceLang}>
                    <SelectTrigger className="w-[120px] h-9" data-testid="select-lab-source-lang">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">Russian</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">To</label>
                  <div className="h-9 px-3 flex items-center border rounded-md bg-muted text-sm text-muted-foreground">
                    Kazakh
                  </div>
                </div>
                <Button
                  onClick={() => translateMutation.mutate()}
                  disabled={!text.trim() || translateMutation.isPending}
                  className="h-9"
                  data-testid="button-lab-translate"
                >
                  {translateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      Translating...
                    </>
                  ) : (
                    <>
                      <FlaskConical className="h-4 w-4 mr-1.5" />
                      Test Translate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading state */}
        {translateMutation.isPending && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Error state */}
        {translateMutation.isError && (
          <Card className="border-destructive/50">
            <CardContent className="p-4 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">
                {translateMutation.error?.message ?? "Translation failed"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && !translateMutation.isPending && (
          <div className="space-y-4">
            {/* Best result banner */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <Trophy className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                        Best Translation
                      </p>
                      <Badge variant="secondary" className="text-[10px]">
                        {ENGINE_LABELS[result.bestTranslation.engine] || result.bestTranslation.engine}
                      </Badge>
                      {result.meta?.evalScore != null && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            result.meta.evalScore >= 9
                              ? "text-emerald-600 border-emerald-300 dark:text-emerald-400"
                              : result.meta.evalScore >= 7
                              ? "text-amber-600 border-amber-300 dark:text-amber-400"
                              : "text-destructive border-destructive/30"
                          }`}
                        >
                          <Sparkles className="h-3 w-3 mr-0.5" />
                          Score: {result.meta.evalScore}/10
                        </Badge>
                      )}
                    </div>
                    <p className="text-base text-foreground">{result.bestTranslation.text}</p>
                    {result.meta?.evalIssues && result.meta.evalIssues.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {result.meta.evalIssues.map((issue, i) => (
                          <p key={i} className="text-[11px] text-muted-foreground">
                            • {issue}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* All engine results grid */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">
                All Engine Results ({successResults.length} successful, {errorResults.length} failed)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {successResults.map((r, i) => {
                  const isBest = r.engine === result.bestTranslation.engine;
                  return (
                    <Card
                      key={`${r.engine}-${i}`}
                      className={isBest ? "border-primary/30" : ""}
                      data-testid={`card-result-${r.engine}`}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={isBest ? "default" : "secondary"} className="text-[10px]">
                              {ENGINE_LABELS[r.engine] || r.engine}
                            </Badge>
                            {isBest && (
                              <Trophy className="h-3 w-3 text-primary" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            {r.latencyMs != null && r.latencyMs > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Clock className="h-3 w-3" />
                                {r.latencyMs}ms
                              </span>
                            )}
                            {r.confidence != null && (
                              <span>{(r.confidence * 100).toFixed(0)}% conf</span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{r.text}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Errors */}
            {errorResults.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3">
                  Failed Engines
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {errorResults.map((r, i) => (
                    <Card
                      key={`err-${r.engine}-${i}`}
                      className="border-destructive/20"
                      data-testid={`card-error-${r.engine}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <Badge variant="destructive" className="text-[10px] shrink-0">
                            {ENGINE_LABELS[r.engine] || r.engine}
                          </Badge>
                          <p className="text-xs text-destructive">{r.error}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
