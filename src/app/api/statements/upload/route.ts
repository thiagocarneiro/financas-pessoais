import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { statements } from "@/db/schema";
import { detectSource } from "@/lib/source-detection";
import { processStatement } from "@/lib/services/pipeline";

export const maxDuration = 60; // Vercel Hobby max

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    const fileName = file.name;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Detect source from filename
    const source = detectSource(fileName);

    // Upload to Vercel Blob
    const blob = await put(`statements/${session.user.id}/${Date.now()}-${fileName}`, buffer, {
      access: "public",
    });

    // Create statement record
    const [statement] = await db
      .insert(statements)
      .values({
        userId: session.user.id,
        source,
        fileName,
        fileUrl: blob.url,
        status: "pending",
      })
      .returning();

    // Process the statement (within the same request for simplicity)
    const result = await processStatement(
      statement.id,
      buffer,
      fileName,
      source,
      session.user.id
    );

    return NextResponse.json({
      statementId: statement.id,
      source,
      inserted: result.inserted,
      duplicates: result.duplicates,
      errors: result.errors,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
