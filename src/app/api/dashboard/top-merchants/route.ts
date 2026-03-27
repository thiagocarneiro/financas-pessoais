import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions, merchants } from "@/db/schema";
import { eq, and, sql, gte, lte, desc } from "drizzle-orm";

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

  const result = await db
    .select({
      merchantName: sql<string>`COALESCE(${merchants.displayName}, ${transactions.description})`,
      total: sql<string>`SUM(${transactions.amount}::numeric)`,
      count: sql<string>`COUNT(*)`,
    })
    .from(transactions)
    .leftJoin(merchants, eq(transactions.merchantId, merchants.id))
    .where(
      and(
        eq(transactions.userId, session.user.id),
        eq(transactions.type, "debit"),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      )
    )
    .groupBy(merchants.displayName, transactions.description)
    .orderBy(desc(sql`SUM(${transactions.amount}::numeric)`))
    .limit(10);

  return NextResponse.json({
    topMerchants: result.map((r) => ({
      merchantName: r.merchantName,
      total: parseFloat(r.total),
      count: parseInt(r.count),
    })),
  });
}

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
