import Anthropic from "@anthropic-ai/sdk";
import type { ParsedStatement, ParsedTransaction } from "./types";

const anthropic = new Anthropic();

const EXTRACTION_PROMPT = `Voce e um extrator de dados de faturas de cartao de credito Santander MasterCard.

Extraia TODAS as transacoes do texto da fatura. A fatura pode ter multiplos cartoes (titular e adicionais).

Para cada transacao, extraia:
- date: data no formato DD/MM (converta para YYYY-MM-DD usando o ano da fatura)
- description: nome do estabelecimento/descricao
- amount: valor em reais (numero positivo)
- type: "debit" para despesas, "credit" para creditos/pagamentos
- card_last_digits: ultimos 4 digitos do cartao (ex: "7168")
- cardholder_name: nome do titular do cartao
- is_installment: true se for parcelamento
- installment_current: numero da parcela atual (ex: para "02/04", e 2)
- installment_total: total de parcelas (ex: para "02/04", e 4)
- amount_usd: valor em dolares se houver (numero ou null)

IMPORTANTE:
- Secoes "Pagamento e Demais Creditos" sao type: "credit"
- Secoes "Parcelamentos" e "Despesas" sao type: "debit"
- Ignore linhas de "VALOR TOTAL"
- Capture o periodo da fatura (data inicio e fim) e o total
- O ano da fatura esta no cabecalho (vencimento ou periodo das compras)

Responda APENAS com JSON valido no formato:
{
  "period_start": "YYYY-MM-DD",
  "period_end": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "total_amount": number,
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "string",
      "amount": number,
      "type": "debit" | "credit",
      "card_last_digits": "string",
      "cardholder_name": "string",
      "is_installment": boolean,
      "installment_current": number | null,
      "installment_total": number | null,
      "amount_usd": number | null
    }
  ]
}`;

export async function parseSantanderCCPDF(
  pdfText: string
): Promise<ParsedStatement> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `${EXTRACTION_PROMPT}\n\nTEXTO DA FATURA SANTANDER MASTERCARD:\n\n${pdfText}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude nao retornou texto");
  }

  // Extract JSON from response (may be wrapped in markdown code block)
  let jsonStr = textBlock.text;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  const data = JSON.parse(jsonStr.trim());

  const transactions: ParsedTransaction[] = data.transactions.map(
    (t: any) => ({
      date: t.date,
      description: t.description,
      amount: Math.abs(t.amount),
      type: t.type,
      source: "santander_mastercard" as const,
      cardLastDigits: t.card_last_digits,
      cardholderName: t.cardholder_name,
      isInstallment: t.is_installment || false,
      installmentCurrent: t.installment_current,
      installmentTotal: t.installment_total,
      amountUsd: t.amount_usd,
    })
  );

  return {
    source: "santander_mastercard",
    periodStart: data.period_start,
    periodEnd: data.period_end,
    totalAmount: data.total_amount,
    dueDate: data.due_date,
    transactions,
  };
}
