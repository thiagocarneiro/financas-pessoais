import Anthropic from "@anthropic-ai/sdk";
import type { ParsedStatement, ParsedTransaction } from "./types";

const anthropic = new Anthropic();

const EXTRACTION_PROMPT = `Voce e um extrator de dados de faturas de cartao de credito Itau Visa.

A fatura Itau tem um layout de DUAS COLUNAS lado a lado com "Lancamentos: compras e saques".
Abaixo do nome de cada estabelecimento, ha uma linha com a CATEGORIA e CIDADE (ex: "ALIMENTACAO.SAO PAULO", "VESTUARIO.BRASILIA").

Para cada transacao, extraia:
- date: data no formato DD/MM (converta para YYYY-MM-DD usando o ano/mes da fatura)
- description: nome do estabelecimento
- amount: valor em reais (numero positivo para debitos, negativo para creditos/estornos)
- type: "debit" para compras, "credit" para estornos (valores negativos)
- card_last_digits: ultimos 4 digitos do cartao (1621 para titular, 1146 para adicional)
- cardholder_name: nome do titular da secao
- is_installment: true se houver indicacao de parcela (ex: "02/05" no nome)
- installment_current: parcela atual
- installment_total: total de parcelas
- itau_category: a categoria que o Itau atribuiu (ALIMENTACAO, VESTUARIO, SAUDE, VEICULOS, EDUCACAO, TURISMO E ENTRETENIMENTO, HOBBY, DIVERSOS, MORADIA)
- city: cidade da compra

IMPORTANTE:
- A fatura usa icones para tipo de compra: contactless, chip, virtual card - ignore os icones
- Leia as DUAS COLUNAS da esquerda para direita, linha por linha
- A secao "THIAGO DOS ANJOS CARNER(final 1621)" e do titular
- Secoes com "@" ou "adicional" sao de cartoes adicionais
- Valores com "-" na frente sao creditos/estornos
- O periodo e derivado das datas da postagem e fechamento no cabecalho

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
      "itau_category": "string",
      "city": "string"
    }
  ]
}`;

export async function parseItauCCPDF(
  pdfText: string
): Promise<ParsedStatement> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    messages: [
      {
        role: "user",
        content: `${EXTRACTION_PROMPT}\n\nTEXTO DA FATURA ITAU VISA:\n\n${pdfText}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude nao retornou texto");
  }

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
      type: t.amount < 0 ? "credit" : (t.type || "debit"),
      source: "itau_visa" as const,
      cardLastDigits: t.card_last_digits,
      cardholderName: t.cardholder_name,
      isInstallment: t.is_installment || false,
      installmentCurrent: t.installment_current,
      installmentTotal: t.installment_total,
      itauCategory: t.itau_category,
    })
  );

  return {
    source: "itau_visa",
    periodStart: data.period_start,
    periodEnd: data.period_end,
    totalAmount: data.total_amount,
    dueDate: data.due_date,
    transactions,
  };
}
