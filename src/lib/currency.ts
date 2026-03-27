/**
 * Parse Brazilian currency string to number.
 * "2.000,50" -> 2000.50
 * "-732,06" -> -732.06
 * "R$ 9.415,46" -> 9415.46
 */
export function parseBRL(value: string): number {
  if (!value || value.trim() === "") return 0;
  let cleaned = value.replace(/"/g, "").trim();
  cleaned = cleaned.replace(/R\$\s?/, "");
  const isNegative = cleaned.startsWith("-");
  cleaned = cleaned.replace(/-/g, "");
  cleaned = cleaned.replace(/\./g, ""); // remove thousands separator
  cleaned = cleaned.replace(",", "."); // decimal comma to dot
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : isNegative ? -num : num;
}

/**
 * Format number as Brazilian Real currency.
 * 2000.50 -> "R$ 2.000,50"
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Format a date for display in pt-BR.
 */
export function formatDateBR(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : date;
  return new Intl.DateTimeFormat("pt-BR").format(d);
}
