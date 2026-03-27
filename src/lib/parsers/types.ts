import type { StatementSource } from "@/lib/source-detection";

export interface ParsedTransaction {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // always positive
  type: "debit" | "credit";
  source: StatementSource;
  cardLastDigits?: string;
  cardholderName?: string;
  isInstallment?: boolean;
  installmentCurrent?: number;
  installmentTotal?: number;
  itauCategory?: string;
  amountUsd?: number;
}

export interface ParsedStatement {
  source: StatementSource;
  periodStart?: string; // YYYY-MM-DD
  periodEnd?: string;
  totalAmount?: number;
  dueDate?: string;
  transactions: ParsedTransaction[];
}
