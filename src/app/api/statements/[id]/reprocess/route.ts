import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { statements, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { processStatement } from "@/lib/services/pipeline";
import { detectSource } from "@/lib/source-detection";

export const maxDuration = 60;

export async function POST(
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

  // Delete existing transactions for this statement
  await db.delete(transactions).where(eq(transactions.statementId, id));

  // Download file from storage
  const fileRes = await fetch(stmt.fileUrl);
  const buffer = Buffer.from(await fileRes.arrayBuffer());
  const source = detectSource(stmt.fileName);

  const result = await processStatement(id, buffer, stmt.fileName, source, session.user.id);

  return NextResponse.json({
    statementId: id,
    inserted: result.inserted,
    duplicates: result.duplicates,
    errors: result.errors,
  });
}
