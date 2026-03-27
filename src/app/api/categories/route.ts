import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { eq, sql, isNull } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  // Get all categories with transaction counts
  const result = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      icon: categories.icon,
      color: categories.color,
      parentId: categories.parentId,
      transactionCount: sql<string>`(
        SELECT COUNT(*) FROM transactions
        WHERE transactions.category_id = ${categories.id}
        AND transactions.user_id = ${session.user.id}
      )`,
      totalAmount: sql<string>`(
        SELECT COALESCE(SUM(amount::numeric), 0) FROM transactions
        WHERE transactions.category_id = ${categories.id}
        AND transactions.user_id = ${session.user.id}
        AND transactions.type = 'debit'
      )`,
    })
    .from(categories)
    .orderBy(categories.name);

  // Separate main categories and subcategories
  const main = result
    .filter((c) => !c.parentId)
    .map((c) => ({
      ...c,
      transactionCount: parseInt(c.transactionCount),
      totalAmount: parseFloat(c.totalAmount),
      subcategories: result
        .filter((s) => s.parentId === c.id)
        .map((s) => ({
          ...s,
          transactionCount: parseInt(s.transactionCount),
          totalAmount: parseFloat(s.totalAmount),
        })),
    }));

  return NextResponse.json({ categories: main });
}
