import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { merchants, categories, transactions } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { classifyMerchant } from "@/lib/services/classifier";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const body = await request.json();
  const { merchantIds } = body;

  if (!merchantIds || !Array.isArray(merchantIds))
    return NextResponse.json({ error: "merchantIds obrigatorio" }, { status: 400 });

  const results: { id: string; category: string; displayName: string }[] = [];

  for (const id of merchantIds.slice(0, 20)) {
    const [merchant] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.id, id))
      .limit(1);

    if (!merchant) continue;

    const classification = await classifyMerchant(merchant.rawName);
    const [cat] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, classification.categorySlug))
      .limit(1);

    if (cat) {
      await db
        .update(merchants)
        .set({
          categoryId: cat.id,
          displayName: classification.displayName,
          classificationSource: "ai",
          confidence: classification.confidence.toString(),
          updatedAt: new Date(),
        })
        .where(eq(merchants.id, id));

      await db
        .update(transactions)
        .set({ categoryId: cat.id })
        .where(eq(transactions.merchantId, id));
    }

    results.push({
      id,
      category: classification.categorySlug,
      displayName: classification.displayName,
    });
  }

  return NextResponse.json({ classified: results });
}
