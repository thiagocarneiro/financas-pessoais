import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  transactions,
  categories,
  merchants,
  classificationCorrections,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { categorySlug } = body;

  if (!categorySlug) {
    return NextResponse.json(
      { error: "categorySlug obrigatorio" },
      { status: 400 }
    );
  }

  // Find the transaction (ensure it belongs to user)
  const [txn] = await db
    .select()
    .from(transactions)
    .where(
      and(eq(transactions.id, id), eq(transactions.userId, session.user.id))
    )
    .limit(1);

  if (!txn) {
    return NextResponse.json(
      { error: "Transacao nao encontrada" },
      { status: 404 }
    );
  }

  // Find the target category
  const [newCategory] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, categorySlug))
    .limit(1);

  if (!newCategory) {
    return NextResponse.json(
      { error: "Categoria nao encontrada" },
      { status: 404 }
    );
  }

  // Update transaction category
  await db
    .update(transactions)
    .set({
      categoryId: newCategory.id,
      categoryOverride: true,
    })
    .where(eq(transactions.id, id));

  // If merchant exists, update its category and log correction
  if (txn.merchantId) {
    const oldCategoryId = txn.categoryId;

    await db
      .update(merchants)
      .set({
        categoryId: newCategory.id,
        classificationSource: "manual",
        updatedAt: new Date(),
      })
      .where(eq(merchants.id, txn.merchantId));

    // Log correction for AI learning
    await db.insert(classificationCorrections).values({
      merchantId: txn.merchantId,
      oldCategoryId,
      newCategoryId: newCategory.id,
    });
  }

  return NextResponse.json({ ok: true, categoryId: newCategory.id });
}
