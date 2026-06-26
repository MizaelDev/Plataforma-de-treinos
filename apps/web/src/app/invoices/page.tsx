"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  Alert,
  Button,
  ConfirmModal,
  EmptyState,
  LoadingState,
  MobileRecordCard,
  Pagination,
  SectionCard,
  StatusBadge,
  TableToolbar,
  fieldClass
} from "@/components/ui";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, invoiceDisplayAmount, normalizeMoneyInput } from "@/lib/format";

type Student = { id: string; fullName: string };
type Plan = { id: string; name: string; value: string };
type Invoice = {
  id: string;
  student: Student;
  plan?: Plan | null;
  dueDate: string;
  paidAt?: string | null;
  amount: string;
  totalPaid?: string | number;
  status: "PAGO" | "PENDENTE" | "ATRASADO" | "CANCELADO";
  charges?: { total: string; fineAmount: string; interestAmount: string; overdueDays: number };
  paymentTransactions?: PaymentTransaction[];
};

type PaymentTransaction = {
  id: string;
  provider: "MERCADO_PAGO" | "ASAAS" | "EFI";
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED" | "FAILED";
  amount: string;
  paidAt?: string | null;
  createdAt: string;
};

const pageSize = 8;
const today = () => new Date().toISOString().slice(0, 10);
const initialInvoiceForm = () => ({ studentId: "", planId: "", dueDate: today(), amount: "", status: "PENDENTE" });
const paymentStatusLabel: Record<PaymentTransaction["status"], string> = {
  PENDING: "Aguardando Pix",
  PAID: "Pago via Pix",
  EXPIRED: "Pix expirado",
  CANCELLED: "Pix cancelado",
  FAILED: "Pix falhou"
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialInvoiceForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [studentFilter, setStudentFilter] = useState("TODOS");
  const [page, setPage] = useState(1);
  const [invoiceToCancel, setInvoiceToCancel] = useState<Invoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [recentlyPaidId, setRecentlyPaidId] = useState<string | null>(null);

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

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = invoices.filter((invoice) => {
      const matchesSearch = [invoice.student.fullName, invoice.plan?.name ?? "", invoice.status].some((value) =>
        value.toLowerCase().includes(term)
      );
      const matchesStatus = statusFilter === "TODOS" || invoice.status === statusFilter;
      const matchesStudent = studentFilter === "TODOS" || invoice.student.id === studentFilter;
      return matchesSearch && matchesStatus && matchesStudent;
    });

    if (!recentlyPaidId || statusFilter !== "TODOS") {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      if (a.id === recentlyPaidId) return -1;
      if (b.id === recentlyPaidId) return 1;
      return 0;
    });
  }, [invoices, recentlyPaidId, search, statusFilter, studentFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  const visibleInvoices = filteredInvoices.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, studentFilter]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await api(editingId ? `/invoices/${editingId}` : "/invoices", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify({ ...form, planId: form.planId || undefined })
      });
      setForm(initialInvoiceForm());
      setEditingId(null);
      await load();
      setSuccess(editingId ? "Mensalidade atualizada com sucesso." : "Mensalidade registrada com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  function editInvoice(invoice: Invoice) {
    setEditingId(invoice.id);
    setForm({
      studentId: invoice.student.id,
      planId: invoice.plan?.id ?? "",
      dueDate: invoice.dueDate.slice(0, 10),
      amount: String(invoice.amount).replace(".", ","),
      status: invoice.status
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(initialInvoiceForm());
    setEditingId(null);
  }

  async function pay(id: string) {
    setError("");
    setSuccess("");
    try {
      setPayingId(id);
      const payload = await api<{ invoice: { id: string } }>(`/invoices/${id}/pay`, { method: "POST" });
      await load();
      setRecentlyPaidId(payload.invoice.id);
      setStatusFilter("TODOS");
      setPage(1);
      setSuccess("Pagamento registrado como pago.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setPayingId(null);
    }
  }

  async function deleteInvoice(invoice: Invoice) {
    setError("");
    setSuccess("");
    try {
      await api(`/invoices/${invoice.id}/permanent`, { method: "DELETE" });
      setInvoiceToDelete(null);
      await load();
      setSuccess("Mensalidade excluída com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    }
  }

  async function cancelInvoice(invoice: Invoice) {
    setError("");
    setSuccess("");
    try {
      await api(`/invoices/${invoice.id}`, { method: "DELETE" });
      setInvoiceToCancel(null);
      await load();
      setSuccess("Mensalidade cancelada com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    }
  }

  return (
    <AppShell>
      <header className="mb-6">
        <p className="text-sm font-semibold text-brand">Financeiro</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Mensalidades</h1>
        <p className="mt-1 text-sm text-muted">Registro de cobranças, vencimentos, pagamentos, multa e juros.</p>
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
          <label className="text-sm font-medium text-gray-700">
            Status
            <select className={fieldClass} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="PENDENTE">Pendente</option>
              <option value="PAGO">Pago</option>
              <option value="ATRASADO">Atrasado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Salvando..." : editingId ? "Atualizar" : "Registrar"}</Button>
            <Button type="button" variant="secondary" onClick={resetForm}>Cancelar</Button>
          </div>
        </form>
      </SectionCard>

      {loading ? (
        <LoadingState />
      ) : invoices.length === 0 ? (
        <EmptyState title="Nenhuma mensalidade registrada" description="Registre a primeira mensalidade para acompanhar vencimentos e pagamentos." />
      ) : (
        <SectionCard className="overflow-hidden">
          <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Buscar por aluno, plano ou status">
            <label className="w-full text-sm font-medium text-gray-700 sm:w-44">
              Status
              <select className={fieldClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="TODOS">Todos</option>
                <option value="PENDENTE">Pendente</option>
                <option value="PAGO">Pago</option>
                <option value="ATRASADO">Atrasado</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </label>
            <label className="w-full text-sm font-medium text-gray-700 sm:w-56">
              Aluno
              <select className={fieldClass} value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}>
                <option value="TODOS">Todos</option>
                {students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}
              </select>
            </label>
          </TableToolbar>

          {filteredInvoices.length === 0 ? (
            <div className="p-4">
              <EmptyState title="Nenhuma mensalidade encontrada" description="Ajuste a busca ou os filtros para visualizar os registros." />
            </div>
          ) : (
            <>
              <div className="grid gap-3 p-4 md:hidden">
                {visibleInvoices.map((invoice) => {
                  const latestPayment = invoice.paymentTransactions?.[0];
                  return (
                    <MobileRecordCard key={invoice.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-ink">{invoice.student.fullName}</p>
                            <p className="mt-1 text-sm text-muted">{invoice.plan?.name ?? "Mensalidade"}</p>
                          </div>
                          <StatusBadge status={invoice.status} />
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div><p className="text-xs text-muted">Vencimento</p><p className="font-medium text-ink">{formatDate(invoice.dueDate)}</p></div>
                          <div><p className="text-xs text-muted">Pagamento</p><p className="font-medium text-ink">{formatDate(invoice.paidAt)}</p></div>
                          <div><p className="text-xs text-muted">Original</p><p className="font-medium text-ink">{formatCurrency(invoice.amount)}</p></div>
                          <div><p className="text-xs text-muted">Atualizado</p><p className="font-semibold text-ink">{formatCurrency(invoiceDisplayAmount(invoice))}</p></div>
                          <div className="col-span-2"><p className="text-xs text-muted">Pix</p><p className="font-medium text-ink">{latestPayment ? `${paymentStatusLabel[latestPayment.status]} - ${formatDate(latestPayment.paidAt)}` : "-"}</p></div>
                        </div>
                        <div className="mt-4 grid gap-2">
                          <Button type="button" variant="secondary" onClick={() => editInvoice(invoice)}>Editar</Button>
                          {invoice.status !== "PAGO" && invoice.status !== "CANCELADO" && (
                            <Button type="button" variant="secondary" disabled={payingId === invoice.id} onClick={() => pay(invoice.id)}>
                              {payingId === invoice.id ? "Registrando..." : "Marcar pago"}
                            </Button>
                          )}
                          {invoice.status !== "CANCELADO" && (
                            <Button type="button" variant="danger" onClick={() => setInvoiceToCancel(invoice)}>Cancelar</Button>
                          )}
                          <Button type="button" variant="danger" onClick={() => setInvoiceToDelete(invoice)}>Excluir</Button>
                        </div>
                    </MobileRecordCard>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1120px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Aluno</th>
                      <th className="px-4 py-3">Plano</th>
                      <th className="px-4 py-3">Vencimento</th>
                      <th className="px-4 py-3">Pagamento</th>
                      <th className="px-4 py-3">Valor original</th>
                      <th className="px-4 py-3">Multa</th>
                      <th className="px-4 py-3">Juros</th>
                      <th className="px-4 py-3">Atualizado</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Pix</th>
                      <th className="px-4 py-3">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleInvoices.map((invoice) => {
                      const latestPayment = invoice.paymentTransactions?.[0];
                      return (
                        <tr key={invoice.id} className="border-t border-gray-100 hover:bg-gray-50/70">
                          <td className="px-4 py-3 font-medium text-ink">{invoice.student.fullName}</td>
                          <td className="px-4 py-3 text-gray-600">{invoice.plan?.name ?? "-"}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(invoice.dueDate)}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(invoice.paidAt)}</td>
                          <td className="px-4 py-3 text-gray-600">{formatCurrency(invoice.amount)}</td>
                          <td className="px-4 py-3 text-gray-600">{formatCurrency(invoice.charges?.fineAmount ?? 0)}</td>
                          <td className="px-4 py-3 text-gray-600">{formatCurrency(invoice.charges?.interestAmount ?? 0)}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(invoiceDisplayAmount(invoice))}</td>
                          <td className="px-4 py-3"><StatusBadge status={invoice.status} /></td>
                          <td className="px-4 py-3">
                            {latestPayment ? (
                              <div>
                                <StatusBadge status={paymentStatusLabel[latestPayment.status]} />
                                <p className="mt-1 text-xs text-muted">{formatDate(latestPayment.paidAt)}</p>
                              </div>
                            ) : "-"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Button type="button" variant="secondary" className="h-8 px-3" onClick={() => editInvoice(invoice)}>
                                Editar
                              </Button>
                              {invoice.status !== "PAGO" && invoice.status !== "CANCELADO" && (
                                <Button type="button" variant="secondary" className="h-8 px-3" disabled={payingId === invoice.id} onClick={() => pay(invoice.id)}>
                                  {payingId === invoice.id ? "Registrando..." : "Marcar pago"}
                                </Button>
                              )}
                              {invoice.status !== "CANCELADO" && (
                                <Button type="button" variant="danger" className="h-8 px-3" onClick={() => setInvoiceToCancel(invoice)}>
                                  Cancelar
                                </Button>
                              )}
                              <Button type="button" variant="danger" className="h-8 px-3" onClick={() => setInvoiceToDelete(invoice)}>
                                Excluir
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} totalPages={totalPages} totalItems={filteredInvoices.length} onPageChange={setPage} />
            </>
          )}
        </SectionCard>
      )}

      <ConfirmModal
        open={!!invoiceToCancel}
        title="Cancelar mensalidade"
        description={`A mensalidade de ${invoiceToCancel?.student.fullName ?? ""} será marcada como cancelada.`}
        confirmLabel="Cancelar mensalidade"
        onCancel={() => setInvoiceToCancel(null)}
        onConfirm={() => invoiceToCancel && cancelInvoice(invoiceToCancel)}
      />
      <ConfirmModal
        open={!!invoiceToDelete}
        title="Excluir mensalidade"
        description={`A mensalidade de ${invoiceToDelete?.student.fullName ?? ""} será removida definitivamente. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir mensalidade"
        onCancel={() => setInvoiceToDelete(null)}
        onConfirm={() => invoiceToDelete && deleteInvoice(invoiceToDelete)}
      />
    </AppShell>
  );
}
