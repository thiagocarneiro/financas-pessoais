"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { formatBRL } from "@/lib/currency";

interface CardData {
  source: string;
  cardLastDigits: string;
  total: number;
  count: number;
}

const SOURCE_NAMES: Record<string, string> = {
  santander_mastercard: "Santander MasterCard",
  itau_visa: "Itau Visa",
  santander_bank: "Santander Banco",
};

export function CreditCardSummary({ data }: { data: CardData[] }) {
  if (data.length === 0) {
    return (
      <Card className="flex items-center justify-center h-48">
        <p className="text-muted-foreground">Sem dados de cartao</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo por Cartao</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((card, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">
                  {SOURCE_NAMES[card.source] || card.source}
                </p>
                <p className="text-xs text-muted-foreground">
                  **** {card.cardLastDigits} - {card.count} transacoes
                </p>
              </div>
            </div>
            <p className="font-semibold">{formatBRL(card.total)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
