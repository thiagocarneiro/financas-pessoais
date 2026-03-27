import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, statements } from "@/db/schema";
import { eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { detectSource } from "@/lib/source-detection";
import { processStatement } from "@/lib/services/pipeline";

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

async function getFile(fileId: string): Promise<Buffer> {
  const fileRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`
  );
  const fileData = await fileRes.json();
  const filePath = fileData.result.file_path;

  const downloadRes = await fetch(
    `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`
  );
  const arrayBuffer = await downloadRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function findUserByTelegramId(telegramId: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .limit(1);
  return result[0] || null;
}

export async function POST(request: Request) {
  try {
    const update = await request.json();
    const message = update.message;

    if (!message) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const telegramUserId = String(message.from.id);

    // Check authorization
    if (ALLOWED_USERS.length > 0 && !ALLOWED_USERS.includes(telegramUserId)) {
      await sendMessage(chatId, "Voce nao esta autorizado a usar este bot.");
      return NextResponse.json({ ok: true });
    }

    // Find linked user
    const user = await findUserByTelegramId(telegramUserId);

    // Handle /start command
    if (message.text === "/start") {
      if (user) {
        await sendMessage(
          chatId,
          `Ola, ${user.name || user.email}! Envie suas faturas (PDF) ou extratos (CSV/XLS) para processar.`
        );
      } else {
        await sendMessage(
          chatId,
          `Ola! Seu Telegram ID e <code>${telegramUserId}</code>.\n\nPara vincular sua conta, acesse o app e adicione este ID nas configuracoes.`
        );
      }
      return NextResponse.json({ ok: true });
    }

    // Handle /resumo command
    if (message.text === "/resumo") {
      if (!user) {
        await sendMessage(chatId, "Conta nao vinculada. Use /start para ver seu Telegram ID.");
        return NextResponse.json({ ok: true });
      }

      // TODO: fetch and send monthly summary
      await sendMessage(chatId, "Funcionalidade de resumo em desenvolvimento.");
      return NextResponse.json({ ok: true });
    }

    // Handle document upload
    if (message.document && user) {
      const fileName = message.document.file_name;
      const fileSize = message.document.file_size;

      if (fileSize > 5 * 1024 * 1024) {
        await sendMessage(chatId, "Arquivo muito grande (max 5MB).");
        return NextResponse.json({ ok: true });
      }

      await sendMessage(chatId, `Recebi <b>${fileName}</b>. Processando...`);

      try {
        // Detect source
        const source = detectSource(fileName);

        // Download file from Telegram
        const buffer = await getFile(message.document.file_id);

        // Upload to Vercel Blob
        const blob = await put(
          `statements/${user.id}/${Date.now()}-${fileName}`,
          buffer,
          { access: "public" }
        );

        // Create statement record
        const [statement] = await db
          .insert(statements)
          .values({
            userId: user.id,
            source,
            fileName,
            fileUrl: blob.url,
            status: "pending",
          })
          .returning();

        // Process
        const result = await processStatement(
          statement.id,
          buffer,
          fileName,
          source,
          user.id
        );

        let msg = `<b>Processamento concluido!</b>\n\n`;
        msg += `Arquivo: ${fileName}\n`;
        msg += `Transacoes inseridas: ${result.inserted}\n`;
        if (result.duplicates > 0) {
          msg += `Duplicatas ignoradas: ${result.duplicates}\n`;
        }
        if (result.errors.length > 0) {
          msg += `\nErros: ${result.errors.length}`;
        }

        await sendMessage(chatId, msg);
      } catch (error) {
        await sendMessage(
          chatId,
          `Erro ao processar ${fileName}: ${error}`
        );
      }

      return NextResponse.json({ ok: true });
    }

    // Default response
    if (message.text) {
      await sendMessage(
        chatId,
        "Envie um arquivo PDF (fatura) ou CSV/XLS (extrato) para processar.\n\nComandos:\n/start - Iniciar\n/resumo - Resumo do mes"
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}
