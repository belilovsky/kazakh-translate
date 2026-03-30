export interface TranslationResult {
  engine: string;
  text: string;
  confidence?: number;
  error?: string;
  latencyMs: number;
}

export interface TranslationEngine {
  name: string;
  translate(text: string, sourceLang: string, targetLang: string): Promise<TranslationResult>;
}
