import { NextRequest, NextResponse } from "next/server";
import {
  listNotifications,
  unreadNotificationCount,
  markAllNotificationsRead,
} from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    notifications: listNotifications(30),
    unread: unreadNotificationCount(),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (body.action === "read") {
    markAllNotificationsRead();
  }
  return NextResponse.json({
    ok: true,
    unread: unreadNotificationCount(),
  });
}
