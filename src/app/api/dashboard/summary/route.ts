import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions, categories } from "@/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const yearMonth = searchParams.get("month") || getCurrentYearMonth();
  const [year, month] = yearMonth.split("-").map(Number);

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

  const userId = session.user.id;

  // Total income
  const [incomeResult] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${transactions.amount}::numeric), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "credit"),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      )
    );

  // Total expenses
  const [expenseResult] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${transactions.amount}::numeric), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "debit"),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      )
    );

  const income = parseFloat(incomeResult.total);
  const expenses = parseFloat(expenseResult.total);
  const savings = income - expenses;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;

  return NextResponse.json({
    yearMonth,
    income,
    expenses,
    savings,
    savingsRate: Math.round(savingsRate * 10) / 10,
  });
}

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
