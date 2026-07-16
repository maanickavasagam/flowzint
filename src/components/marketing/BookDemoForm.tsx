"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, Check, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { BookingSlot } from "@/lib/types";

export function BookDemoForm() {
  const [slots, setSlots] = React.useState<BookingSlot[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<BookingSlot | null>(null);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState<BookingSlot | null>(null);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    fetch("/api/booking")
      .then((r) => r.json())
      .then((d) => {
        setSlots(d.slots || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!selected) {
      setError("Please pick a time slot.");
      return;
    }
    setSubmitting(true);
    try {
      let sid = "";
      try {
        sid = localStorage.getItem("foyer_sid") || "";
      } catch {
        /* ignore */
      }
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sid || undefined,
          name,
          email,
          company,
          slotIso: selected.iso,
          slotLabel: selected.label,
        }),
      }).then((r) => r.json());
      if (res.ok) setConfirmed(selected);
      else setError(res.error || "Something went wrong.");
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        className="gradient-border rounded-3xl glass-strong p-10 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
          className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-teal/15"
        >
          <Check className="h-10 w-10 text-teal" />
        </motion.div>
        <h2 className="font-display text-2xl font-bold">You&apos;re all set! 🎉</h2>
        <p className="mt-2 text-muted-foreground">
          Your demo is confirmed for
        </p>
        <p className="mt-1 font-display text-lg font-semibold text-primary">
          {confirmed.label}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          We&apos;ve sent a calendar invite to{" "}
          <span className="text-foreground">{email}</span>. Can&apos;t wait to
          show you Foyer in action.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-3xl glass-strong p-6 md:p-8">
      <div className="mb-5 flex items-center gap-2">
        <CalendarCheck className="h-5 w-5 text-primary" />
        <h2 className="font-display text-lg font-semibold">Pick a time</h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {slots.map((s) => (
            <button
              key={s.iso}
              type="button"
              onClick={() => setSelected(s)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all",
                selected?.iso === s.iso
                  ? "border-primary bg-primary/15"
                  : "border-border bg-secondary/40 hover:border-foreground/30"
              )}
            >
              <span className="text-xs font-medium text-muted-foreground">
                {s.day}
              </span>
              <span className="flex items-center gap-1 text-sm font-semibold">
                <Clock className="h-3.5 w-3.5 text-primary" /> {s.time}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="bd-name">Full name</Label>
          <Input
            id="bd-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jordan Rivera"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="bd-email">Work email</Label>
          <Input
            id="bd-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jordan@company.com"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="bd-company">Company</Label>
          <Input
            id="bd-company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Inc."
          />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-hot">{error}</p>}

      <Button
        type="submit"
        variant="gradient"
        size="lg"
        className="mt-6 w-full"
        disabled={submitting}
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>Confirm my demo</>
        )}
      </Button>
      <AnimatePresence />
    </form>
  );
}
