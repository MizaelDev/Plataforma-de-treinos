"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Alert, Button, fieldClass } from "@/components/ui";
import { appConfig } from "@/lib/app-config";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.message ?? "Não foi possível solicitar a redefinição.");
        return;
      }
      setMessage(payload.message ?? "Se o e-mail estiver cadastrado, enviaremos um link.");
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
            <p className="text-sm text-muted">Informe seu e-mail para receber o link de redefinição.</p>
          </div>
        </div>

        <label className="block text-sm font-medium text-gray-700">
          E-mail
          <input className={fieldClass} value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
        </label>

        <div className="mt-4">
          {error && <Alert type="error" message={error} />}
          {message && <Alert type="success" message={message} />}
        </div>

        <Button className="mt-2 w-full" type="submit" disabled={loading}>
          {loading ? "Enviando..." : "Enviar link"}
        </Button>

        <Link href="/login" className="mt-4 block text-center text-sm font-semibold text-brand hover:text-brandDark">
          Voltar para o login
        </Link>
      </form>
    </main>
  );
}
