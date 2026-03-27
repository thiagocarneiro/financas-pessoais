"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, PiggyBank, Wallet } from "lucide-react";
import { formatBRL } from "@/lib/currency";

interface SummaryCardsProps {
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
}

export function SummaryCards({
  income,
  expenses,
  savings,
  savingsRate,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Receita
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-emerald-600">
            {formatBRL(income)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Despesas
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-red-600">
            {formatBRL(expenses)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Economia
          </CardTitle>
          <PiggyBank className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <p
            className={`text-2xl font-bold ${
              savings >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {formatBRL(savings)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Taxa de Economia
          </CardTitle>
          <Wallet className="h-4 w-4 text-violet-500" />
        </CardHeader>
        <CardContent>
          <p
            className={`text-2xl font-bold ${
              savingsRate >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {savingsRate.toFixed(1)}%
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
