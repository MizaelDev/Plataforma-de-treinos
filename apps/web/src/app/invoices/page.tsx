"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Alert, Button, EmptyState, LoadingState, SectionCard, StatusBadge, fieldClass } from "@/components/ui";
import { api } from "@/lib/api";
import { formatCurrency, normalizeMoneyInput } from "@/lib/format";

type Student = { id: string; fullName: string };
type Plan = { id: string; name: string; value: string };
type Invoice = {
  id: string;
  student: Student;
  plan?: Plan | null;
  dueDate: string;
  amount: string;
  status: "PAGO" | "PENDENTE" | "ATRASADO" | "CANCELADO";
  charges?: { total: string; fineAmount: string; interestAmount: string; overdueDays: number };
};

const today = () => new Date().toISOString().slice(0, 10);
const initialInvoiceForm = () => ({ studentId: "", planId: "", dueDate: today(), amount: "", status: "PENDENTE" });

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialInvoiceForm);

  async function load() {
    const [invoicePayload, studentPayload, planPayload] = await Promise.all([
      api<{ invoices: Invoice[] }>("/invoices"),
      api<{ students: Student[] }>("/students"),
      api<{ plans: Plan[] }>("/plans")
    ]);
    setInvoices(invoicePayload.invoices);
    setStudents(studentPayload.students);
    setPlans(planPayload.plans);
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
      await api("/invoices", { method: "POST", body: JSON.stringify({ ...form, planId: form.planId || undefined }) });
      setForm(initialInvoiceForm());
      await load();
      setSuccess("Mensalidade registrada com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  async function pay(id: string) {
    setError("");
    setSuccess("");
    try {
      await api(`/invoices/${id}/pay`, { method: "POST" });
      await load();
      setSuccess("Pagamento registrado com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    }
  }

  return (
    <AppShell>
      <header className="mb-6">
        <p className="text-sm font-semibold text-brand">Financeiro</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Mensalidades</h1>
        <p className="mt-1 text-sm text-muted">Registro de cobrancas, vencimentos, pagamentos, multa e juros.</p>
      </header>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <SectionCard className="mb-6 p-4">
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="text-sm font-medium text-gray-700">
          Aluno
          <select className={fieldClass} value={form.studentId} onChange={(event) => setForm((current) => ({ ...current, studentId: event.target.value }))}>
            <option value="">Selecione</option>
            {students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">
          Plano
          <select
            className={fieldClass}
            value={form.planId}
            onChange={(event) => {
              const planId = event.target.value;
              const selectedPlan = plans.find((plan) => plan.id === planId);
              setForm((current) => ({
                ...current,
                planId,
                amount: selectedPlan ? String(selectedPlan.value).replace(".", ",") : ""
              }));
            }}
          >
            <option value="">Sem plano</option>
            {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">
          Vencimento
          <input className={fieldClass} type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Valor
          <input className={fieldClass} value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: normalizeMoneyInput(event.target.value) }))} />
        </label>
        <div className="flex items-end">
          <Button type="submit" className="w-full" disabled={saving}>{saving ? "Registrando..." : "Registrar"}</Button>
        </div>
      </form>
      </SectionCard>

      {loading ? (
        <LoadingState />
      ) : invoices.length === 0 ? (
        <EmptyState title="Nenhuma mensalidade registrada" description="Registre a primeira mensalidade para acompanhar vencimentos e pagamentos." />
      ) : (
      <SectionCard className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Aluno</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3">Total atualizado</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Acao</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-t border-gray-100 hover:bg-gray-50/70">
                <td className="px-4 py-3 font-medium text-ink">{invoice.student.fullName}</td>
                <td className="px-4 py-3 text-gray-600">{invoice.plan?.name ?? "-"}</td>
                <td className="px-4 py-3 text-gray-600">{new Date(invoice.dueDate).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(invoice.charges?.total ?? invoice.amount)}</td>
                <td className="px-4 py-3"><StatusBadge status={invoice.status} /></td>
                <td className="px-4 py-3">
                  {invoice.status !== "PAGO" && (
                    <Button type="button" variant="secondary" className="h-8 px-3" onClick={() => pay(invoice.id)}>
                      Marcar pago
                    </Button>
                  )}
                </td>
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
