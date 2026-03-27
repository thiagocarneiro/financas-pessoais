"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MonthSelector } from "@/components/dashboard/month-selector";
import { formatBRL, formatDateBR } from "@/lib/currency";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
  source: string;
  cardLastDigits?: string;
  cardholderName?: string;
  isInstallment?: boolean;
  installmentCurrent?: number;
  installmentTotal?: number;
  categoryName?: string;
  categorySlug?: string;
  categoryColor?: string;
  merchantName?: string;
}

const SOURCE_SHORT: Record<string, string> = {
  santander_bank: "Banco",
  santander_mastercard: "Santander MC",
  itau_visa: "Itau Visa",
};

function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function TransacoesPage() {
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth());
  const [search, setSearch] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 30;

  useEffect(() => {
    async function fetchTransactions() {
      setLoading(true);
      const params = new URLSearchParams({
        month: yearMonth,
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set("search", search);

      try {
        const res = await fetch(`/api/transactions?${params}`);
        if (res.ok) {
          const data = await res.json();
          setTransactions(data.transactions);
          setTotal(data.total);
        }
      } catch (error) {
        console.error("Error fetching transactions:", error);
      }
      setLoading(false);
    }

    const debounce = setTimeout(fetchTransactions, search ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [yearMonth, page, search]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Transacoes</h1>
        <MonthSelector yearMonth={yearMonth} onChange={(m) => { setYearMonth(m); setPage(1); }} />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar transacao..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma transacao encontrada
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateBR(t.date)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {t.merchantName || t.description}
                        </p>
                        {t.isInstallment && t.installmentCurrent && t.installmentTotal && (
                          <span className="text-xs text-muted-foreground">
                            Parcela {t.installmentCurrent}/{t.installmentTotal}
                          </span>
                        )}
                        {t.cardLastDigits && (
                          <span className="text-xs text-muted-foreground ml-2">
                            *{t.cardLastDigits}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {t.categoryName ? (
                        <Badge
                          variant="secondary"
                          style={{
                            backgroundColor: t.categoryColor
                              ? `${t.categoryColor}20`
                              : undefined,
                            color: t.categoryColor || undefined,
                            borderColor: t.categoryColor
                              ? `${t.categoryColor}40`
                              : undefined,
                          }}
                        >
                          {t.categoryName}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Sem categoria</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {SOURCE_SHORT[t.source] || t.source}
                      </span>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <span
                        className={
                          t.type === "credit"
                            ? "text-emerald-600"
                            : "text-foreground"
                        }
                      >
                        {t.type === "credit" ? "+" : "-"}
                        {formatBRL(t.amount)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {total} transacoes encontradas
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
