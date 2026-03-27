import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { savingsGoals } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const updates: Record<string, any> = {};

  if (body.name) updates.name = body.name;
  if (body.targetAmount) updates.targetAmount = body.targetAmount.toString();
  if (body.monthlyTarget !== undefined)
    updates.monthlyTarget = body.monthlyTarget?.toString() || null;
  if (body.targetDate !== undefined)
    updates.targetDate = body.targetDate || null;

  await db
    .update(savingsGoals)
    .set(updates)
    .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const { id } = await params;
  await db
    .delete(savingsGoals)
    .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}
