"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Alert, Button, EmptyState, LoadingState, SectionCard, StatusBadge, fieldClass } from "@/components/ui";
import { api } from "@/lib/api";
import { formatCurrency, normalizeMoneyInput } from "@/lib/format";

type Plan = {
  id: string;
  name: string;
  value: string;
  modality: string;
  durationDays: number;
  dueDay: number;
  isActive: boolean;
};

const planFields: Array<{ name: "name" | "value" | "modality" | "durationDays" | "dueDay"; label: string }> = [
  { name: "name", label: "Nome" },
  { name: "value", label: "Valor" },
  { name: "modality", label: "Modalidade" },
  { name: "durationDays", label: "Duracao" },
  { name: "dueDay", label: "Vencimento" }
];

const initialPlanForm = () => ({ name: "", value: "", modality: "", durationDays: "30", dueDay: "10", isActive: true });

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialPlanForm);

  async function load() {
    const payload = await api<{ plans: Plan[] }>("/plans");
    setPlans(payload.plans);
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await api("/plans", { method: "POST", body: JSON.stringify(form) });
      setForm(initialPlanForm());
      await load();
      setSuccess("Plano criado com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <header className="mb-6">
        <p className="text-sm font-semibold text-brand">Comercial</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Planos</h1>
        <p className="mt-1 text-sm text-muted">Planos por modalidade, valor, duracao e dia de vencimento.</p>
      </header>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <SectionCard className="mb-6 p-4">
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {planFields.map(({ name, label }) => (
          <label key={name} className="text-sm font-medium text-gray-700">
            {label}
            <input
              className={fieldClass}
              value={form[name]}
              onChange={(event) => {
                const value = name === "value" ? normalizeMoneyInput(event.target.value) : event.target.value;
                setForm((current) => ({ ...current, [name]: value }));
              }}
            />
          </label>
        ))}
        <div className="md:col-span-2 xl:col-span-5">
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Criar plano"}</Button>
        </div>
      </form>
      </SectionCard>

      {loading ? (
        <LoadingState />
      ) : plans.length === 0 ? (
        <EmptyState title="Nenhum plano cadastrado" description="Crie um plano para vincular alunos e registrar mensalidades." />
      ) : (
      <SectionCard className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Modalidade</th>
              <th className="px-4 py-3">Duracao</th>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id} className="border-t border-gray-100 hover:bg-gray-50/70">
                <td className="px-4 py-3 font-medium text-ink">{plan.name}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(plan.value)}</td>
                <td className="px-4 py-3 text-gray-600">{plan.modality}</td>
                <td className="px-4 py-3 text-gray-600">{plan.durationDays} dias</td>
                <td className="px-4 py-3 text-gray-600">Dia {plan.dueDay}</td>
                <td className="px-4 py-3"><StatusBadge status={plan.isActive ? "ATIVO" : "INATIVO"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </SectionCard>
      )}
    </AppShell>
  );
}
