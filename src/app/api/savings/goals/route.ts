import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { savingsGoals } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const goals = await db
    .select()
    .from(savingsGoals)
    .where(eq(savingsGoals.userId, session.user.id));

  return NextResponse.json({ goals });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { name, targetAmount, targetDate, monthlyTarget } = body;

  if (!name || !targetAmount) {
    return NextResponse.json(
      { error: "name e targetAmount obrigatorios" },
      { status: 400 }
    );
  }

  const [goal] = await db
    .insert(savingsGoals)
    .values({
      userId: session.user.id,
      name,
      targetAmount: targetAmount.toString(),
      targetDate: targetDate || null,
      monthlyTarget: monthlyTarget?.toString() || null,
    })
    .returning();

  return NextResponse.json({ goal }, { status: 201 });
}
