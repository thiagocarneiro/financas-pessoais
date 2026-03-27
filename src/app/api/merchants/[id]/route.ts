import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { merchants, categories, transactions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { categorySlug, displayName } = body;

  const updates: Record<string, any> = { updatedAt: new Date() };

  if (categorySlug) {
    const [cat] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, categorySlug))
      .limit(1);
    if (cat) {
      updates.categoryId = cat.id;
      updates.classificationSource = "manual";

      // Update all transactions with this merchant
      await db
        .update(transactions)
        .set({ categoryId: cat.id })
        .where(eq(transactions.merchantId, id));
    }
  }

  if (displayName) {
    updates.displayName = displayName;
  }

  await db.update(merchants).set(updates).where(eq(merchants.id, id));

  return NextResponse.json({ ok: true });
}
