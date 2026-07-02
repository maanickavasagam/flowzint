import Link from "next/link";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/marketing/Reveal";
import { AuroraBackground } from "@/components/marketing/AuroraBackground";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    name: "Starter",
    price: 99,
    tagline: "For small teams testing the waters.",
    features: [
      "1 AI concierge widget",
      "Up to 500 conversations / mo",
      "Deterministic lead scoring",
      "Built-in CRM (contacts + leads)",
      "Email support",
    ],
    cta: "Start free",
    highlighted: false,
  },
  {
    name: "Growth",
    price: 499,
    tagline: "The anchor plan for scaling revenue teams.",
    features: [
      "Everything in Starter",
      "Up to 5,000 conversations / mo",
      "Instant demo booking + calendar",
      "Real-time sales alerts",
      "Opportunities + funnel analytics",
      "Priority support",
    ],
    cta: "Get started",
    highlighted: true,
  },
  {
    name: "Scale",
    price: 1499,
    tagline: "For high-volume inbound at serious scale.",
    features: [
      "Everything in Growth",
      "Unlimited conversations",
      "Custom scoring rubrics",
      "Multi-page concierge",
      "Advanced analytics + exports",
      "Dedicated success manager",
    ],
    cta: "Talk to sales",
    highlighted: false,
  },
];

const FAQ = [
  {
    q: "How does the AI qualification actually work?",
    a: "The concierge asks one natural question at a time, extracting structured details — industry, team size, budget, timeline and use case — and maintaining that state turn by turn. Scoring is then applied with a transparent, deterministic rubric.",
  },
  {
    q: "Is the lead score shown to visitors?",
    a: "Never. Scores live only in your internal CRM and analytics. Visitors simply get routed to the best next step — a demo, an offer, or a helpful resource.",
  },
  {
    q: "Can I change plans later?",
    a: "Absolutely. Upgrade or downgrade anytime; changes are prorated to the day.",
  },
  {
    q: "Do I need engineering to set it up?",
    a: "No. Drop in one snippet and the concierge is live. Most teams are up and running in an afternoon.",
  },
];

export default function PricingPage() {
  return (
    <div className="relative pt-32 pb-24">
      <AuroraBackground />
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Simple, honest pricing
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Pricing that scales with your <span className="gradient-text">pipeline</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Every plan includes the AI concierge, deterministic scoring and the
            built-in CRM. Cancel anytime.
          </p>
        </Reveal>

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 lg:grid-cols-3">
          {TIERS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <div
                className={cn(
                  "group relative flex h-full flex-col rounded-3xl border p-7 transition-all duration-300 hover:-translate-y-1.5",
                  t.highlighted
                    ? "border-primary/40 bg-card/70 shadow-2xl shadow-primary/20"
                    : "border-border bg-card/40 hover:border-foreground/20"
                )}
              >
                {t.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet to-[hsl(280_90%_60%)] px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-primary/40">
                    Most popular
                  </span>
                )}
                <h3 className="font-display text-xl font-bold">{t.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.tagline}</p>
                <div className="mt-5 flex items-end gap-1">
                  <span className="font-display text-4xl font-bold">${t.price}</span>
                  <span className="mb-1 text-sm text-muted-foreground">/mo</span>
                </div>
                <Button
                  asChild
                  variant={t.highlighted ? "gradient" : "outline"}
                  className="mt-6 w-full"
                >
                  <Link href="/book-demo">
                    {t.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <ul className="mt-7 space-y-3">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                      <span className="text-foreground/90">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mx-auto mt-20 max-w-6xl rounded-3xl border border-border bg-card/40 p-8 text-center md:flex md:items-center md:justify-between md:text-left">
          <div>
            <h3 className="font-display text-xl font-bold">Need something custom?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Enterprise volume, custom rubrics, SSO and a dedicated team.
            </p>
          </div>
          <Button asChild variant="secondary" size="lg" className="mt-4 md:mt-0">
            <Link href="/book-demo">Contact sales</Link>
          </Button>
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-24 max-w-3xl">
          <Reveal className="text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight">
              Frequently asked
            </h2>
          </Reveal>
          <div className="mt-10 space-y-4">
            {FAQ.map((f, i) => (
              <Reveal key={f.q} delay={i * 0.05}>
                <div className="rounded-2xl border border-border bg-card/40 p-6">
                  <h3 className="font-semibold">{f.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {f.a}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
