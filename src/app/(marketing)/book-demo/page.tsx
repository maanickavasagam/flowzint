import { Check, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/marketing/Reveal";
import { AuroraBackground } from "@/components/marketing/AuroraBackground";
import { BookDemoForm } from "@/components/marketing/BookDemoForm";

const BENEFITS = [
  {
    icon: Zap,
    title: "See it live in 20 minutes",
    body: "We'll qualify a lead in real time and show the score land in the CRM.",
  },
  {
    icon: Sparkles,
    title: "Tailored to your funnel",
    body: "Bring your site — we'll map the concierge to your exact use case.",
  },
  {
    icon: ShieldCheck,
    title: "Zero pressure",
    body: "It's a working session, not a pitch. Leave with a plan either way.",
  },
];

export default function BookDemoPage() {
  return (
    <div className="relative pt-32 pb-24">
      <AuroraBackground />
      <div className="container grid items-start gap-12 lg:grid-cols-[1fr_1fr]">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="flex h-1.5 w-1.5 rounded-full bg-teal animate-pulse-glow" />
            Live in a day · no card required
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Book your <span className="gradient-text">FlowZint</span> demo
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            Grab a slot and we&apos;ll show you exactly how FlowZint turns your
            traffic into booked meetings — using your own funnel as the example.
          </p>

          <div className="mt-8 space-y-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <b.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{b.title}</p>
                  <p className="text-sm text-muted-foreground">{b.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["Real product, not slides", "Bring your team", "Cancel anytime"].map(
              (t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-teal" /> {t}
                </span>
              )
            )}
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            Prefer to explore first? The concierge in the corner can qualify you
            and book a slot right now. 👉
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <BookDemoForm />
        </Reveal>
      </div>
    </div>
  );
}
