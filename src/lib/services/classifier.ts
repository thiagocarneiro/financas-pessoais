import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { categories, merchants } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { searchMerchant } from "./brave-search";

const anthropic = new Anthropic();

// Itau category -> our category slug mapping
const ITAU_CATEGORY_MAP: Record<string, string> = {
  ALIMENTACAO: "alimentacao",
  "ALIMENTAÇÃO": "alimentacao",
  VESTUARIO: "compras",
  "VESTUÁRIO": "compras",
  SAUDE: "saude",
  "SAÚDE": "saude",
  VEICULOS: "transporte",
  "VEÍCULOS": "transporte",
  EDUCACAO: "educacao",
  "EDUCAÇÃO": "educacao",
  "TURISMO E ENTRETENIMENTO": "lazer",
  "TURISMO E ENTRETENIN": "lazer",
  "TURISMO E ENTRETENIM": "lazer",
  HOBBY: "lazer",
  MORADIA: "moradia",
  DIVERSOS: "", // needs AI classification
};

interface ClassificationResult {
  categorySlug: string;
  subcategorySlug?: string;
  displayName: string;
  confidence: number;
  source: "itau" | "ai" | "manual";
}

/**
 * Classify a merchant into a category.
 *
 * Pipeline:
 * 1. Check if merchant already exists in DB (exact match)
 * 2. If Itau category is available, use mapping
 * 3. Search Brave for merchant info
 * 4. Use Claude to classify based on search results
 */
export async function classifyMerchant(
  rawName: string,
  itauCategory?: string
): Promise<ClassificationResult> {
  // 1. Check existing merchant
  const existing = await db
    .select()
    .from(merchants)
    .where(sql`lower(${merchants.rawName}) = lower(${rawName})`)
    .limit(1);

  if (existing.length > 0 && existing[0].categoryId) {
    const cat = await db
      .select()
      .from(categories)
      .where(eq(categories.id, existing[0].categoryId))
      .limit(1);

    return {
      categorySlug: cat[0]?.slug || "outros",
      displayName: existing[0].displayName,
      confidence: 1.0,
      source: existing[0].classificationSource as any || "manual",
    };
  }

  // 2. Try Itau category mapping
  if (itauCategory) {
    const normalized = itauCategory.toUpperCase().trim();
    const slug = ITAU_CATEGORY_MAP[normalized];
    if (slug) {
      return {
        categorySlug: slug,
        displayName: cleanMerchantName(rawName),
        confidence: 0.9,
        source: "itau",
      };
    }
  }

  // 3. Search Brave for merchant info
  const searchResults = await searchMerchant(rawName);
  const searchContext = searchResults
    .map((r) => `- ${r.title}: ${r.description}`)
    .join("\n");

  // 4. Use Claude to classify
  return classifyWithClaude(rawName, searchContext);
}

async function classifyWithClaude(
  rawName: string,
  searchContext: string
): Promise<ClassificationResult> {
  const categorySlugs = [
    "alimentacao (supermercados, restaurantes, bares, hortifruti, padarias, delivery)",
    "moradia (financiamento, condominio, contas de gas/luz/agua, seguros residenciais)",
    "transporte (combustivel, estacionamento, uber/99, IPVA, manutencao de veiculo)",
    "saude (farmacias, consultas, exames, academia, beleza, cuidados pessoais)",
    "compras (marketplaces como Amazon/Shopee/AliExpress, roupas, eletronicos, pets, brinquedos, casa)",
    "lazer (entretenimento, viagens, assinaturas digitais como Spotify/Netflix/Google/Apple)",
    "educacao (cursos, escolas, materiais didaticos)",
    "financeiro (juros, IOF, taxas bancarias, impostos, seguros)",
    "transferencias (PIX pessoal, boletos)",
    "receita (salario, rendimentos, estornos)",
  ];

  const prompt = `Classifique este estabelecimento brasileiro em uma das categorias abaixo.

Estabelecimento: "${rawName}"

${searchContext ? `Informacoes encontradas na web:\n${searchContext}\n` : ""}
Categorias disponiveis:
${categorySlugs.map((c) => `- ${c}`).join("\n")}

Responda APENAS com JSON:
{
  "category_slug": "slug da categoria",
  "display_name": "nome limpo e legivel do estabelecimento",
  "confidence": 0.0 a 1.0
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response");
    }

    let jsonStr = textBlock.text.trim();
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    const result = JSON.parse(jsonStr);

    return {
      categorySlug: result.category_slug,
      displayName: result.display_name || cleanMerchantName(rawName),
      confidence: result.confidence || 0.5,
      source: "ai",
    };
  } catch (error) {
    console.error("Claude classification error:", error);
    return {
      categorySlug: "compras",
      displayName: cleanMerchantName(rawName),
      confidence: 0.3,
      source: "ai",
    };
  }
}

/**
 * Clean up a raw merchant name for display.
 */
function cleanMerchantName(raw: string): string {
  let name = raw
    .replace(/\*+/g, " ") // replace asterisks
    .replace(/\d{4,}/g, "") // remove long numbers
    .replace(/\s{2,}/g, " ") // collapse spaces
    .replace(/-CT\b/gi, "") // remove -CT suffix
    .replace(/\bPARC\s?\d+\/\d+/gi, "") // remove PARC 01/03
    .trim();

  // Title case
  name = name
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return name || raw;
}

export { cleanMerchantName };
