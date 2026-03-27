export type StatementSource =
  | "santander_bank"
  | "santander_mastercard"
  | "itau_visa";

/**
 * Detect the source of a financial statement based on file name.
 * Falls back to content inspection if filename is ambiguous.
 */
export function detectSource(
  fileName: string,
  content?: string
): StatementSource {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".csv") || lower.endsWith(".xls")) {
    if (lower.includes("extrato") || lower.includes("planilha")) {
      return "santander_bank";
    }
  }

  if (lower.endsWith(".pdf")) {
    if (lower.includes("fatura_itau") || lower.startsWith("fatura_itau")) {
      return "itau_visa";
    }
    // fatura_YYYYMM.pdf pattern = Santander
    if (/fatura[_ ]?\d{6}/.test(lower)) {
      return "santander_mastercard";
    }
  }

  // Fallback: inspect content
  if (content) {
    if (content.includes("EXTRATO DE CONTA CORRENTE")) return "santander_bank";
    if (content.includes("MASTERCARD") && content.includes("Santander"))
      return "santander_mastercard";
    if (content.includes("Itaú") || content.includes("itau"))
      return "itau_visa";
  }

  throw new Error(
    `Nao foi possivel detectar a fonte do arquivo: ${fileName}`
  );
}

export const SOURCE_LABELS: Record<StatementSource, string> = {
  santander_bank: "Extrato Santander",
  santander_mastercard: "Fatura Santander MasterCard",
  itau_visa: "Fatura Itau Visa",
};
