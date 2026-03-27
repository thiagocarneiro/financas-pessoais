"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface UploadResult {
  statementId: string;
  source: string;
  inserted: number;
  duplicates: number;
  errors: string[];
}

const SOURCE_LABELS: Record<string, string> = {
  santander_bank: "Extrato Santander",
  santander_mastercard: "Fatura Santander MasterCard",
  itau_visa: "Fatura Itau Visa",
};

export default function ExtratosPage() {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = useCallback(async (files: FileList | File[]) => {
    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/statements/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Erro ${res.status}`);
        }

        const result: UploadResult = await res.json();
        setResults((prev) => [result, ...prev]);
      } catch (err) {
        setError(`Erro ao processar ${file.name}: ${err}`);
      }
    }

    setUploading(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleUpload(e.dataTransfer.files);
      }
    },
    [handleUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleUpload(e.target.files);
      }
    },
    [handleUpload]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Extratos e Faturas</h1>

      {/* Upload Zone */}
      <Card>
        <CardContent className="pt-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-lg font-medium">Processando...</p>
                <p className="text-sm text-muted-foreground">
                  Analisando transacoes e classificando estabelecimentos
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="text-lg font-medium">
                  Arraste arquivos aqui ou clique para selecionar
                </p>
                <p className="text-sm text-muted-foreground">
                  PDF (faturas Santander/Itau), CSV ou XLS (extrato Santander)
                </p>
                <label className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                    Selecionar Arquivos
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.csv,.xls,.xlsx"
                      className="hidden"
                      onChange={handleFileInput}
                    />
                  </label>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados do Processamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="font-medium">
                      {SOURCE_LABELS[r.source] || r.source}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {r.inserted} transacoes inseridas
                      {r.duplicates > 0 && `, ${r.duplicates} duplicatas ignoradas`}
                    </p>
                  </div>
                </div>
                {r.errors.length > 0 && (
                  <Badge variant="destructive">{r.errors.length} erros</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
