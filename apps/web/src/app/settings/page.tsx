"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Alert, Button, LoadingState, SectionCard, StatusBadge, fieldClass } from "@/components/ui";
import { api, getStoredUser, type SessionUser } from "@/lib/api";
import { formatDateTime, normalizeMoneyInput } from "@/lib/format";

type FinancialSettings = {
  id: string;
  fixedFinePercentage: string;
  dailyInterestPercentage: string;
  monthlyInterestPercentage: string;
};

type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  createdAt: string;
  actor?: { name: string; email: string; role: string } | null;
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
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadFinancialSettings() {
    const [payload, auditPayload] = await Promise.all([
      api<{ settings: FinancialSettings }>("/settings/financial"),
      api<{ logs: AuditLog[] }>("/audit-logs")
    ]);
    setForm({
      fixedFinePercentage: decimalToInput(payload.settings.fixedFinePercentage),
      dailyInterestPercentage: decimalToInput(payload.settings.dailyInterestPercentage),
      monthlyInterestPercentage: decimalToInput(payload.settings.monthlyInterestPercentage)
    });
    setAuditLogs(auditPayload.logs);
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
      setSuccess("Configurações financeiras salvas com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <header className="mb-6">
        <p className="text-sm font-semibold text-brand">Administração</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Configurações</h1>
        <p className="mt-1 text-sm text-muted">Ajustes financeiros usados no cálculo de mensalidades em atraso.</p>
      </header>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      {loading ? (
        <LoadingState />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <SectionCard className="p-5">
            <p className="text-sm font-semibold text-ink">Usuário logado</p>
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
                Juros ao mês (%)
                <input
                  className={fieldClass}
                  value={form.monthlyInterestPercentage}
                  onChange={(event) => setForm((current) => ({ ...current, monthlyInterestPercentage: normalizeMoneyInput(event.target.value) }))}
                />
              </label>
              <div className="flex gap-2 md:col-span-3">
                <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar configurações"}</Button>
                <Button type="button" variant="secondary" onClick={loadFinancialSettings} disabled={saving}>Cancelar</Button>
              </div>
            </form>
          </SectionCard>

          <SectionCard className="p-5 lg:col-span-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">Auditoria recente</p>
                <p className="mt-1 text-sm text-muted">Últimas ações administrativas registradas no sistema.</p>
              </div>
              <StatusBadge status="ATIVO" />
            </div>

            <div className="mt-4 overflow-x-auto">
              {auditLogs.length === 0 ? (
                <div className="rounded-md border border-dashed border-gray-200 p-4 text-sm text-muted">Nenhum evento de auditoria registrado ainda.</div>
              ) : (
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Usuário</th>
                      <th className="px-4 py-3">Ação</th>
                      <th className="px-4 py-3">Entidade</th>
                      <th className="px-4 py-3">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 text-gray-600">{formatDateTime(log.createdAt)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink">{log.actor?.name ?? "Sistema"}</p>
                          <p className="text-xs text-muted">{log.actor?.email ?? "-"}</p>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={log.action} /></td>
                        <td className="px-4 py-3 text-gray-600">{log.entity}</td>
                        <td className="px-4 py-3 text-xs text-muted">{log.entityId ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </SectionCard>
        </div>
      )}
    </AppShell>
  );
}
