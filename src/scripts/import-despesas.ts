/**
 * Script to bulk import all statement files from despesas/ directory.
 * Usage: npx dotenv -e .env.local -- npx tsx src/scripts/import-despesas.ts
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";
import { detectSource } from "../lib/source-detection";
import { processStatement } from "../lib/services/pipeline";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const DESPESAS_DIR = join(__dirname, "../../despesas");
const EXTRATO_DIR = join(DESPESAS_DIR, "extratobancario");
const FATURAS_DIR = join(DESPESAS_DIR, "faturas_cartoes");

async function getOrCreateUser(): Promise<string> {
  // Try to find existing user
  const existing = await db
    .select()
    .from(schema.users)
    .limit(1);

  if (existing.length > 0) {
    console.log(`Usando usuario existente: ${existing[0].email || existing[0].id}`);
    return existing[0].id;
  }

  // Create a default user
  const [user] = await db
    .insert(schema.users)
    .values({
      email: "thiago.anjo@gmail.com",
      name: "Thiago",
    })
    .returning();

  console.log(`Usuario criado: ${user.email}`);
  return user.id;
}

async function importFile(
  filePath: string,
  fileName: string,
  userId: string
): Promise<void> {
  console.log(`\n--- Processando: ${fileName} ---`);

  try {
    const source = detectSource(fileName);
    console.log(`  Fonte detectada: ${source}`);

    const buffer = readFileSync(filePath);
    console.log(`  Tamanho: ${(buffer.length / 1024).toFixed(1)} KB`);

    // Check if statement already exists
    const existing = await db
      .select()
      .from(schema.statements)
      .where(eq(schema.statements.fileName, fileName))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  SKIP: Arquivo ja importado (statement ${existing[0].id})`);
      return;
    }

    // Create statement record (without Vercel Blob - local import)
    const [statement] = await db
      .insert(schema.statements)
      .values({
        userId,
        source,
        fileName,
        fileUrl: `local://${filePath}`,
        status: "pending",
      })
      .returning();

    console.log(`  Statement criado: ${statement.id}`);

    // Process
    const result = await processStatement(
      statement.id,
      buffer,
      fileName,
      source,
      userId
    );

    console.log(`  Transacoes inseridas: ${result.inserted}`);
    console.log(`  Duplicatas ignoradas: ${result.duplicates}`);
    if (result.errors.length > 0) {
      console.log(`  Erros: ${result.errors.length}`);
      result.errors.forEach((e) => console.log(`    - ${e}`));
    }
  } catch (error) {
    console.error(`  ERRO: ${error}`);
  }
}

async function main() {
  console.log("=== IMPORT DE DESPESAS ===\n");

  const userId = await getOrCreateUser();

  // 1. Import bank statements (CSV only - more reliable than XLS)
  console.log("\n== Extratos Bancarios ==");
  const extratoFiles = readdirSync(EXTRATO_DIR)
    .filter((f) => f.endsWith(".csv"))
    .sort();

  for (const file of extratoFiles) {
    await importFile(join(EXTRATO_DIR, file), file, userId);
  }

  // 2. Import credit card invoices (PDFs)
  console.log("\n== Faturas de Cartao ==");
  const faturaFiles = readdirSync(FATURAS_DIR)
    .filter((f) => f.endsWith(".pdf"))
    .sort();

  for (const file of faturaFiles) {
    await importFile(join(FATURAS_DIR, file), file, userId);
  }

  // Summary
  const totalStatements = await db
    .select({ count: schema.statements.id })
    .from(schema.statements);

  const totalTransactions = await db
    .select({ count: schema.transactions.id })
    .from(schema.transactions);

  const totalMerchants = await db
    .select({ count: schema.merchants.id })
    .from(schema.merchants);

  console.log("\n=== RESUMO ===");
  console.log(`Statements: ${totalStatements.length}`);
  console.log(`Transacoes: ${totalTransactions.length}`);
  console.log(`Merchants: ${totalMerchants.length}`);
  console.log("\nImport concluido!");
}

main().catch(console.error);
