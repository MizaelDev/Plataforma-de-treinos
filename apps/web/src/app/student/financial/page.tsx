"use client";

import { useEffect, useMemo, useState } from "react";
import { StudentShell } from "@/components/student-shell";
import { Alert, Button, EmptyState, LoadingState, MobileRecordCard, SectionCard, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, invoiceDisplayAmount } from "@/lib/format";
import type { InvoiceSummary, PaymentTransactionSummary } from "../types";

export default function StudentFinancialPage() {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingPaymentId, setCreatingPaymentId] = useState<string | null>(null);
  const [activePayment, setActivePayment] = useState<PaymentTransactionSummary | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadInvoices() {
    const payload = await api<{ invoices: InvoiceSummary[] }>("/student/financial");
    setInvoices(payload.invoices);
  }

  useEffect(() => {
    loadInvoices()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activePayment || activePayment.status !== "PENDING") return;

    const interval = window.setInterval(async () => {
      try {
        const payload = await api<{ transaction: PaymentTransactionSummary }>(`/payments/${activePayment.id}/status`);
        setActivePayment(payload.transaction);

        if (payload.transaction.status === "PAID") {
          setSuccess("Pagamento Pix confirmado.");
          await loadInvoices();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao consultar pagamento.");
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [activePayment]);

  const totals = useMemo(
    () => ({
      paid: invoices.filter((invoice) => invoice.status === "PAGO").length,
      pending: invoices.filter((invoice) => invoice.status === "PENDENTE").length,
      overdue: invoices.filter((invoice) => invoice.status === "ATRASADO" || (invoice.status === "PENDENTE" && invoice.charges?.overdueDays)).length
    }),
    [invoices]
  );

  async function createPixPayment(invoice: InvoiceSummary) {
    setError("");
    setSuccess("");
    setCreatingPaymentId(invoice.id);

    try {
      const payload = await api<{ transaction: PaymentTransactionSummary }>("/payments/pix", {
        method: "POST",
        body: JSON.stringify({ invoiceId: invoice.id })
      });
      setActivePayment(payload.transaction);
      await loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar Pix.");
    } finally {
      setCreatingPaymentId(null);
    }
  }

  async function copyPixCode() {
    if (!activePayment?.copyPasteCode) return;
    await navigator.clipboard.writeText(activePayment.copyPasteCode);
    setSuccess("Código Pix copiado.");
  }

  async function copyTransactionId() {
    if (!activePayment?.id) return;
    await navigator.clipboard.writeText(activePayment.id);
    setSuccess("ID da transação copiado.");
  }

  async function simulatePayment() {
    if (!activePayment?.id) return;
    setError("");
    setSuccess("");

    try {
      const payload = await api<{ transaction: PaymentTransactionSummary }>(`/payments/${activePayment.id}/mock-confirm`, { method: "POST" });
      setActivePayment(payload.transaction);
      await loadInvoices();
      setSuccess("Pagamento mock confirmado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao simular pagamento.");
    }
  }

  const paymentStatusLabel: Record<PaymentTransactionSummary["status"], string> = {
    PENDING: "Aguardando pagamento",
    PAID: "Pago",
    EXPIRED: "Expirado",
    CANCELLED: "Cancelado",
    FAILED: "Falhou"
  };

  function qrCodeImageSrc(payment: PaymentTransactionSummary) {
    if (!payment.qrCodeBase64) return "";
    const mediaType = payment.qrCodeBase64.startsWith("PHN2Z") ? "image/svg+xml" : "image/png";
    return `data:${mediaType};base64,${payment.qrCodeBase64}`;
  }

  return (
    <StudentShell>
      <header className="mb-6">
        <p className="text-sm font-semibold text-gray-700">Financeiro</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Minhas mensalidades</h1>
        <p className="mt-1 text-sm text-muted">Acompanhe pagamentos, vencimentos e valores atualizados.</p>
      </header>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

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
            <EmptyState title="Sem mensalidades" description="Nenhuma mensalidade foi registrada para você ainda." />
          ) : (
            <>
              {activePayment && (
                <SectionCard className="mb-5 p-5">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                    {activePayment.qrCodeBase64 ? (
                      <img
                        src={qrCodeImageSrc(activePayment)}
                        alt="QR Code Pix"
                        className="h-48 w-48 rounded-lg border border-gray-200 bg-white p-2"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-ink">Pagamento Pix</p>
                          <p className="mt-1 text-sm text-muted">Provedor: {activePayment.provider}</p>
                        </div>
                        <StatusBadge status={paymentStatusLabel[activePayment.status]} />
                      </div>
                      <p className="mt-4 text-sm text-muted">Pix copia e cola</p>
                      <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 break-all">
                        {activePayment.copyPasteCode ?? "-"}
                      </div>
                      {process.env.NODE_ENV !== "production" && (
                        <>
                          <p className="mt-4 text-sm text-muted">ID da transação para teste</p>
                          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 break-all">
                            {activePayment.id}
                          </div>
                        </>
                      )}
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <Button type="button" onClick={copyPixCode}>Copiar código</Button>
                        {process.env.NODE_ENV !== "production" && <Button type="button" variant="secondary" onClick={copyTransactionId}>Copiar ID</Button>}
                        {process.env.NODE_ENV !== "production" && activePayment.status === "PENDING" && <Button type="button" variant="secondary" onClick={simulatePayment}>Simular pagamento</Button>}
                        <Button type="button" variant="secondary" onClick={() => setActivePayment(null)}>Fechar</Button>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              )}

              <SectionCard className="overflow-hidden">
              <div className="grid gap-3 p-4 md:hidden">
                {invoices.map((invoice) => {
                  const latestPayment = invoice.paymentTransactions?.[0];
                  return (
                    <MobileRecordCard key={invoice.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink">{invoice.plan?.name ?? "Mensalidade"}</p>
                          <p className="mt-1 text-sm text-muted">Vencimento {formatDate(invoice.dueDate)}</p>
                        </div>
                        <StatusBadge status={invoice.status} />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-xs text-muted">Original</p><p className="font-medium text-ink">{formatCurrency(invoice.amount)}</p></div>
                        <div><p className="text-xs text-muted">Atualizado</p><p className="font-semibold text-ink">{formatCurrency(invoiceDisplayAmount(invoice))}</p></div>
                        <div><p className="text-xs text-muted">Pagamento</p><p className="font-medium text-ink">{formatDate(invoice.paidAt)}</p></div>
                        <div><p className="text-xs text-muted">Pix</p><p className="font-medium text-ink">{latestPayment ? paymentStatusLabel[latestPayment.status] : "-"}</p></div>
                      </div>
                      {(invoice.status === "PENDENTE" || invoice.status === "ATRASADO") && (
                        <Button type="button" className="mt-4 w-full" disabled={creatingPaymentId === invoice.id} onClick={() => createPixPayment(invoice)}>
                          {creatingPaymentId === invoice.id ? "Gerando..." : "Pagar com Pix"}
                        </Button>
                      )}
                    </MobileRecordCard>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
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
                      <th className="px-4 py-3">Pix</th>
                      <th className="px-4 py-3">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => {
                      const latestPayment = invoice.paymentTransactions?.[0];
                      return (
                        <tr key={invoice.id} className="border-t border-gray-100">
                          <td className="px-4 py-3 font-medium text-ink">{invoice.plan?.name ?? "Mensalidade"}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(invoice.dueDate)}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(invoice.paidAt)}</td>
                          <td className="px-4 py-3 text-gray-600">{formatCurrency(invoice.amount)}</td>
                          <td className="px-4 py-3 text-gray-600">{formatCurrency(invoice.charges?.fineAmount ?? 0)}</td>
                          <td className="px-4 py-3 text-gray-600">{formatCurrency(invoice.charges?.interestAmount ?? 0)}</td>
                          <td className="px-4 py-3 font-semibold text-ink">{formatCurrency(invoiceDisplayAmount(invoice))}</td>
                          <td className="px-4 py-3"><StatusBadge status={invoice.status} /></td>
                          <td className="px-4 py-3">{latestPayment ? <StatusBadge status={paymentStatusLabel[latestPayment.status]} /> : "-"}</td>
                          <td className="px-4 py-3">
                            {(invoice.status === "PENDENTE" || invoice.status === "ATRASADO") && (
                              <Button type="button" variant="secondary" className="h-8 px-3" disabled={creatingPaymentId === invoice.id} onClick={() => createPixPayment(invoice)}>
                                {creatingPaymentId === invoice.id ? "Gerando..." : "Pagar com Pix"}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>
            </>
          )}
        </>
      )}
    </StudentShell>
  );
}
