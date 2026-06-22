"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell } from "lucide-react";
import { Alert, Button, fieldClass } from "@/components/ui";
import { setSession } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@academia.test");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.message ?? "Falha no login.");
        return;
      }

      setSession(payload.token, payload.user);
      router.push("/");
    } catch {
      setError("Nao foi possivel conectar com a API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f8] px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-brand text-white">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink">Entrar no painel</h1>
            <p className="text-sm text-muted">Use um usuario administrativo para gerenciar a academia.</p>
          </div>
        </div>

        <label className="block text-sm font-medium text-gray-700">
          E-mail
          <input
            className={fieldClass}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-gray-700">
          Senha
          <input
            className={fieldClass}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
          />
        </label>

        <div className="mt-4">{error && <Alert type="error" message={error} />}</div>

        <Button className="mt-2 w-full" type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </main>
  );
}
