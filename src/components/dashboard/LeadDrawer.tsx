"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles, AlertTriangle, MessageSquareText } from "lucide-react";
import { LeadBadge } from "@/components/shared/lead-badge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SCORE_DIMENSIONS, MAX_SCORE } from "@/lib/scoring";
import { cn, formatDateTime } from "@/lib/utils";
import type {
  ChatMessageDTO,
  QualificationState,
  ScoreBreakdown,
  LeadTemperature,
} from "@/lib/types";

interface Detail {
  lead: {
    id: number;
    contact_name: string | null;
    contact_email: string | null;
    contact_company: string | null;
    score: number;
    temperature: LeadTemperature;
    status: string;
    source: string;
  };
  messages: ChatMessageDTO[];
  qualification: QualificationState;
  breakdown: ScoreBreakdown;
}

const ANSWER_FIELDS: { key: keyof QualificationState; label: string }[] = [
  { key: "industry", label: "Industry" },
  { key: "companySize", label: "Team size" },
  { key: "useCase", label: "Use case" },
  { key: "timeline", label: "Timeline" },
  { key: "budget", label: "Budget" },
  { key: "currentTools", label: "Current tools" },
];

export function LeadDrawer({
  leadId,
  onClose,
}: {
  leadId: number | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = React.useState<Detail | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (leadId == null) {
      setDetail(null);
      return;
    }
    setLoading(true);
    fetch(`/api/crm/lead?id=${leadId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setDetail(d.error ? null : d))
      .finally(() => setLoading(false));
  }, [leadId]);

  const open = leadId != null;
  const spam = detail?.qualification?.spamFlags ?? 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-md flex-col border-l border-border bg-popover shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display text-lg font-semibold">Lead detail</h2>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto scrollbar-thin px-5 py-5">
              {loading || !detail ? (
                <>
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-40 w-full rounded-xl" />
                  <Skeleton className="h-56 w-full rounded-xl" />
                </>
              ) : (
                <>
                  {/* Identity */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-display text-xl font-bold">
                          {detail.lead.contact_name || "Anonymous"}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {detail.lead.contact_company || "—"}
                          {detail.lead.contact_email
                            ? ` · ${detail.lead.contact_email}`
                            : ""}
                        </p>
                      </div>
                      <LeadBadge
                        temperature={detail.lead.temperature}
                        score={detail.lead.score}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="capitalize">
                        {detail.lead.status.replace("_", " ")}
                      </Badge>
                      <Badge variant="secondary" className="capitalize">
                        via {detail.lead.source}
                      </Badge>
                      {spam > 0 && (
                        <Badge variant="hot">
                          <AlertTriangle className="h-3 w-3" /> Flagged · {spam}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Score breakdown — the transparency piece */}
                  <div className="rounded-2xl border border-border bg-card/50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold">Why this score</p>
                      <span className="text-sm font-bold">
                        {detail.breakdown.total ?? detail.lead.score}
                        <span className="text-muted-foreground">/{MAX_SCORE}</span>
                      </span>
                    </div>
                    <div className="space-y-3">
                      {SCORE_DIMENSIONS.map((d) => {
                        const pts = (detail.breakdown[d.key] as number) ?? 0;
                        return (
                          <div key={d.key}>
                            <div className="mb-1 flex justify-between text-xs">
                              <span className="text-muted-foreground">{d.label}</span>
                              <span className="font-medium">
                                {pts}/{d.max}
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-violet to-teal"
                                style={{ width: `${(pts / d.max) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Captured answers */}
                  <div>
                    <p className="mb-2 text-sm font-semibold">Captured answers</p>
                    <div className="grid grid-cols-1 gap-2">
                      {ANSWER_FIELDS.map((f) => {
                        const v = detail.qualification?.[f.key];
                        return (
                          <div
                            key={String(f.key)}
                            className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card/40 px-3 py-2"
                          >
                            <span className="text-xs text-muted-foreground">
                              {f.label}
                            </span>
                            <span className="text-right text-sm">
                              {v ? String(v) : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Transcript */}
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                      <MessageSquareText className="h-4 w-4" /> Conversation
                      <span className="text-muted-foreground">
                        ({detail.messages.length})
                      </span>
                    </p>
                    <div className="space-y-2.5">
                      {detail.messages.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No transcript for this lead.
                        </p>
                      )}
                      {detail.messages.map((m) => {
                        const isUser = m.role === "user";
                        return (
                          <div
                            key={m.id}
                            className={cn(
                              "flex items-start gap-2",
                              isUser ? "flex-row-reverse" : "flex-row"
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                                isUser
                                  ? "bg-secondary"
                                  : "bg-gradient-to-br from-violet to-[hsl(280_90%_60%)] text-white"
                              )}
                            >
                              {isUser ? "U" : <Sparkles className="h-3 w-3" />}
                            </div>
                            <div
                              className={cn(
                                "max-w-[80%] whitespace-pre-line rounded-2xl px-3 py-2 text-xs leading-relaxed",
                                isUser
                                  ? "rounded-tr-sm bg-primary/90 text-primary-foreground"
                                  : "rounded-tl-sm bg-secondary/70"
                              )}
                            >
                              {m.content}
                              <div
                                className={cn(
                                  "mt-1 text-[10px]",
                                  isUser
                                    ? "text-primary-foreground/60"
                                    : "text-muted-foreground"
                                )}
                              >
                                {formatDateTime(m.created_at)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
