import Link from "next/link";
import { Github, Twitter, Linkedin } from "lucide-react";
import { BrandMark, BrandWordmark } from "@/components/shared/Logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Book a demo", href: "/book-demo" },
      { label: "Dashboard", href: "/crm" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/#" },
      { label: "Careers", href: "/#" },
      { label: "Blog", href: "/#" },
      { label: "Customers", href: "/#testimonials" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Playbook", href: "/#" },
      { label: "API docs", href: "/#" },
      { label: "Status", href: "/#" },
      { label: "Analytics", href: "/analytics" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-background/60">
      <div className="container grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <BrandMark />
            <BrandWordmark className="text-lg" />
          </Link>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            The AI concierge that turns anonymous website traffic into booked
            demos — and keeps your CRM perfectly in sync.
          </p>
          <div className="mt-5 flex gap-2">
            {[Twitter, Linkedin, Github].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary/40 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="social link"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="mb-4 text-sm font-semibold">{col.title}</p>
            <ul className="space-y-3">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="container flex flex-col items-center justify-between gap-3 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Foyer, Inc. All rights reserved.</p>
          <p>Built for the demo — a fictional product. Privacy · Terms</p>
        </div>
      </div>
    </footer>
  );
}
