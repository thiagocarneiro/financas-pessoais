import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const months = parseInt(searchParams.get("months") || "6");

  const trends: {
    yearMonth: string;
    income: number;
    expenses: number;
    savings: number;
  }[] = [];

  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const yearMonth = `${year}-${String(month).padStart(2, "0")}`;
    const startDate = `${yearMonth}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${yearMonth}-${lastDay}`;

    const [incomeResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, session.user.id),
          eq(transactions.type, "credit"),
          gte(transactions.transactionDate, startDate),
          lte(transactions.transactionDate, endDate)
        )
      );

    const [expenseResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, session.user.id),
          eq(transactions.type, "debit"),
          gte(transactions.transactionDate, startDate),
          lte(transactions.transactionDate, endDate)
        )
      );

    const income = parseFloat(incomeResult.total);
    const expenses = parseFloat(expenseResult.total);

    trends.push({
      yearMonth,
      income,
      expenses,
      savings: income - expenses,
    });
  }

  return NextResponse.json({ trends });
}
