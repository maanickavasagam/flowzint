"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Flame, Check } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { AuroraBackground } from "./AuroraBackground";
import { cn } from "@/lib/utils";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export function Hero() {
  // Hide the decorative mock while the real chat widget is open so they never
  // visually collide in the corner.
  const [chatOpen, setChatOpen] = React.useState(false);
  React.useEffect(() => {
    const handler = (e: Event) =>
      setChatOpen(Boolean((e as CustomEvent).detail?.open));
    window.addEventListener("flowzint:chat", handler);
    return () => window.removeEventListener("flowzint:chat", handler);
  }, []);

  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
      <AuroraBackground />
      <div className="container grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="flex h-1.5 w-1.5 rounded-full bg-teal animate-pulse-glow" />
              AI concierge · qualifies + books while you sleep
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl md:text-6xl"
          >
            Turn website visitors into{" "}
            <span className="gradient-text">booked demos</span> — on autopilot.
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
          >
            FlowZint drops an AI concierge on your site that qualifies every
            visitor in real time, scores them the moment they&apos;re ready, books
            the meeting, and syncs it all to your CRM. No forms. No lag. No leads
            left behind.
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="gradient" size="lg">
              <Link href="/book-demo">
                Book a demo <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/pricing">View pricing</Link>
            </Button>
          </motion.div>

          <motion.div
            variants={item}
            className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
          >
            {["No credit card", "15-min setup", "Live in a day"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-teal" /> {t}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Product mock */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className={cn(
            "relative transition-opacity duration-300",
            chatOpen && "pointer-events-none opacity-0"
          )}
        >
          <div className="gradient-border relative rounded-3xl glass-strong p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet to-[hsl(280_90%_60%)]">
                <Sparkles className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold">Zia · AI concierge</p>
                <p className="text-xs text-teal">● online</p>
              </div>
            </div>

            <div className="space-y-3">
              <ChatLine side="bot">
                Hey! What are you hoping FlowZint can help with?
              </ChatLine>
              <ChatLine side="user">
                We need to book more demos from our traffic.
              </ChatLine>
              <ChatLine side="bot">
                Love it. How big is your team, roughly?
              </ChatLine>
              <ChatLine side="user">Around 240 people, moving fast.</ChatLine>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.1 }}
              className="mt-4 flex items-center justify-between rounded-2xl border border-hot/30 bg-hot/10 px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-hot" />
                <span className="text-sm font-semibold text-hot">
                  Hot lead detected
                </span>
              </div>
              <span className="rounded-full bg-hot/20 px-2.5 py-0.5 text-xs font-bold text-hot">
                Score 9/11
              </span>
            </motion.div>
          </div>

          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-4 -top-5 hidden rounded-2xl glass px-4 py-3 sm:block"
          >
            <p className="text-xs text-muted-foreground">Demo booked</p>
            <p className="font-display text-lg font-bold text-teal">+38%</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function ChatLine({
  side,
  children,
}: {
  side: "bot" | "user";
  children: React.ReactNode;
}) {
  const isUser = side === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground"
            : "max-w-[80%] rounded-2xl rounded-bl-md bg-secondary/80 px-3.5 py-2 text-sm"
        }
      >
        {children}
      </div>
    </div>
  );
}
