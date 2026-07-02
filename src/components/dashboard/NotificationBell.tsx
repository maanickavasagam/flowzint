"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Flame, CalendarCheck, Hash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { relativeTime } from "@/lib/utils";
import type { SlackNotification } from "@/lib/types";

export function NotificationBell() {
  const [items, setItems] = React.useState<SlackNotification[]>([]);
  const [unread, setUnread] = React.useState(0);
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" }).then(
        (r) => r.json()
      );
      setItems(res.notifications || []);
      setUnread(res.unread || 0);
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    load();
    const t = setInterval(load, 5000); // poll for a real-time feel
    return () => clearInterval(t);
  }, [load]);

  async function onOpenChange(o: boolean) {
    setOpen(o);
    if (o && unread > 0) {
      setUnread(0);
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read" }),
      }).catch(() => {});
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary/40 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5" />
          <AnimatePresence>
            {unread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-hot px-1 text-[11px] font-bold text-white ring-2 ring-background"
              >
                {unread}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Sales alerts</p>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
            Slack · mock
          </span>
        </div>
        <div className="max-h-[380px] overflow-y-auto scrollbar-thin">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No alerts yet. Qualify a hot lead to see one appear.
            </p>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className="flex gap-3 border-b border-border/60 px-4 py-3 last:border-0"
              >
                <div
                  className={
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full " +
                    (n.temperature === "hot"
                      ? "bg-hot/15 text-hot"
                      : "bg-primary/15 text-primary")
                  }
                >
                  {n.channel.includes("demo") ? (
                    <CalendarCheck className="h-4 w-4" />
                  ) : (
                    <Flame className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {n.body}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Hash className="h-3 w-3" />
                      {n.channel.replace("#", "")}
                    </span>
                    <span>·</span>
                    <span>{relativeTime(n.created_at)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
