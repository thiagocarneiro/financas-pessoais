"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatBRL } from "@/lib/currency";

interface TrendData {
  yearMonth: string;
  income: number;
  expenses: number;
  savings: number;
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
};

export function SpendingTrends({ data }: { data: TrendData[] }) {
  if (data.length === 0) {
    return (
      <Card className="h-80 flex items-center justify-center">
        <p className="text-muted-foreground">Sem dados de tendencia</p>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: MONTH_LABELS[d.yearMonth.split("-")[1]] || d.yearMonth,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendencia Mensal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="label" />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatBRL(Number(value))} />
              <Legend />
              <Line
                type="monotone"
                dataKey="income"
                name="Receita"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                name="Despesas"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
