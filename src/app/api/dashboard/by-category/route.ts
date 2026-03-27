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

  const result = await db
    .select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categorySlug: categories.slug,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
      total: sql<string>`SUM(${transactions.amount}::numeric)`,
      count: sql<string>`COUNT(*)`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, session.user.id),
        eq(transactions.type, "debit"),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      )
    )
    .groupBy(
      transactions.categoryId,
      categories.name,
      categories.slug,
      categories.color,
      categories.icon
    )
    .orderBy(sql`SUM(${transactions.amount}::numeric) DESC`);

  const breakdown = result.map((r) => ({
    categoryId: r.categoryId,
    name: r.categoryName || "Sem categoria",
    slug: r.categorySlug || "sem-categoria",
    color: r.categoryColor || "#94a3b8",
    icon: r.categoryIcon,
    total: parseFloat(r.total),
    count: parseInt(r.count),
  }));

  return NextResponse.json({ yearMonth, breakdown });
}

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
