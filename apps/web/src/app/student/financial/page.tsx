"use client";

import { useEffect, useMemo, useState } from "react";
import { StudentShell } from "@/components/student-shell";
import { Alert, EmptyState, LoadingState, SectionCard, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type { InvoiceSummary } from "../types";

export default function StudentFinancialPage() {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ invoices: InvoiceSummary[] }>("/student/financial")
      .then((payload) => setInvoices(payload.invoices))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totals = useMemo(
    () => ({
      paid: invoices.filter((invoice) => invoice.status === "PAGO").length,
      pending: invoices.filter((invoice) => invoice.status === "PENDENTE").length,
      overdue: invoices.filter((invoice) => invoice.status === "ATRASADO" || (invoice.status === "PENDENTE" && invoice.charges?.overdueDays)).length
    }),
    [invoices]
  );

  return (
    <StudentShell>
      <header className="mb-6">
        <p className="text-sm font-semibold text-gray-700">Financeiro</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Minhas mensalidades</h1>
        <p className="mt-1 text-sm text-muted">Acompanhe pagamentos, vencimentos e valores atualizados.</p>
      </header>

      {error && <Alert type="error" message={error} />}

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <section className="mb-5 grid gap-4 sm:grid-cols-3">
            <SectionCard className="p-4"><p className="text-sm text-muted">Pagas</p><p className="mt-1 text-2xl font-semibold text-ink">{totals.paid}</p></SectionCard>
            <SectionCard className="p-4"><p className="text-sm text-muted">Pendentes</p><p className="mt-1 text-2xl font-semibold text-ink">{totals.pending}</p></SectionCard>
            <SectionCard className="p-4"><p className="text-sm text-muted">Atrasadas</p><p className="mt-1 text-2xl font-semibold text-ink">{totals.overdue}</p></SectionCard>
          </section>

          {invoices.length === 0 ? (
            <EmptyState title="Sem mensalidades" description="Nenhuma mensalidade foi registrada para voce ainda." />
          ) : (
            <SectionCard className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Plano</th>
                      <th className="px-4 py-3">Vencimento</th>
                      <th className="px-4 py-3">Pagamento</th>
                      <th className="px-4 py-3">Original</th>
                      <th className="px-4 py-3">Multa</th>
                      <th className="px-4 py-3">Juros</th>
                      <th className="px-4 py-3">Valor atualizado</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 font-medium text-ink">{invoice.plan?.name ?? "Mensalidade"}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(invoice.dueDate)}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(invoice.paidAt)}</td>
                        <td className="px-4 py-3 text-gray-600">{formatCurrency(invoice.amount)}</td>
                        <td className="px-4 py-3 text-gray-600">{formatCurrency(invoice.charges?.fineAmount ?? 0)}</td>
                        <td className="px-4 py-3 text-gray-600">{formatCurrency(invoice.charges?.interestAmount ?? 0)}</td>
                        <td className="px-4 py-3 font-semibold text-ink">{formatCurrency(invoice.status === "PAGO" ? invoice.totalPaid ?? invoice.amount : invoice.charges?.total ?? invoice.amount)}</td>
                        <td className="px-4 py-3"><StatusBadge status={invoice.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </>
      )}
    </StudentShell>
  );
}
