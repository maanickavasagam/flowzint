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
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: Event) => void) | null;
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

/**
 * Browser-native speech-to-text for the chat composer. Free, no API, no key.
 * `supported` is false on browsers without the Web Speech API (e.g. Firefox),
 * so the caller can simply hide the mic button.
 */
export function useSpeechInput(onTranscript: (text: string) => void) {
  const [listening, setListening] = React.useState(false);
  const [supported, setSupported] = React.useState(false);
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  // Keep the latest callback without re-creating the recognizer each render.
  const cbRef = React.useRef(onTranscript);
  cbRef.current = onTranscript;

  React.useEffect(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    setSupported(true);

    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      cbRef.current(text);
    };
    rec.onerror = () => setListening(false);
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
    try {
      rec.start();
      setListening(true);
    } catch {
      // start() throws if already running — treat as a no-op.
    }
  }, [listening]);

  return { listening, supported, toggle };
}
