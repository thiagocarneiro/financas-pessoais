import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  users,
  statements,
  transactions,
  categories,
  merchants,
  savingsGoals,
} from "@/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { put } from "@vercel/blob";
import { detectSource } from "@/lib/source-detection";
import { processStatement } from "@/lib/services/pipeline";
import { formatBRL } from "@/lib/currency";

export const maxDuration = 60;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const ALLOWED_USERS = (process.env.TELEGRAM_ALLOWED_USERS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });
}

async function answerCallback(callbackQueryId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

async function getFile(fileId: string): Promise<Buffer> {
  const fileRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`
  );
  const fileData = await fileRes.json();
  const filePath = fileData.result.file_path;
  const downloadRes = await fetch(
    `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`
  );
  return Buffer.from(await downloadRes.arrayBuffer());
}

async function findUserByTelegramId(telegramId: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .limit(1);
  return result[0] || null;
}

function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return {
    yearMonth: `${year}-${String(month).padStart(2, "0")}`,
    startDate: `${year}-${String(month).padStart(2, "0")}-01`,
    endDate: `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`,
  };
}

export async function POST(request: Request) {
  try {
    const update = await request.json();

    // Handle inline keyboard callback
    if (update.callback_query) {
      const cb = update.callback_query;
      const data = cb.data; // format: "classify:merchantId:categorySlug"
      const chatId = cb.message.chat.id;

      if (data?.startsWith("classify:")) {
        const [, merchantId, categorySlug] = data.split(":");
        const [cat] = await db
          .select()
          .from(categories)
          .where(eq(categories.slug, categorySlug))
          .limit(1);

        if (cat) {
          await db
            .update(merchants)
            .set({ categoryId: cat.id, classificationSource: "manual", updatedAt: new Date() })
            .where(eq(merchants.id, merchantId));
          await db
            .update(transactions)
            .set({ categoryId: cat.id })
            .where(eq(transactions.merchantId, merchantId));

          const [m] = await db.select().from(merchants).where(eq(merchants.id, merchantId)).limit(1);
          await answerCallback(cb.id, `${m?.displayName} -> ${cat.name}`);
          await sendMessage(chatId, `<b>${m?.displayName}</b> classificado como <b>${cat.name}</b>.`);
        }
      }
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const telegramUserId = String(message.from.id);

    if (ALLOWED_USERS.length > 0 && !ALLOWED_USERS.includes(telegramUserId)) {
      await sendMessage(chatId, "Voce nao esta autorizado a usar este bot.");
      return NextResponse.json({ ok: true });
    }

    const user = await findUserByTelegramId(telegramUserId);

    // /start
    if (message.text === "/start") {
      if (user) {
        await sendMessage(
          chatId,
          `Ola, ${user.name || user.email}! Envie suas faturas (PDF) ou extratos (CSV/XLS) para processar.\n\n/resumo - Resumo do mes\n/metas - Metas de economia`
        );
      } else {
        await sendMessage(
          chatId,
          `Ola! Seu Telegram ID e <code>${telegramUserId}</code>.\nVincule sua conta no app para comecar.`
        );
      }
      return NextResponse.json({ ok: true });
    }

    // /resumo - Monthly summary with real data
    if (message.text === "/resumo") {
      if (!user) {
        await sendMessage(chatId, "Conta nao vinculada. Use /start.");
        return NextResponse.json({ ok: true });
      }

      const { startDate, endDate } = getCurrentMonth();

      const [incomeR] = await db
        .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
        .from(transactions)
        .where(and(eq(transactions.userId, user.id), eq(transactions.type, "credit"), gte(transactions.transactionDate, startDate), lte(transactions.transactionDate, endDate)));

      const [expenseR] = await db
        .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
        .from(transactions)
        .where(and(eq(transactions.userId, user.id), eq(transactions.type, "debit"), gte(transactions.transactionDate, startDate), lte(transactions.transactionDate, endDate)));

      const catBreakdown = await db
        .select({
          name: categories.name,
          total: sql<string>`SUM(${transactions.amount}::numeric)`,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(and(eq(transactions.userId, user.id), eq(transactions.type, "debit"), gte(transactions.transactionDate, startDate), lte(transactions.transactionDate, endDate)))
        .groupBy(categories.name)
        .orderBy(sql`SUM(${transactions.amount}::numeric) DESC`)
        .limit(5);

      const income = parseFloat(incomeR.total);
      const expenses = parseFloat(expenseR.total);
      const savings = income - expenses;

      let msg = `<b>Resumo do mes</b>\n\n`;
      msg += `Receita: ${formatBRL(income)}\n`;
      msg += `Despesas: ${formatBRL(expenses)}\n`;
      msg += `Economia: ${formatBRL(savings)}\n\n`;
      msg += `<b>Top 5 categorias:</b>\n`;
      for (const cat of catBreakdown) {
        msg += `  ${cat.name || "Sem categoria"}: ${formatBRL(parseFloat(cat.total))}\n`;
      }

      await sendMessage(chatId, msg);
      return NextResponse.json({ ok: true });
    }

    // /metas - Savings goals
    if (message.text === "/metas") {
      if (!user) {
        await sendMessage(chatId, "Conta nao vinculada. Use /start.");
        return NextResponse.json({ ok: true });
      }

      const goals = await db
        .select()
        .from(savingsGoals)
        .where(eq(savingsGoals.userId, user.id));

      if (goals.length === 0) {
        await sendMessage(chatId, "Nenhuma meta de economia definida. Crie metas no app.");
        return NextResponse.json({ ok: true });
      }

      let msg = `<b>Metas de Economia</b>\n\n`;
      for (const g of goals) {
        msg += `${g.name}: alvo ${formatBRL(parseFloat(g.targetAmount))}`;
        if (g.monthlyTarget) msg += ` (${formatBRL(parseFloat(g.monthlyTarget))}/mes)`;
        msg += `\n`;
      }

      await sendMessage(chatId, msg);
      return NextResponse.json({ ok: true });
    }

    // Document upload
    if (message.document && user) {
      const fileName = message.document.file_name;

      if (message.document.file_size > 5 * 1024 * 1024) {
        await sendMessage(chatId, "Arquivo muito grande (max 5MB).");
        return NextResponse.json({ ok: true });
      }

      await sendMessage(chatId, `Recebi <b>${fileName}</b>. Processando...`);

      try {
        const source = detectSource(fileName);
        const buffer = await getFile(message.document.file_id);

        const blob = await put(
          `statements/${user.id}/${Date.now()}-${fileName}`,
          buffer,
          { access: "public" }
        );

        const [statement] = await db
          .insert(statements)
          .values({ userId: user.id, source, fileName, fileUrl: blob.url, status: "pending" })
          .returning();

        const result = await processStatement(statement.id, buffer, fileName, source, user.id);

        let msg = `<b>Processamento concluido!</b>\n\n`;
        msg += `${result.inserted} transacoes inseridas\n`;
        if (result.duplicates > 0) msg += `${result.duplicates} duplicatas ignoradas\n`;

        await sendMessage(chatId, msg);

        // Send inline keyboard for uncategorized merchants
        const uncategorized = await db
          .select()
          .from(merchants)
          .where(sql`${merchants.categoryId} IS NULL`)
          .limit(5);

        const allCats = await db
          .select()
          .from(categories)
          .where(sql`${categories.parentId} IS NULL`);

        for (const m of uncategorized) {
          const keyboard = {
            inline_keyboard: allCats
              .filter((c) => c.slug !== "receita")
              .reduce((rows: any[][], cat, i) => {
                const btn = { text: cat.name, callback_data: `classify:${m.id}:${cat.slug}` };
                if (i % 3 === 0) rows.push([btn]);
                else rows[rows.length - 1].push(btn);
                return rows;
              }, []),
          };

          await sendMessage(
            chatId,
            `Como voce classifica <b>${m.displayName}</b>?`,
            keyboard
          );
        }
      } catch (error) {
        await sendMessage(chatId, `Erro ao processar ${fileName}: ${error}`);
      }

      return NextResponse.json({ ok: true });
    }

    // Default
    if (message.text) {
      await sendMessage(
        chatId,
        "Envie um PDF (fatura) ou CSV/XLS (extrato).\n\n/resumo - Resumo do mes\n/metas - Metas de economia"
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}
