import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions, categories, merchants } from "@/db/schema";
import { eq, and, sql, gte, lte, like, desc } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const yearMonth = searchParams.get("month");
  const categorySlug = searchParams.get("category");
  const source = searchParams.get("source");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  const conditions = [eq(transactions.userId, session.user.id)];

  if (yearMonth) {
    const [year, month] = yearMonth.split("-").map(Number);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;
    conditions.push(gte(transactions.transactionDate, startDate));
    conditions.push(lte(transactions.transactionDate, endDate));
  }

  if (source) {
    conditions.push(eq(transactions.source, source));
  }

  if (search) {
    conditions.push(
      like(sql`lower(${transactions.description})`, `%${search.toLowerCase()}%`)
    );
  }

  const baseQuery = and(...conditions);

  // Get transactions with joins
  const result = await db
    .select({
      id: transactions.id,
      date: transactions.transactionDate,
      description: transactions.description,
      amount: transactions.amount,
      type: transactions.type,
      source: transactions.source,
      cardLastDigits: transactions.cardLastDigits,
      cardholderName: transactions.cardholderName,
      isInstallment: transactions.isInstallment,
      installmentCurrent: transactions.installmentCurrent,
      installmentTotal: transactions.installmentTotal,
      categoryName: categories.name,
      categorySlug: categories.slug,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
      merchantName: merchants.displayName,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(merchants, eq(transactions.merchantId, merchants.id))
    .where(
      categorySlug
        ? and(baseQuery, eq(categories.slug, categorySlug))
        : baseQuery
    )
    .orderBy(desc(transactions.transactionDate))
    .limit(limit)
    .offset(offset);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      categorySlug
        ? and(baseQuery, eq(categories.slug, categorySlug))
        : baseQuery
    );

  return NextResponse.json({
    transactions: result.map((t) => ({
      ...t,
      amount: parseFloat(t.amount),
    })),
    total: parseInt(countResult.count),
    page,
    limit,
  });
}
