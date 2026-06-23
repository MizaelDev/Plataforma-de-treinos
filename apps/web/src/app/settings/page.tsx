"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Alert, Button, LoadingState, SectionCard, StatusBadge, fieldClass } from "@/components/ui";
import { api, getStoredUser, type SessionUser } from "@/lib/api";
import { normalizeMoneyInput } from "@/lib/format";

type FinancialSettings = {
  id: string;
  fixedFinePercentage: string;
  dailyInterestPercentage: string;
  monthlyInterestPercentage: string;
};

const emptyFinancialForm = () => ({
  fixedFinePercentage: "2",
  dailyInterestPercentage: "0,033",
  monthlyInterestPercentage: "1"
});

function decimalToInput(value: string | number) {
  return String(value).replace(".", ",");
}

export default function SettingsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [form, setForm] = useState(emptyFinancialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadFinancialSettings() {
    const payload = await api<{ settings: FinancialSettings }>("/settings/financial");
    setForm({
      fixedFinePercentage: decimalToInput(payload.settings.fixedFinePercentage),
      dailyInterestPercentage: decimalToInput(payload.settings.dailyInterestPercentage),
      monthlyInterestPercentage: decimalToInput(payload.settings.monthlyInterestPercentage)
    });
  }

  useEffect(() => {
    setUser(getStoredUser());
    loadFinancialSettings()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const payload = await api<{ settings: FinancialSettings }>("/settings/financial", {
        method: "PUT",
        body: JSON.stringify(form)
      });
      setForm({
        fixedFinePercentage: decimalToInput(payload.settings.fixedFinePercentage),
        dailyInterestPercentage: decimalToInput(payload.settings.dailyInterestPercentage),
        monthlyInterestPercentage: decimalToInput(payload.settings.monthlyInterestPercentage)
      });
      setSuccess("Configuracoes financeiras salvas com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <header className="mb-6">
        <p className="text-sm font-semibold text-brand">Administracao</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Configuracoes</h1>
        <p className="mt-1 text-sm text-muted">Ajustes financeiros usados no calculo de mensalidades em atraso.</p>
      </header>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      {loading ? (
        <LoadingState />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <SectionCard className="p-5">
            <p className="text-sm font-semibold text-ink">Usuario logado</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
                <span className="text-muted">Nome</span>
                <span className="font-medium text-ink">{user?.name ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
                <span className="text-muted">E-mail</span>
                <span className="font-medium text-ink">{user?.email ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted">Perfil</span>
                <StatusBadge status={user?.role ?? "ADMIN"} />
              </div>
            </div>
          </SectionCard>

          <SectionCard className="p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">Financeiro</p>
                <p className="mt-1 text-sm text-muted">Percentuais aplicados automaticamente em mensalidades vencidas.</p>
              </div>
              <StatusBadge status="ATIVO" />
            </div>

            <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-3">
              <label className="text-sm font-medium text-gray-700">
                Multa fixa (%)
                <input
                  className={fieldClass}
                  value={form.fixedFinePercentage}
                  onChange={(event) => setForm((current) => ({ ...current, fixedFinePercentage: normalizeMoneyInput(event.target.value) }))}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Juros ao dia (%)
                <input
                  className={fieldClass}
                  value={form.dailyInterestPercentage}
                  onChange={(event) => setForm((current) => ({ ...current, dailyInterestPercentage: normalizeMoneyInput(event.target.value) }))}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Juros ao mes (%)
                <input
                  className={fieldClass}
                  value={form.monthlyInterestPercentage}
                  onChange={(event) => setForm((current) => ({ ...current, monthlyInterestPercentage: normalizeMoneyInput(event.target.value) }))}
                />
              </label>
              <div className="flex gap-2 md:col-span-3">
                <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar configuracoes"}</Button>
                <Button type="button" variant="secondary" onClick={loadFinancialSettings} disabled={saving}>Cancelar</Button>
              </div>
            </form>
          </SectionCard>
        </div>
      )}
    </AppShell>
  );
}
