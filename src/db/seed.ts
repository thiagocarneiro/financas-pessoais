import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { categories } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const CATEGORIES = [
  // Main categories
  { name: "Alimentacao", slug: "alimentacao", icon: "utensils", color: "#ef4444" },
  { name: "Moradia", slug: "moradia", icon: "house", color: "#f97316" },
  { name: "Transporte", slug: "transporte", icon: "car", color: "#eab308" },
  { name: "Saude e Bem-estar", slug: "saude", icon: "heart", color: "#22c55e" },
  { name: "Compras", slug: "compras", icon: "shopping-bag", color: "#3b82f6" },
  { name: "Lazer", slug: "lazer", icon: "gamepad-2", color: "#8b5cf6" },
  { name: "Educacao", slug: "educacao", icon: "book-open", color: "#06b6d4" },
  { name: "Financeiro", slug: "financeiro", icon: "landmark", color: "#64748b" },
  { name: "Transferencias", slug: "transferencias", icon: "arrow-right-left", color: "#a1a1aa" },
  { name: "Receita", slug: "receita", icon: "wallet", color: "#10b981" },
];

// Subcategories mapped to parent slug
const SUBCATEGORIES: Record<string, { name: string; slug: string }[]> = {
  alimentacao: [
    { name: "Supermercado", slug: "alimentacao-supermercado" },
    { name: "Restaurante/Bar", slug: "alimentacao-restaurante" },
    { name: "Hortifruti/Feira", slug: "alimentacao-hortifruti" },
    { name: "Delivery", slug: "alimentacao-delivery" },
    { name: "Padaria/Cafe", slug: "alimentacao-padaria" },
  ],
  moradia: [
    { name: "Financiamento", slug: "moradia-financiamento" },
    { name: "Condominio", slug: "moradia-condominio" },
    { name: "Contas (gas/luz/agua)", slug: "moradia-contas" },
    { name: "Seguro Residencial", slug: "moradia-seguro" },
    { name: "Manutencao", slug: "moradia-manutencao" },
  ],
  transporte: [
    { name: "Combustivel", slug: "transporte-combustivel" },
    { name: "Estacionamento", slug: "transporte-estacionamento" },
    { name: "Uber/99", slug: "transporte-app" },
    { name: "IPVA/Licenciamento", slug: "transporte-ipva" },
    { name: "Manutencao Veiculo", slug: "transporte-manutencao" },
  ],
  saude: [
    { name: "Farmacia", slug: "saude-farmacia" },
    { name: "Consulta/Exame", slug: "saude-consulta" },
    { name: "Academia", slug: "saude-academia" },
    { name: "Cuidados Pessoais/Beleza", slug: "saude-beleza" },
  ],
  compras: [
    { name: "Marketplace", slug: "compras-marketplace" },
    { name: "Vestuario", slug: "compras-vestuario" },
    { name: "Casa/Decoracao", slug: "compras-casa" },
    { name: "Eletronicos", slug: "compras-eletronicos" },
    { name: "Pets", slug: "compras-pets" },
    { name: "Brinquedos", slug: "compras-brinquedos" },
  ],
  lazer: [
    { name: "Entretenimento", slug: "lazer-entretenimento" },
    { name: "Viagem", slug: "lazer-viagem" },
    { name: "Assinaturas Digitais", slug: "lazer-assinaturas" },
  ],
  educacao: [
    { name: "Cursos", slug: "educacao-cursos" },
    { name: "Escola", slug: "educacao-escola" },
    { name: "Materiais", slug: "educacao-materiais" },
  ],
  financeiro: [
    { name: "Juros/IOF/Taxas", slug: "financeiro-juros" },
    { name: "Impostos", slug: "financeiro-impostos" },
    { name: "Seguros", slug: "financeiro-seguros" },
    { name: "Tarifas Bancarias", slug: "financeiro-tarifas" },
  ],
  transferencias: [
    { name: "PIX Pessoal", slug: "transferencias-pix" },
    { name: "Boleto", slug: "transferencias-boleto" },
  ],
  receita: [
    { name: "Salario", slug: "receita-salario" },
    { name: "PIX Recebido", slug: "receita-pix" },
    { name: "Estorno", slug: "receita-estorno" },
    { name: "Rendimentos", slug: "receita-rendimentos" },
  ],
};

async function seed() {
  console.log("Seeding categories...");

  // Insert main categories
  const inserted = await db
    .insert(categories)
    .values(CATEGORIES)
    .onConflictDoNothing()
    .returning();

  console.log(`Inserted ${inserted.length} main categories`);

  // Build slug -> id map
  const slugToId: Record<string, string> = {};
  for (const cat of inserted) {
    slugToId[cat.slug] = cat.id;
  }

  // Insert subcategories
  let subCount = 0;
  for (const [parentSlug, subs] of Object.entries(SUBCATEGORIES)) {
    const parentId = slugToId[parentSlug];
    if (!parentId) continue;

    const subValues = subs.map((s) => ({
      name: s.name,
      slug: s.slug,
      parentId,
      color: CATEGORIES.find((c) => c.slug === parentSlug)?.color,
    }));

    const result = await db
      .insert(categories)
      .values(subValues)
      .onConflictDoNothing()
      .returning();

    subCount += result.length;
  }

  console.log(`Inserted ${subCount} subcategories`);
  console.log("Seed complete!");
}

seed().catch(console.error);
