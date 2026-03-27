"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatBRL } from "@/lib/currency";

interface MerchantData {
  merchantName: string;
  total: number;
}

interface TopMerchantsProps {
  data: MerchantData[];
}

export function TopMerchants({ data }: TopMerchantsProps) {
  if (data.length === 0) {
    return (
      <Card className="h-96 flex items-center justify-center">
        <p className="text-muted-foreground">Sem dados para exibir</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 10 Estabelecimentos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.slice(0, 10)}
              layout="vertical"
              margin={{ left: 0, right: 20 }}
            >
              <XAxis type="number" tickFormatter={(v) => formatBRL(v)} />
              <YAxis
                type="category"
                dataKey="merchantName"
                width={140}
                tick={{ fontSize: 12 }}
              />
              <Tooltip formatter={(value) => formatBRL(Number(value))} />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
