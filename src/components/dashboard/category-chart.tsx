"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatBRL } from "@/lib/currency";

interface CategoryData {
  name: string;
  slug: string;
  color: string;
  total: number;
  count: number;
}

interface CategoryChartProps {
  data: CategoryData[];
}

export function CategoryChart({ data }: CategoryChartProps) {
  const total = data.reduce((sum, d) => sum + d.total, 0);

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
        <CardTitle>Despesas por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <div className="w-64 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="total"
                  nameKey="name"
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatBRL(Number(value))}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 space-y-2 w-full">
            {data.map((cat) => {
              const pct = total > 0 ? (cat.total / total) * 100 : 0;
              return (
                <div key={cat.slug} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-sm flex-1 truncate">{cat.name}</span>
                  <span className="text-sm font-medium">
                    {formatBRL(cat.total)}
                  </span>
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
