"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface EditCategoryModalProps {
  open: boolean;
  onClose: () => void;
  transactionId: string;
  currentCategory?: string;
  description: string;
  onSaved: () => void;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export function EditCategoryModal({
  open,
  onClose,
  transactionId,
  currentCategory,
  description,
  onSaved,
}: EditCategoryModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState(currentCategory || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/categories")
        .then((r) => r.json())
        .then((d) => setCategories(d.categories || []));
      setSelected(currentCategory || "");
    }
  }, [open, currentCategory]);

  async function handleSave() {
    if (!selected) return;
    setSaving(true);

    await fetch(`/api/transactions/${transactionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categorySlug: selected }),
    });

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar Categoria</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <Select value={selected} onValueChange={(v) => v && setSelected(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecionar categoria..." />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.slug} value={cat.slug}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!selected || saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
