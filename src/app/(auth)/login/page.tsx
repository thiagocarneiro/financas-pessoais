"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const verify = searchParams.get("verify");
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("resend", { email, callbackUrl });
    setLoading(false);
  }

  if (verify) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Wallet className="mx-auto h-12 w-12 text-primary mb-2" />
          <CardTitle>Verifique seu email</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <p>
            Enviamos um link de acesso para o seu email. Clique no link para
            entrar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <Wallet className="mx-auto h-12 w-12 text-primary mb-2" />
        <CardTitle>Financas Pessoais</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Entrar com Magic Link"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-center text-muted-foreground">
          Enviaremos um link de acesso para o seu email.
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
