"use client";

import { usePathname } from "next/navigation";
import { ChatWidget } from "./ChatWidget";

export function ChatWidgetMount() {
  const pathname = usePathname() || "/";
  // Auto-open on the higher-intent pages.
  const autoOpen = pathname.startsWith("/pricing") || pathname.startsWith("/book-demo");
  return <ChatWidget page={pathname} autoOpen={autoOpen} />;
}
