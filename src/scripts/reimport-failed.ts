/**
 * Re-import only failed PDF statements.
 * Usage: npx dotenv -e .env.local -- npx tsx src/scripts/reimport-failed.ts
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../db/schema";
import { eq, and } from "drizzle-orm";
import { detectSource } from "../lib/source-detection";
import { processStatement } from "../lib/services/pipeline";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const FATURAS_DIR = join(__dirname, "../../despesas/faturas_cartoes");

async function main() {
  console.log("=== RE-IMPORT DE PDFS FALHADOS ===\n");

  // Find failed statements
  const failed = await db
    .select()
    .from(schema.statements)
    .where(eq(schema.statements.status, "error"));

  console.log(`${failed.length} statements com erro encontrados\n`);

  for (const stmt of failed) {
    console.log(`\n--- Re-processando: ${stmt.fileName} ---`);

    try {
      const filePath = join(FATURAS_DIR, stmt.fileName);
      const buffer = readFileSync(filePath);
      const source = detectSource(stmt.fileName);

      // Delete old error state and reset
      await db
        .update(schema.statements)
        .set({ status: "pending", errorMessage: null })
        .where(eq(schema.statements.id, stmt.id));

      const result = await processStatement(
        stmt.id,
        buffer,
        stmt.fileName,
        source,
        stmt.userId
      );

      console.log(`  Transacoes inseridas: ${result.inserted}`);
      console.log(`  Duplicatas ignoradas: ${result.duplicates}`);
      if (result.errors.length > 0) {
        console.log(`  Erros: ${result.errors.length}`);
        result.errors.slice(0, 5).forEach((e) => console.log(`    - ${e}`));
      }
    } catch (error) {
      console.error(`  ERRO: ${error}`);
    }
  }

  // Final count
  const totalTransactions = await db
    .select({ count: schema.transactions.id })
    .from(schema.transactions);

  console.log(`\n=== Total de transacoes no banco: ${totalTransactions.length} ===`);
}

main().catch(console.error);
