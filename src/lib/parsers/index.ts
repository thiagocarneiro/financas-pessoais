import { PDFParse } from "pdf-parse";
import * as XLSX from "xlsx";
import type { StatementSource } from "@/lib/source-detection";
import type { ParsedStatement } from "./types";
import { parseSantanderBankCSV } from "./santander-bank";
import { parseSantanderCCPDF } from "./santander-cc";
import { parseItauCCPDF } from "./itau-cc";

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  return result.text;
}

/**
 * Parse a financial statement file into structured transactions.
 * Handles CSV, XLS, and PDF formats from Santander and Itau.
 */
export async function parseStatement(
  buffer: Buffer,
  fileName: string,
  source: StatementSource
): Promise<ParsedStatement> {
  switch (source) {
    case "santander_bank":
      return parseSantanderBank(buffer, fileName);

    case "santander_mastercard":
      return parseSantanderCC(buffer);

    case "itau_visa":
      return parseItauCC(buffer);

    default:
      throw new Error(`Fonte desconhecida: ${source}`);
  }
}

async function parseSantanderBank(
  buffer: Buffer,
  fileName: string
): Promise<ParsedStatement> {
  const ext = fileName.toLowerCase().split(".").pop();

  let csvContent: string;

  if (ext === "xls" || ext === "xlsx") {
    // Convert XLS to CSV
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheet = workbook.SheetNames[0];
    csvContent = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet]);
  } else {
    // Try to detect encoding and decode
    csvContent = decodeCSV(buffer);
  }

  return parseSantanderBankCSV(csvContent);
}

async function parseSantanderCC(buffer: Buffer): Promise<ParsedStatement> {
  const text = await extractPdfText(buffer);
  return parseSantanderCCPDF(text);
}

async function parseItauCC(buffer: Buffer): Promise<ParsedStatement> {
  const text = await extractPdfText(buffer);
  return parseItauCCPDF(text);
}

/**
 * Decode CSV buffer handling Brazilian encoding (ISO-8859-1 / Windows-1252).
 */
function decodeCSV(buffer: Buffer): string {
  // Try UTF-8 first
  const utf8 = buffer.toString("utf-8");
  if (!utf8.includes("\ufffd")) return utf8;

  // Fall back to latin1 (ISO-8859-1)
  return buffer.toString("latin1");
}

export type { ParsedStatement, ParsedTransaction } from "./types";
