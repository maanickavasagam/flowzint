import type { BookingSlot } from "./types";

const SLOT_TIMES = [
  { h: 10, m: 0, label: "10:00 AM" },
  { h: 11, m: 30, label: "11:30 AM" },
  { h: 14, m: 0, label: "2:00 PM" },
  { h: 15, m: 30, label: "3:30 PM" },
];

function isBusinessDay(d: Date): boolean {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

/**
 * Generate 5 booking slots spread across the next 3 business days.
 * Deterministic-ish: always starts from the next business day.
 */
export function generateSlots(count = 5): BookingSlot[] {
  const slots: BookingSlot[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  let businessDays = 0;
  let timeIdx = 0;

  while (slots.length < count && businessDays < 6) {
    cursor.setDate(cursor.getDate() + 1);
    if (!isBusinessDay(cursor)) continue;
    businessDays++;

    // 2 slots on the first two days, 1 on the third, etc. — spread nicely.
    const perDay = businessDays <= 2 ? 2 : 1;
    for (let i = 0; i < perDay && slots.length < count; i++) {
      const t = SLOT_TIMES[timeIdx % SLOT_TIMES.length];
      timeIdx++;
      const slot = new Date(cursor);
      slot.setHours(t.h, t.m, 0, 0);
      slots.push({
        iso: slot.toISOString(),
        label: `${slot.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })} · ${t.label}`,
        day: slot.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        time: t.label,
      });
    }
  }

  return slots;
}
