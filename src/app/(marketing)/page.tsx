import Link from "next/link";
import {
  MessageSquareText,
  Gauge,
  CalendarCheck,
  Database,
  Bell,
  BarChart3,
  ArrowRight,
  Quote,
  Star,
} from "lucide-react";
import { Hero } from "@/components/marketing/Hero";
import { Reveal } from "@/components/marketing/Reveal";
import { Button } from "@/components/ui/button";
import { AuroraBackground } from "@/components/marketing/AuroraBackground";

const FEATURES = [
  {
    icon: MessageSquareText,
    title: "Conversational qualification",
    body: "An AI concierge asks the right questions one at a time, adapting to every answer — no clunky multi-step forms.",
  },
  {
    icon: Gauge,
    title: "Deterministic lead scoring",
    body: "A transparent 0–13 rubric grades size, budget, timeline and fit. Cold, warm, hot — scored by logic, not vibes.",
  },
  {
    icon: CalendarCheck,
    title: "Instant demo booking",
    body: "Hot leads get an embedded calendar the moment they qualify. Slots, confirmation, invite — zero back-and-forth.",
  },
  {
    icon: Bell,
    title: "Real-time sales alerts",
    body: "Every hot lead pings your team instantly so reps reach out while intent is still sky-high.",
  },
  {
    icon: Database,
    title: "Built-in CRM sync",
    body: "Contacts, leads and opportunities are created and updated automatically. Your pipeline stays honest.",
  },
  {
    icon: BarChart3,
    title: "Funnel analytics",
    body: "See exactly where visitors drop off — from first hello to closed opportunity — and fix the leaks.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Visitor lands & chats",
    body: "The floating concierge greets visitors and starts a natural conversation instead of a static form.",
  },
  {
    n: "02",
    title: "AI qualifies & scores",
    body: "FlowZint captures industry, size, budget, timeline and use case — then scores intent on a deterministic rubric.",
  },
  {
    n: "03",
    title: "Route to the right outcome",
    body: "Hot leads book a demo and alert sales. Warm leads get an offer. Cold leads get nurtured with a resource.",
  },
  {
    n: "04",
    title: "Everything syncs to CRM",
    body: "Contacts, leads and opportunities appear in your dashboard in real time, with analytics on every step.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "We plugged FlowZint into our pricing page and booked 41 demos in the first three weeks — from traffic we were already paying for. It's the highest-ROI thing we shipped all quarter.",
    name: "Priya Nadella",
    role: "VP Growth, Latchpoint",
    stat: "+41 demos / 3 wks",
  },
  {
    quote:
      "The scoring is the magic. Our reps stopped wasting time on tire-kickers because hot leads literally ping Slack the second they qualify. Response time went from hours to minutes.",
    name: "Marcus Bellwether",
    role: "Head of Sales, Cindershift",
    stat: "−92% response time",
  },
  {
    quote:
      "Setup took one afternoon and the CRM just… filled itself. I finally trust our pipeline numbers because a human isn't fat-fingering them anymore.",
    name: "Dana Okonkwo",
    role: "RevOps Lead, Northwind Labs",
    stat: "100% clean pipeline",
  },
];

const LOGOS = ["Latchpoint", "Cindershift", "Northwind", "Verdant", "Kwiklane", "Ortus"];

export default function HomePage() {
  return (
    <>
      <Hero />

      {/* Logo cloud */}
      <section className="border-y border-border bg-background/40 py-10">
        <div className="container">
          <p className="mb-6 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Trusted by fast-moving revenue teams
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {LOGOS.map((l) => (
              <span
                key={l}
                className="font-display text-lg font-semibold text-muted-foreground/60 transition-colors hover:text-foreground"
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-24">
        <div className="container">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold text-primary">
              Everything you need
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              One system, the whole funnel
            </h2>
            <p className="mt-4 text-muted-foreground">
              Capture, qualify, score, route, book and analyze — without stitching
              together five different tools.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.05}>
                <div className="group h-full rounded-2xl border border-border bg-card/50 p-6 transition-all hover:-translate-y-1 hover:border-foreground/20 hover:bg-card/70">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary transition-colors group-hover:bg-primary/20">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {f.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative overflow-hidden py-24">
        <div className="container">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold text-accent">How it works</span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              From anonymous visitor to opportunity
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div className="relative h-full rounded-2xl border border-border bg-card/50 p-6">
                  <span className="font-display text-4xl font-bold text-foreground/10">
                    {s.n}
                  </span>
                  <h3 className="mt-2 font-display text-lg font-semibold">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative py-24">
        <div className="container">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold text-primary">
              Loved by revenue teams
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Results, not just conversations
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.06}>
                <figure className="flex h-full flex-col rounded-2xl border border-border bg-card/50 p-6">
                  <Quote className="h-7 w-7 text-primary/40" />
                  <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground/90">
                    “{t.quote}”
                  </blockquote>
                  <div className="mt-5 flex items-center gap-1 text-warm">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <figcaption className="mt-4 flex items-center justify-between border-t border-border pt-4">
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                    <span className="rounded-full bg-teal/10 px-2.5 py-1 text-xs font-semibold text-teal">
                      {t.stat}
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24">
        <div className="container">
          <div className="relative overflow-hidden rounded-3xl border border-border p-10 md:p-16">
            <AuroraBackground />
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Stop letting good leads go cold.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
                See FlowZint qualify, score and book a demo live — using the very
                widget in the corner of this page.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button asChild variant="gradient" size="lg">
                  <Link href="/book-demo">
                    Book your demo <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/crm">Explore the dashboard</Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
