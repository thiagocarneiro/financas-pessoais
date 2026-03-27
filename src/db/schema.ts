import {
  pgTable,
  uuid,
  text,
  date,
  decimal,
  boolean,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// ============================================================
// Auth.js tables (required by @auth/drizzle-adapter)
// ============================================================

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  telegramId: text("telegram_id"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    {
      compoundKey: primaryKey({
        columns: [account.provider, account.providerAccountId],
      }),
    },
  ]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [
    {
      compoundKey: primaryKey({
        columns: [vt.identifier, vt.token],
      }),
    },
  ]
);

// ============================================================
// App tables
// ============================================================

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon"),
  color: text("color"),
  parentId: uuid("parent_id").references((): any => categories.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "subcategories",
  }),
  children: many(categories, { relationName: "subcategories" }),
  merchants: many(merchants),
  transactions: many(transactions),
}));

export const merchants = pgTable(
  "merchants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rawName: text("raw_name").notNull(),
    displayName: text("display_name").notNull(),
    categoryId: uuid("category_id").references(() => categories.id),
    subcategoryId: uuid("subcategory_id").references(() => categories.id),
    classificationSource: text("classification_source")
      .notNull()
      .default("auto"),
    confidence: decimal("confidence", { precision: 3, scale: 2 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("idx_merchants_raw").on(t.rawName)]
);

export const merchantsRelations = relations(merchants, ({ one }) => ({
  category: one(categories, {
    fields: [merchants.categoryId],
    references: [categories.id],
  }),
}));

export const statements = pgTable("statements", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  source: text("source").notNull(), // 'santander_bank' | 'santander_mastercard' | 'itau_visa'
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  dueDate: date("due_date"),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const statementsRelations = relations(statements, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    statementId: uuid("statement_id").references(() => statements.id),
    merchantId: uuid("merchant_id").references(() => merchants.id),
    categoryId: uuid("category_id").references(() => categories.id),
    transactionDate: date("transaction_date").notNull(),
    description: text("description").notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    type: text("type").notNull(), // 'debit' | 'credit'
    currency: text("currency").notNull().default("BRL"),
    amountUsd: decimal("amount_usd", { precision: 12, scale: 2 }),
    source: text("source").notNull(),
    cardLastDigits: text("card_last_digits"),
    cardholderName: text("cardholder_name"),
    isInstallment: boolean("is_installment").default(false),
    installmentCurrent: integer("installment_current"),
    installmentTotal: integer("installment_total"),
    installmentGroupId: uuid("installment_group_id"),
    categoryOverride: boolean("category_override").default(false),
    itauCategory: text("itau_category"),
    dedupHash: text("dedup_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_transactions_dedup").on(t.dedupHash),
    index("idx_transactions_user_date").on(t.userId, t.transactionDate),
  ]
);

export const transactionsRelations = relations(transactions, ({ one }) => ({
  statement: one(statements, {
    fields: [transactions.statementId],
    references: [statements.id],
  }),
  merchant: one(merchants, {
    fields: [transactions.merchantId],
    references: [merchants.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));

export const savingsGoals = pgTable("savings_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  targetAmount: decimal("target_amount", { precision: 12, scale: 2 }).notNull(),
  targetDate: date("target_date"),
  monthlyTarget: decimal("monthly_target", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const monthlySummaries = pgTable(
  "monthly_summaries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    yearMonth: text("year_month").notNull(),
    totalIncome: decimal("total_income", { precision: 12, scale: 2 }).default(
      "0"
    ),
    totalExpenses: decimal("total_expenses", {
      precision: 12,
      scale: 2,
    }).default("0"),
    savingsRate: decimal("savings_rate", { precision: 5, scale: 2 }),
    breakdownByCategory: jsonb("breakdown_by_category"),
  },
  (t) => [uniqueIndex("idx_summaries_user_month").on(t.userId, t.yearMonth)]
);

export const classificationCorrections = pgTable(
  "classification_corrections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id),
    oldCategoryId: uuid("old_category_id").references(() => categories.id),
    newCategoryId: uuid("new_category_id")
      .notNull()
      .references(() => categories.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  }
);
