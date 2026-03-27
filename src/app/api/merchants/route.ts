import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { merchants, categories } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const result = await db
    .select({
      id: merchants.id,
      rawName: merchants.rawName,
      displayName: merchants.displayName,
      classificationSource: merchants.classificationSource,
      confidence: merchants.confidence,
      categoryName: categories.name,
      categorySlug: categories.slug,
      categoryColor: categories.color,
    })
    .from(merchants)
    .leftJoin(categories, eq(merchants.categoryId, categories.id))
    .orderBy(desc(merchants.updatedAt))
    .limit(200);

  return NextResponse.json({ merchants: result });
}
