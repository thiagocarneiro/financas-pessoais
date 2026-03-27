import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, monthlySummaries, categories } from "@/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";

export async function GET(request: Request) {
  // Verify cron secret for Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // Compute for the previous month
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const yearMonth = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
  const startDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
  const endDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${new Date(prevYear, prevMonth, 0).getDate()}`;

  // Get unique user IDs from transactions in this period
  const userIds = await db
    .selectDistinct({ userId: transactions.userId })
    .from(transactions)
    .where(
      and(
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      )
    );

  for (const { userId } of userIds) {
    // Compute income
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

    // Compute expenses
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

    // Category breakdown
    const breakdown = await db
      .select({
        slug: categories.slug,
        total: sql<string>`SUM(${transactions.amount}::numeric)`,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "debit"),
          gte(transactions.transactionDate, startDate),
          lte(transactions.transactionDate, endDate)
        )
      )
      .groupBy(categories.slug);

    const income = parseFloat(incomeResult.total);
    const expenses = parseFloat(expenseResult.total);
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

    const breakdownMap: Record<string, number> = {};
    for (const b of breakdown) {
      if (b.slug) breakdownMap[b.slug] = parseFloat(b.total);
    }

    // Upsert monthly summary
    await db
      .insert(monthlySummaries)
      .values({
        userId,
        yearMonth,
        totalIncome: income.toString(),
        totalExpenses: expenses.toString(),
        savingsRate: savingsRate.toFixed(2),
        breakdownByCategory: breakdownMap,
      })
      .onConflictDoUpdate({
        target: [monthlySummaries.userId, monthlySummaries.yearMonth],
        set: {
          totalIncome: income.toString(),
          totalExpenses: expenses.toString(),
          savingsRate: savingsRate.toFixed(2),
          breakdownByCategory: breakdownMap,
        },
      });
  }

  return NextResponse.json({
    yearMonth,
    usersProcessed: userIds.length,
  });
}
