import { parseBRL } from "@/lib/currency";
import type { ParsedStatement, ParsedTransaction } from "./types";

/**
 * Parse Santander bank statement CSV content.
 *
 * CSV structure (verified from real files):
 * - Row 1: "EXTRATO DE CONTA CORRENTE"
 * - Row 3: Account holder name, account number
 * - Row 5: Date range
 * - Row 6: Column headers (Data, Descricao, Docto, Situacao, Credito, Debito, Saldo)
 * - Row 7+: Transaction data
 * - Footer: TOTAL row, then summary rows
 */
export function parseSantanderBankCSV(content: string): ParsedStatement {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);

  // Extract period from row 5
  let periodStart: string | undefined;
  let periodEnd: string | undefined;

  for (const line of lines.slice(0, 6)) {
    const match = line.match(
      /Extrato de (\d{2}\/\d{2}\/\d{4}) a (\d{2}\/\d{2}\/\d{4})/
    );
    if (match) {
      periodStart = parseDateDMY(match[1]);
      periodEnd = parseDateDMY(match[2]);
      break;
    }
  }

  // Find the header row index
  const headerIdx = lines.findIndex((l) => l.startsWith("Data "));
  if (headerIdx === -1) {
    throw new Error("Nao encontrei o cabecalho do CSV Santander");
  }

  const transactions: ParsedTransaction[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];

    // Stop at footer rows
    if (
      line.startsWith("TOTAL") ||
      line.startsWith("Saldo de Conta") ||
      line.startsWith("Limite de Cheque") ||
      line.startsWith("Encargos") ||
      line.startsWith("Saldo Disponivel") ||
      line.includes("IOF Projetado")
    ) {
      break;
    }

    // Skip SALDO ANTERIOR
    if (line.includes("SALDO ANTERIOR")) continue;

    const fields = parseCSVLine(line);
    if (fields.length < 7) continue;

    const [dateStr, desc, , , creditStr, debitStr] = fields;

    // Validate date
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) continue;

    const credit = parseBRL(creditStr);
    const debit = parseBRL(debitStr);

    if (credit === 0 && debit === 0) continue;

    const isCredit = credit !== 0;
    const amount = isCredit ? credit : Math.abs(debit);

    transactions.push({
      date: parseDateDMY(dateStr),
      description: cleanDescription(desc),
      amount,
      type: isCredit ? "credit" : "debit",
      source: "santander_bank",
    });
  }

  return {
    source: "santander_bank",
    periodStart,
    periodEnd,
    transactions,
  };
}

/**
 * Parse a CSV line handling quoted fields with commas.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Clean up description field from Santander CSV.
 * The description often has excessive spaces between the type and the counterparty.
 */
function cleanDescription(desc: string): string {
  return desc.replace(/\s{2,}/g, " ").trim();
}

/**
 * Parse DD/MM/YYYY to YYYY-MM-DD.
 */
function parseDateDMY(dateStr: string): string {
  const [d, m, y] = dateStr.split("/");
  return `${y}-${m}-${d}`;
}
