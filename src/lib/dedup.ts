import { createHash } from "crypto";

/**
 * Compute a deduplication hash for a transaction.
 * Same transaction uploaded twice will produce the same hash.
 */
export function computeDedupHash(t: {
  date: string;
  description: string;
  amount: number;
  source: string;
  cardLastDigits?: string;
}): string {
  const normalized = [
    t.date,
    t.description.trim().toLowerCase().replace(/\s+/g, " "),
    Math.abs(t.amount).toFixed(2),
    t.source,
    t.cardLastDigits || "",
  ].join("|");

  return createHash("sha256").update(normalized).digest("hex");
}
