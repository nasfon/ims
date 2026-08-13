import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Formats an amount as Nigerian Naira (PRD §2.5). */
export function formatNaira(value: number): string {
  if (!Number.isFinite(value)) return "₦0.00";
  return nairaFormatter.format(value);
}
