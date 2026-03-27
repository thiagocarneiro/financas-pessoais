"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/lib/currency";
import { Tags, Store } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon?: string;
  transactionCount: number;
  totalAmount: number;
  subcategories: Category[];
}

interface Merchant {
  id: string;
  rawName: string;
  displayName: string;
  classificationSource: string;
  confidence: string;
  categoryName?: string;
  categorySlug?: string;
  categoryColor?: string;
}

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [tab, setTab] = useState<"categories" | "merchants">("categories");

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories || []));
    fetch("/api/merchants").then((r) => r.json()).then((d) => setMerchants(d.merchants || []));
  }, []);

  async function updateMerchantCategory(merchantId: string, categorySlug: string) {
    await fetch(`/api/merchants/${merchantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categorySlug }),
    });
    // Refresh
    const res = await fetch("/api/merchants");
    const data = await res.json();
    setMerchants(data.merchants || []);
  }

  const uncategorized = merchants.filter((m) => !m.categorySlug);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Categorias e Estabelecimentos</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={tab === "categories" ? "default" : "outline"}
          onClick={() => setTab("categories")}
        >
          <Tags className="h-4 w-4 mr-2" />
          Categorias ({categories.length})
        </Button>
        <Button
          variant={tab === "merchants" ? "default" : "outline"}
          onClick={() => setTab("merchants")}
        >
          <Store className="h-4 w-4 mr-2" />
          Estabelecimentos ({merchants.length})
          {uncategorized.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {uncategorized.length} sem categoria
            </Badge>
          )}
        </Button>
      </div>

      {tab === "categories" && (
        <div className="space-y-3">
          {categories.map((cat) => (
            <Card key={cat.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <div>
                    <p className="font-medium">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {cat.transactionCount} transacoes
                    </p>
                  </div>
                </div>
                <p className="font-semibold">
                  {cat.totalAmount > 0 ? formatBRL(cat.totalAmount) : "-"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "merchants" && (
        <div className="space-y-3">
          {/* Uncategorized first */}
          {uncategorized.length > 0 && (
            <Card className="border-amber-500/50">
              <CardHeader>
                <CardTitle className="text-base text-amber-600">
                  Sem categoria ({uncategorized.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {uncategorized.map((m) => (
                  <MerchantRow
                    key={m.id}
                    merchant={m}
                    categories={categories}
                    onUpdate={updateMerchantCategory}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* All merchants */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Todos os estabelecimentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {merchants.map((m) => (
                <MerchantRow
                  key={m.id}
                  merchant={m}
                  categories={categories}
                  onUpdate={updateMerchantCategory}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function MerchantRow({
  merchant,
  categories,
  onUpdate,
}: {
  merchant: Merchant;
  categories: Category[];
  onUpdate: (id: string, slug: string) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex-1 min-w-0 mr-3">
        <p className="text-sm font-medium truncate">{merchant.displayName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {merchant.rawName}
          {merchant.classificationSource === "ai" && (
            <span className="ml-1 text-blue-500">
              (IA {parseFloat(merchant.confidence ?? "0") > 0 ? `${(parseFloat(merchant.confidence ?? "0") * 100).toFixed(0)}%` : ""})
            </span>
          )}
        </p>
      </div>
      <Select
        value={merchant.categorySlug || ""}
        onValueChange={(slug) => slug && onUpdate(merchant.id, slug)}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Selecionar..." />
        </SelectTrigger>
        <SelectContent>
          {categories.map((cat) => (
            <SelectItem key={cat.slug} value={cat.slug}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
