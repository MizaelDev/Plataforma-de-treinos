"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { Alert, Button, fieldClass } from "@/components/ui";
import { getStoredUser, setSession } from "@/lib/api";
import { appConfig } from "@/lib/app-config";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@academia.test");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) return;
    router.replace(user.role === "ALUNO" ? "/student/dashboard" : "/");
  }, [router]);

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
      router.push(payload.user.role === "ALUNO" ? "/student/dashboard" : "/");
    } catch {
      setError("Não foi possível conectar com a API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#efeeeb] px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg border border-[#ded7cf] bg-[#fffdfa] p-6 shadow-xl shadow-stone-900/10">
        <div className="mb-6 flex items-center gap-3">
          <BrandLogo compact />
          <div>
            <h1 className="text-xl font-semibold text-ink">{appConfig.name}</h1>
            <p className="text-sm text-muted">Acesse sua área de gestão ou acompanhamento.</p>
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
