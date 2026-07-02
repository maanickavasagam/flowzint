"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles,
  Send,
  X,
  CalendarCheck,
  Check,
  BookOpen,
  Loader2,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { BookingSlot } from "@/lib/types";

interface UiMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
}

interface TurnActions {
  booking?: boolean;
  newsletter?: boolean;
  resource?: { title: string; description: string; url: string };
}

const SID_KEY = "flowzint_sid";

function newSid() {
  return `sess_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function ChatWidget({
  page,
  autoOpen = false,
}: {
  page: string;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [booted, setBooted] = React.useState(false);
  const [messages, setMessages] = React.useState<UiMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const [actions, setActions] = React.useState<TurnActions>({});
  const [options, setOptions] = React.useState<string[]>([]);
  const [sessionId, setSessionId] = React.useState<string>("");
  const [unread, setUnread] = React.useState(0);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Load / persist session id.
  React.useEffect(() => {
    let sid = "";
    try {
      sid = localStorage.getItem(SID_KEY) || "";
    } catch {
      /* ignore */
    }
    if (!sid) {
      sid = newSid();
      try {
        localStorage.setItem(SID_KEY, sid);
      } catch {
        /* ignore */
      }
    }
    setSessionId(sid);
  }, []);

  // Auto-open after 8s on qualifying pages.
  React.useEffect(() => {
    if (!autoOpen) return;
    const t = setTimeout(() => setOpen((o) => o || true), 8000);
    return () => clearTimeout(t);
  }, [autoOpen]);

  // Nudge dot appears after 3s if unopened.
  React.useEffect(() => {
    const t = setTimeout(() => setUnread((u) => (open ? u : 1)), 3000);
    return () => clearTimeout(t);
  }, [open]);

  // Let the marketing hero know to hide its decorative mock when we're open.
  React.useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("flowzint:chat", { detail: { open } })
    );
  }, [open]);

  const scrollToBottom = React.useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  React.useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, typing, actions, options, open, scrollToBottom]);

  // Boot conversation on first open (or after a reset).
  React.useEffect(() => {
    if (open && !booted && sessionId) {
      setUnread(0);
      setBooted(true);
      setTyping(true);
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, page, action: "start" }),
      })
        .then((r) => r.json())
        .then((data) => {
          setTyping(false);
          if (Array.isArray(data.history) && data.history.length) {
            setMessages(
              data.history.map((m: UiMessage) => ({ ...m, id: uid() }))
            );
          } else if (data.reply) {
            setMessages([{ id: uid(), role: "assistant", content: data.reply }]);
          }
          setActions(data.actions || {});
          setOptions(data.options || []);
        })
        .catch(() => {
          setTyping(false);
          setMessages([
            {
              id: uid(),
              role: "assistant",
              content:
                "Hi! I'm Zia 👋 I'd love to learn a bit about you. What's your name?",
            },
          ]);
        });
    }
  }, [open, booted, sessionId, page]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    setInput("");
    setActions({});
    setOptions([]);
    setMessages((m) => [...m, { id: uid(), role: "user", content: trimmed }]);
    setTyping(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, page, message: trimmed }),
      }).then((r) => r.json());
      await new Promise((r) => setTimeout(r, 380));
      setTyping(false);
      if (res.reply)
        setMessages((m) => [
          ...m,
          { id: uid(), role: "assistant", content: res.reply },
        ]);
      setActions(res.actions || {});
      setOptions(res.options || []);
    } catch {
      setTyping(false);
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          content: "Sorry — I hit a snag there. Mind trying that again?",
        },
      ]);
    }
  }

  function startNewChat() {
    const sid = newSid();
    try {
      localStorage.setItem(SID_KEY, sid);
    } catch {
      /* ignore */
    }
    setMessages([]);
    setActions({});
    setOptions([]);
    setInput("");
    setSessionId(sid);
    setBooted(false); // triggers the boot effect for a fresh greeting
  }

  function pushAssistant(content: string) {
    setMessages((m) => [...m, { id: uid(), role: "assistant", content }]);
  }

  return (
    <>
      {/* Launcher */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="launcher"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={() => setOpen(true)}
            className="group fixed bottom-6 right-6 z-[60] flex items-center gap-2.5 rounded-full bg-gradient-to-r from-violet to-[hsl(280_90%_60%)] py-3.5 pl-4 pr-5 text-sm font-semibold text-white shadow-xl shadow-primary/40 hover:shadow-primary/60"
            aria-label="Open chat"
          >
            <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
              <Sparkles className="h-4 w-4" />
            </span>
            Chat with Zia
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-hot text-[11px] font-bold text-white ring-2 ring-background">
                {unread}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className={cn(
              "fixed bottom-6 right-6 z-[60] flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-3xl glass-strong",
              expanded
                ? "h-[720px] w-[calc(100vw-3rem)] max-w-[560px]"
                : "h-[600px] w-[calc(100vw-3rem)] max-w-[400px]"
            )}
          >
            {/* Header */}
            <div className="relative flex items-center gap-3 border-b border-border bg-gradient-to-r from-violet/20 to-transparent px-4 py-3.5">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet to-[hsl(280_90%_60%)] shadow-lg shadow-primary/40">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-teal ring-2 ring-[hsl(230_26%_11%)]" />
              </div>
              <div className="flex-1">
                <p className="font-display text-sm font-semibold leading-tight">
                  Zia
                </p>
                <p className="text-xs text-muted-foreground">
                  FlowZint AI concierge · online
                </p>
              </div>
              <div className="flex items-center gap-0.5">
                <IconBtn label="New chat" onClick={startNewChat}>
                  <RotateCcw className="h-4 w-4" />
                </IconBtn>
                <IconBtn
                  label={expanded ? "Shrink" : "Expand"}
                  onClick={() => setExpanded((e) => !e)}
                  className="hidden sm:flex"
                >
                  {expanded ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </IconBtn>
                <IconBtn
                  label="Minimize"
                  onClick={() => {
                    setExpanded(false);
                    setOpen(false);
                  }}
                >
                  <ChevronDown className="h-5 w-5" />
                </IconBtn>
                <IconBtn label="Close" onClick={() => setOpen(false)}>
                  <X className="h-5 w-5" />
                </IconBtn>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto scrollbar-thin px-4 py-4"
            >
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {typing && <TypingIndicator />}

              {actions.booking && (
                <BookingCard
                  sessionId={sessionId}
                  onConfirmed={(label, email) => {
                    setActions({});
                    pushAssistant(
                      `✅ You're confirmed for ${label}. I've sent the invite to ${email} — see you then!`
                    );
                  }}
                  onDone={() => setActions({})}
                />
              )}
              {actions.newsletter && (
                <NewsletterCard
                  sessionId={sessionId}
                  resource={actions.resource}
                  onDone={() => setActions({})}
                />
              )}
            </div>

            {/* Quick replies */}
            {options.length > 0 && !typing && (
              <div className="flex flex-wrap gap-2 border-t border-border px-3 pt-3">
                {options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => send(opt)}
                    className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t border-border bg-background/40 p-3"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message…"
                className="h-11 rounded-full bg-secondary/60"
                disabled={typing}
              />
              <Button
                type="submit"
                size="icon"
                variant="gradient"
                className="h-11 w-11 shrink-0"
                disabled={typing || !input.trim()}
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  className,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

function MessageBubble({ message }: { message: UiMessage }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn(
        "flex items-start gap-2",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          isUser
            ? "bg-secondary text-foreground"
            : "bg-gradient-to-br from-violet to-[hsl(280_90%_60%)] text-white"
        )}
      >
        {isUser ? "You" : <Sparkles className="h-3.5 w-3.5" />}
      </div>
      <div
        className={cn(
          "max-w-[78%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-tr-md bg-primary text-primary-foreground"
            : "rounded-tl-md bg-secondary/80 text-foreground"
        )}
      >
        {message.content}
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-end gap-2"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet to-[hsl(280_90%_60%)] text-white">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-secondary/80 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
            animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

function BookingCard({
  sessionId,
  onDone,
  onConfirmed,
}: {
  sessionId: string;
  onDone: () => void;
  onConfirmed?: (label: string, email: string) => void;
}) {
  const [slots, setSlots] = React.useState<BookingSlot[]>([]);
  const [selected, setSelected] = React.useState<BookingSlot | null>(null);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState<BookingSlot | null>(null);

  React.useEffect(() => {
    fetch("/api/booking")
      .then((r) => r.json())
      .then((d) => {
        setSlots(d.slots || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function book() {
    if (!selected || !name.trim() || !email.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          name,
          email,
          slotIso: selected.iso,
          slotLabel: selected.label,
        }),
      });
      setConfirmed(selected);
      onConfirmed?.(selected.label, email);
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="gradient-border rounded-2xl bg-card/70 p-5 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
          className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-teal/15"
        >
          <Check className="h-7 w-7 text-teal" />
        </motion.div>
        <p className="font-display text-base font-semibold">You&apos;re booked! 🎉</p>
        <p className="mt-1 text-sm text-muted-foreground">{confirmed.label}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          A calendar invite is on its way to {email}.
        </p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={onDone}>
          Done
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card/70 p-4"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <CalendarCheck className="h-4 w-4 text-primary" />
        Pick a time for your demo
      </div>
      {loading ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {slots.map((s) => (
            <button
              key={s.iso}
              onClick={() => setSelected(s)}
              className={cn(
                "rounded-xl border px-2 py-2 text-xs font-medium transition-all",
                selected?.iso === s.iso
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-secondary/40 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              )}
            >
              <span className="block">{s.day}</span>
              <span className="text-primary">{s.time}</span>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-2 overflow-hidden"
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-10"
            />
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              type="email"
              className="h-10"
            />
            <Button
              variant="gradient"
              className="w-full"
              onClick={book}
              disabled={submitting || !name.trim() || !email.trim()}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Confirm {selected.time} slot</>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function NewsletterCard({
  sessionId,
  resource,
  onDone,
}: {
  sessionId: string;
  resource?: { title: string; description: string; url: string };
  onDone: () => void;
}) {
  const [email, setEmail] = React.useState("");
  const [done, setDone] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  async function submit() {
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sessionId }),
      });
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card/70 p-4"
    >
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <BookOpen className="h-4 w-4 text-accent" />
        {resource?.title || "Free resource"}
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        {resource?.description ||
          "Get our best conversion playbook, straight to your inbox."}
      </p>
      {done ? (
        <div className="flex items-center gap-2 rounded-xl bg-teal/10 px-3 py-2.5 text-sm text-teal">
          <Check className="h-4 w-4" /> Sent! Check your inbox.
          <button
            className="ml-auto text-xs underline opacity-70"
            onClick={onDone}
          >
            close
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            type="email"
            className="h-10"
          />
          <Button
            variant="gradient"
            onClick={submit}
            disabled={submitting || !email.trim()}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get it"}
          </Button>
        </div>
      )}
    </motion.div>
  );
}

function uid() {
  return `m_${Math.random().toString(36).slice(2, 10)}`;
}
