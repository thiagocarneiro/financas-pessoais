"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatDateBR } from "@/lib/currency";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  categoryName?: string;
  categoryColor?: string;
  merchantName?: string;
}

export function RecentTransactions({ data }: { data: Transaction[] }) {
  if (data.length === 0) {
    return (
      <Card className="flex items-center justify-center h-48">
        <p className="text-muted-foreground">Sem transacoes recentes</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transacoes Recentes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between py-2 border-b last:border-0"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {t.merchantName || t.description}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatDateBR(t.date)}
                </span>
                {t.categoryName && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                    style={{
                      backgroundColor: t.categoryColor ? `${t.categoryColor}20` : undefined,
                      color: t.categoryColor || undefined,
                    }}
                  >
                    {t.categoryName}
                  </Badge>
                )}
              </div>
            </div>
            <span
              className={`text-sm font-medium whitespace-nowrap ml-3 ${
                t.type === "credit" ? "text-emerald-600" : ""
              }`}
            >
              {t.type === "credit" ? "+" : "-"}{formatBRL(t.amount)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
