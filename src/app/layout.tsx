import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FlowZint — AI that turns website visitors into booked demos",
  description:
    "FlowZint is an AI lead-capture and conversion platform. Qualify visitors in real time, score them automatically, book demos, and sync everything to a built-in CRM.",
  metadataBase: new URL("https://flowzint.example.com"),
  openGraph: {
    title: "FlowZint — AI Lead Capture & Conversion",
    description:
      "Qualify, score, and convert inbound traffic on autopilot with an AI concierge.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          inter.variable,
          spaceGrotesk.variable,
          "min-h-screen bg-background font-sans antialiased selection:bg-primary/30"
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
