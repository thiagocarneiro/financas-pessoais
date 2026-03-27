import { db } from "@/db";
import {
  statements,
  transactions,
  merchants,
  categories,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { parseStatement } from "@/lib/parsers";
import { computeDedupHash } from "@/lib/dedup";
import { classifyMerchant, cleanMerchantName } from "./classifier";
import type { StatementSource } from "@/lib/source-detection";
import type { ParsedTransaction } from "@/lib/parsers/types";

/**
 * Process a statement file end-to-end:
 * 1. Parse the file into transactions
 * 2. Classify each merchant
 * 3. Deduplicate and insert into DB
 * 4. Update statement status
 */
export async function processStatement(
  statementId: string,
  buffer: Buffer,
  fileName: string,
  source: StatementSource,
  userId: string
): Promise<{ inserted: number; duplicates: number; errors: string[] }> {
  const errors: string[] = [];

  try {
    // Update status to processing
    await db
      .update(statements)
      .set({ status: "processing" })
      .where(eq(statements.id, statementId));

    // 1. Parse the file
    const parsed = await parseStatement(buffer, fileName, source);

    // Update statement with parsed metadata
    await db
      .update(statements)
      .set({
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
        totalAmount: parsed.totalAmount?.toString(),
        dueDate: parsed.dueDate,
      })
      .where(eq(statements.id, statementId));

    // 2-3. Process each transaction
    let inserted = 0;
    let duplicates = 0;

    // Load all categories for lookup
    const allCategories = await db.select().from(categories);
    const categoryBySlug = new Map(allCategories.map((c) => [c.slug, c]));

    for (const txn of parsed.transactions) {
      try {
        const result = await processTransaction(
          txn,
          statementId,
          userId,
          categoryBySlug
        );

        if (result === "inserted") inserted++;
        else if (result === "duplicate") duplicates++;
      } catch (error) {
        const msg = `Erro processando: ${txn.description} - ${error}`;
        errors.push(msg);
        console.error(msg);
      }
    }

    // 4. Update statement status
    await db
      .update(statements)
      .set({
        status: "completed",
        processedAt: new Date(),
      })
      .where(eq(statements.id, statementId));

    return { inserted, duplicates, errors };
  } catch (error) {
    // Mark as error
    await db
      .update(statements)
      .set({
        status: "error",
        errorMessage: String(error),
      })
      .where(eq(statements.id, statementId));

    throw error;
  }
}

async function processTransaction(
  txn: ParsedTransaction,
  statementId: string,
  userId: string,
  categoryBySlug: Map<string, typeof categories.$inferSelect>
): Promise<"inserted" | "duplicate"> {
  // Compute dedup hash
  const dedupHash = computeDedupHash({
    date: txn.date,
    description: txn.description,
    amount: txn.amount,
    source: txn.source,
    cardLastDigits: txn.cardLastDigits,
  });

  // Check for duplicate
  const existing = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.dedupHash, dedupHash))
    .limit(1);

  if (existing.length > 0) return "duplicate";

  // Classify the merchant
  const classification = await classifyMerchant(
    txn.description,
    txn.itauCategory
  );

  // Find or create merchant
  const merchantRecord = await findOrCreateMerchant(
    txn.description,
    classification.displayName,
    classification.categorySlug,
    classification.confidence,
    classification.source,
    categoryBySlug
  );

  // Resolve category
  const category = categoryBySlug.get(classification.categorySlug);

  // Insert transaction
  await db.insert(transactions).values({
    userId,
    statementId,
    merchantId: merchantRecord?.id,
    categoryId: category?.id,
    transactionDate: txn.date,
    description: txn.description,
    amount: txn.amount.toString(),
    type: txn.type,
    currency: "BRL",
    amountUsd: txn.amountUsd?.toString(),
    source: txn.source,
    cardLastDigits: txn.cardLastDigits,
    cardholderName: txn.cardholderName,
    isInstallment: txn.isInstallment || false,
    installmentCurrent: txn.installmentCurrent,
    installmentTotal: txn.installmentTotal,
    itauCategory: txn.itauCategory,
    dedupHash,
  });

  return "inserted";
}

async function findOrCreateMerchant(
  rawName: string,
  displayName: string,
  categorySlug: string,
  confidence: number,
  classificationSource: string,
  categoryBySlug: Map<string, typeof categories.$inferSelect>
) {
  // Try to find existing
  const existing = await db
    .select()
    .from(merchants)
    .where(sql`lower(${merchants.rawName}) = lower(${rawName})`)
    .limit(1);

  if (existing.length > 0) return existing[0];

  const category = categoryBySlug.get(categorySlug);

  // Create new merchant
  const [newMerchant] = await db
    .insert(merchants)
    .values({
      rawName,
      displayName,
      categoryId: category?.id,
      classificationSource,
      confidence: confidence.toString(),
    })
    .onConflictDoNothing()
    .returning();

  return newMerchant;
}
