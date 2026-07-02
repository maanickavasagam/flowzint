/**
 * Optional real-world integrations. Every function here is best-effort and
 * env-gated: if the relevant env var isn't set, it no-ops silently so the app
 * runs perfectly with zero configuration. Set the vars to go live.
 *
 *   RESEND_API_KEY + RESEND_FROM   → real confirmation emails
 *   SLACK_WEBHOOK_URL              → real Slack alerts for hot leads
 *   N8N_WEBHOOK_URL                → fire events into an n8n workflow
 */

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

/** Send an email via Resend's REST API. Returns true if actually sent. */
export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  if (!emailEnabled()) {
    console.log(`[flowzint] (email mock) → ${input.to}: ${input.subject}`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
      }),
    });
    if (!res.ok) {
      console.error("[flowzint] Resend error", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[flowzint] sendEmail failed", err);
    return false;
  }
}

export async function sendBookingConfirmation(input: {
  to: string;
  name: string;
  slotLabel: string;
}): Promise<boolean> {
  return sendEmail({
    to: input.to,
    subject: `Your FlowZint demo is confirmed — ${input.slotLabel}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#7c3aed">You're booked, ${escapeHtml(input.name)}! 🎉</h2>
        <p>Your FlowZint demo is confirmed for:</p>
        <p style="font-size:18px;font-weight:600">${escapeHtml(input.slotLabel)}</p>
        <p>We'll send a calendar invite shortly. Can't wait to show you FlowZint in action.</p>
        <p style="color:#888;font-size:12px">— The FlowZint team</p>
      </div>`,
  });
}

/** Post a hot-lead alert to a real Slack Incoming Webhook, if configured. */
export async function notifyHotLead(title: string, body: string): Promise<boolean> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return false;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `*${title}*\n${body}` }),
    });
    return true;
  } catch (err) {
    console.error("[flowzint] Slack webhook failed", err);
    return false;
  }
}

/** Fire an arbitrary event payload into an n8n workflow, if configured. */
export async function triggerN8n(
  event: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return false;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, ...payload }),
    });
    return true;
  } catch (err) {
    console.error("[flowzint] n8n webhook failed", err);
    return false;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
