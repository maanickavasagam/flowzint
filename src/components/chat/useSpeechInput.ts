"use client";

import * as React from "react";

/* The Web Speech API isn't in TypeScript's DOM lib — declare the slice we use. */
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: SpeechRecognitionResultLike;
  };
}
interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function errorMessage(code: string): string | null {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Check your browser's site permissions.";
    case "network":
      return "Couldn't reach the speech service — check your connection.";
    case "no-speech":
      return null; // not a real error, user just didn't say anything
    case "aborted":
      return null; // we triggered this ourselves (unmount/stop)
    case "audio-capture":
      return "No microphone found.";
    default:
      return "Voice input hit a snag — try again.";
  }
}

/**
 * Browser-native speech-to-text for the chat composer. Free, no API, no key.
 * `supported` is false on browsers without the Web Speech API (e.g. Firefox),
 * so the caller can simply hide the mic button.
 */
export function useSpeechInput(onTranscript: (text: string) => void) {
  const [listening, setListening] = React.useState(false);
  const [supported, setSupported] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  // Accumulates finalized phrases across the whole session, so a pause
  // mid-sentence doesn't wipe out what was already dictated.
  const finalTextRef = React.useRef("");
  // Keep the latest callback without re-creating the recognizer each render.
  const cbRef = React.useRef(onTranscript);
  cbRef.current = onTranscript;

  React.useEffect(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    setSupported(true);

    const rec = new Ctor();
    rec.lang = "en-US";
    // Keep listening through natural pauses instead of stopping after the
    // first one — a visitor saying a full sentence needs this.
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalTextRef.current += chunk;
        } else {
          interim += chunk;
        }
      }
      cbRef.current((finalTextRef.current + interim).trim());
    };
    rec.onerror = (e) => {
      setListening(false);
      const msg = errorMessage(e.error);
      if (msg) setError(msg);
    };
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    return () => {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    };
  }, []);

  const toggle = React.useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
      return;
    }
    setError(null);
    finalTextRef.current = "";
    try {
      rec.start();
      setListening(true);
    } catch {
      // start() throws if already running — treat as a no-op.
    }
  }, [listening]);

  return { listening, supported, toggle, error };
}
