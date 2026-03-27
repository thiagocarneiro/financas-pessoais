import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { statements, transactions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const { id } = await params;
  const [stmt] = await db
    .select()
    .from(statements)
    .where(and(eq(statements.id, id), eq(statements.userId, session.user.id)))
    .limit(1);

  if (!stmt)
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  const [count] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(transactions)
    .where(eq(transactions.statementId, id));

  return NextResponse.json({ ...stmt, transactionCount: parseInt(count.count) });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const { id } = await params;
  const [stmt] = await db
    .select()
    .from(statements)
    .where(and(eq(statements.id, id), eq(statements.userId, session.user.id)))
    .limit(1);

  if (!stmt)
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  await db.delete(transactions).where(eq(transactions.statementId, id));
  await db.delete(statements).where(eq(statements.id, id));

  return NextResponse.json({ ok: true });
}
