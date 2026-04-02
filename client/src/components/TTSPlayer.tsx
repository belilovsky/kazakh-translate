/**
 * TTSPlayer — Kazakh TTS mini-player with controls.
 * Uses Web Speech API with best available kk-KZ voice.
 * Controls: play/pause, stop, speed, progress.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play, Pause, Square, RotateCcw,
  Volume2, VolumeX, Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TTSPlayerProps {
  text: string;
  onClose?: () => void;
}

const SPEEDS = [0.75, 1, 1.25, 1.5];
const SPEED_LABELS: Record<number, string> = { 0.75: "0.75x", 1: "1x", 1.25: "1.25x", 1.5: "1.5x" };

function getBestKazakhVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  // Priority: neural kk-KZ voices, then any kk voice
  const kkVoices = voices.filter(v => v.lang.startsWith("kk"));
  if (kkVoices.length > 0) {
    // Prefer female voice (Aigul) for natural sound
    const aigul = kkVoices.find(v => v.name.toLowerCase().includes("aigul"));
    if (aigul) return aigul;
    // Any kk voice
    return kkVoices[0];
  }
  return null;
}

export default function TTSPlayer({ text, onClose }: TTSPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [voiceName, setVoiceName] = useState<string>("");
  const [noVoice, setNoVoice] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval>>();
  const startTime = useRef(0);
  const totalEstimate = useRef(0);

  // Load voices (async in some browsers)
  useEffect(() => {
    const loadVoices = () => {
      const v = getBestKazakhVoice();
      if (v) {
        setVoiceName(v.name);
        setNoVoice(false);
      } else {
        // Fallback — check if kk-KZ lang is at least supported
        setNoVoice(true);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, []);

  // Estimate duration: ~4 chars/sec at rate 1 for Kazakh
  const estimateDuration = useCallback((rate: number) => {
    return (text.length / (4 * rate)) * 1000;
  }, [text]);

  const startProgressTracker = useCallback(() => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    startTime.current = Date.now();
    totalEstimate.current = estimateDuration(speed);
    progressTimer.current = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const pct = Math.min(100, (elapsed / totalEstimate.current) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(progressTimer.current);
      }
    }, 200);
  }, [estimateDuration, speed]);

  const handlePlay = useCallback(() => {
    if (isPaused) {
      // Resume
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      startProgressTracker();
      return;
    }

    // Fresh start
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "kk-KZ";
    utter.rate = speed;
    utter.pitch = 1;

    const voice = getBestKazakhVoice();
    if (voice) utter.voice = voice;

    utter.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      startProgressTracker();
    };
    utter.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(100);
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
    utter.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
      if (progressTimer.current) clearInterval(progressTimer.current);
    };

    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, [text, speed, isPaused, startProgressTracker]);

  const handlePause = useCallback(() => {
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsPlaying(false);
    if (progressTimer.current) clearInterval(progressTimer.current);
  }, []);

  const handleStop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    if (progressTimer.current) clearInterval(progressTimer.current);
  }, []);

  const handleRestart = useCallback(() => {
    handleStop();
    setTimeout(() => handlePlay(), 100);
  }, [handleStop, handlePlay]);

  const cycleSpeed = useCallback(() => {
    const idx = SPEEDS.indexOf(speed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    setSpeed(next);
    // If playing, restart with new speed
    if (isPlaying || isPaused) {
      window.speechSynthesis.cancel();
      if (progressTimer.current) clearInterval(progressTimer.current);
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(0);
      // Auto-restart with new speed after brief delay
      setTimeout(() => {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "kk-KZ";
        utter.rate = next;
        const voice = getBestKazakhVoice();
        if (voice) utter.voice = voice;
        utter.onstart = () => {
          setIsPlaying(true);
          startTime.current = Date.now();
          totalEstimate.current = estimateDuration(next);
          progressTimer.current = setInterval(() => {
            const elapsed = Date.now() - startTime.current;
            const pct = Math.min(100, (elapsed / totalEstimate.current) * 100);
            setProgress(pct);
            if (pct >= 100) clearInterval(progressTimer.current);
          }, 200);
        };
        utter.onend = () => {
          setIsPlaying(false);
          setProgress(100);
          if (progressTimer.current) clearInterval(progressTimer.current);
        };
        utterRef.current = utter;
        window.speechSynthesis.speak(utter);
      }, 150);
    }
  }, [speed, isPlaying, isPaused, text, estimateDuration]);

  if (!window.speechSynthesis) return null;

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/30 border border-border/30" data-testid="tts-player">
      {/* Play / Pause */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-primary hover:text-primary"
        onClick={isPlaying ? handlePause : handlePlay}
        data-testid="tts-play-pause"
      >
        {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </Button>

      {/* Stop */}
      {(isPlaying || isPaused || progress > 0) && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={handleStop}
          data-testid="tts-stop"
        >
          <Square className="h-3 w-3" />
        </Button>
      )}

      {/* Restart */}
      {progress >= 100 && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={handleRestart}
          data-testid="tts-restart"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      )}

      {/* Progress bar */}
      <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden min-w-[60px]">
        <div
          className="h-full rounded-full bg-primary/60 transition-all duration-200 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Speed */}
      <button
        onClick={cycleSpeed}
        className="text-[9px] font-mono font-medium text-muted-foreground hover:text-foreground transition-colors px-1 tabular-nums"
        title="Скорость"
        data-testid="tts-speed"
      >
        {SPEED_LABELS[speed]}
      </button>

      {/* Voice indicator */}
      <div className="flex items-center gap-0.5" title={voiceName || "kk-KZ"}>
        {noVoice ? (
          <VolumeX className="h-3 w-3 text-muted-foreground/40" />
        ) : (
          <Volume2 className="h-3 w-3 text-muted-foreground/50" />
        )}
      </div>
    </div>
  );
}
