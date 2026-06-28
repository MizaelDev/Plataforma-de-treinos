"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { Alert, Button, fieldClass } from "@/components/ui";
import { appConfig } from "@/lib/app-config";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

function cleanToken(token: string) {
  return token.trim().replace(/[.,;:)\]}]+$/g, "");
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = useMemo(() => cleanToken(searchParams.get("token") ?? ""), [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.message ?? "Não foi possível redefinir a senha.");
        return;
      }
      setPassword("");
      setConfirmPassword("");
      setMessage(payload.message ?? "Senha redefinida com sucesso.");
    } catch {
      setError("Não foi possível conectar com a API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#efeeeb] px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-[#ded7cf] bg-[#fffdfa] p-6 shadow-xl shadow-stone-900/10">
        <div className="mb-6 flex items-center gap-3">
          <BrandLogo compact />
          <div>
            <h1 className="text-xl font-semibold text-ink">{appConfig.name}</h1>
            <p className="text-sm text-muted">Crie uma nova senha de acesso.</p>
          </div>
        </div>

        {!token && <Alert type="error" message="Link inválido. Solicite uma nova redefinição de senha." />}

        <label className="mt-4 block text-sm font-medium text-gray-700">
          Nova senha
          <input className={fieldClass} value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={8} disabled={!token} />
        </label>

        <label className="mt-4 block text-sm font-medium text-gray-700">
          Confirmar senha
          <input className={fieldClass} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" minLength={8} disabled={!token} />
        </label>

        <div className="mt-4">
          {error && <Alert type="error" message={error} />}
          {message && <Alert type="success" message={message} />}
        </div>

        <Button className="mt-2 w-full" type="submit" disabled={loading || !token}>
          {loading ? "Salvando..." : "Redefinir senha"}
        </Button>

        <Link href="/login" className="mt-4 block text-center text-sm font-semibold text-brand hover:text-brandDark">
          Voltar para o login
        </Link>
      </form>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#efeeeb] px-4 text-sm text-muted">Carregando...</main>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
