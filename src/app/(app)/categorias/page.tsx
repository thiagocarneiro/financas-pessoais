"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tags } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon?: string;
  transactionCount: number;
  totalAmount: number;
}

export default function CategoriasPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Categorias</h1>
      <p className="text-muted-foreground">
        Gerencie categorias e mapeamento de estabelecimentos. As categorias sao
        atribuidas automaticamente pelo sistema de classificacao com IA.
      </p>

      <Card className="py-12">
        <CardContent className="flex flex-col items-center gap-3">
          <Tags className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">
            Envie faturas para ver as categorias aqui
          </p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Quando voce enviar suas faturas, os estabelecimentos serao
            classificados automaticamente. Voce podera revisar e corrigir as
            classificacoes aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
