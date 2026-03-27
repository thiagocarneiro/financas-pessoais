"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Plus } from "lucide-react";
import { formatBRL } from "@/lib/currency";

interface Goal {
  id: string;
  name: string;
  targetAmount: string;
  monthlyTarget?: string | null;
  targetDate?: string | null;
}

export default function MetasPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    targetAmount: "",
    monthlyTarget: "",
    targetDate: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, []);

  async function fetchGoals() {
    try {
      const res = await fetch("/api/savings/goals");
      if (res.ok) {
        const data = await res.json();
        setGoals(data.goals || []);
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/savings/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          targetAmount: parseFloat(formData.targetAmount),
          monthlyTarget: formData.monthlyTarget
            ? parseFloat(formData.monthlyTarget)
            : null,
          targetDate: formData.targetDate || null,
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setFormData({ name: "", targetAmount: "", monthlyTarget: "", targetDate: "" });
        fetchGoals();
      }
    } catch (error) {
      console.error("Error saving goal:", error);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Metas de Economia</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Meta
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Meta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da meta</Label>
                <Input
                  placeholder="Ex: Reserva de Emergencia"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor alvo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="10000"
                    value={formData.targetAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, targetAmount: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta mensal (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="1000"
                    value={formData.monthlyTarget}
                    onChange={(e) =>
                      setFormData({ ...formData, monthlyTarget: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data alvo (opcional)</Label>
                <Input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) =>
                    setFormData({ ...formData, targetDate: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {goals.length === 0 && !showForm ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center gap-3">
            <Target className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">Nenhuma meta definida</p>
            <p className="text-sm text-muted-foreground">
              Crie metas de economia para acompanhar seu progresso
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <Card key={goal.id}>
              <CardHeader>
                <CardTitle className="text-lg">{goal.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Alvo</span>
                  <span className="font-medium">
                    {formatBRL(parseFloat(goal.targetAmount))}
                  </span>
                </div>
                {goal.monthlyTarget && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Meta mensal</span>
                    <span className="font-medium">
                      {formatBRL(parseFloat(goal.monthlyTarget))}
                    </span>
                  </div>
                )}
                {goal.targetDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Data alvo</span>
                    <span className="font-medium">
                      {new Date(goal.targetDate + "T00:00:00").toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
