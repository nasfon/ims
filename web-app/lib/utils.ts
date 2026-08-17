import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats an amount as Nigerian Naira (PRD §2.5). */
export function formatNaira(value: number): string {
  if (!Number.isFinite(value)) return "₦0.00";
  return nairaFormatter.format(value);
}

const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function toDateValue(iso: string | Date): Date {
  return typeof iso === "string" ? new Date(iso) : iso;
}

/** Formats an ISO timestamp as a short date (e.g. "07 Aug 2026"). */
export function formatDate(iso: string | Date): string {
  const d = toDateValue(iso);
  if (Number.isNaN(d.getTime())) return "Invalid Date";
  return dateFormatter.format(d);
}

/** Formats an ISO timestamp as a short date + time (e.g. "07 Aug 2026, 13:45"). */
export function formatDateTime(iso: string | Date): string {
  const d = toDateValue(iso);
  if (Number.isNaN(d.getTime())) return "Invalid Date";
  return dateTimeFormatter.format(d);
}

/**
 * Formats a sequential sale counter as a zero-padded 6-digit receipt number
 * (e.g. 1 → "000001"), matching the `lpad(..., 6, '0')` used by the
 * `assign_receipt_number` DB trigger.
 */
export function formatReceiptNumber(n: number): string {
  const safe = Number.isFinite(n) ? Math.trunc(n) : 0;
  return String(Math.max(0, safe)).padStart(6, "0");
}
