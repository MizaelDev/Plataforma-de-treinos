"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { enrollmentModalities } from "@academia/shared";
import { AppShell } from "@/components/app-shell";
import { Alert, Button, EmptyState, LoadingState, SectionCard, StatusBadge, fieldClass, textareaClass } from "@/components/ui";
import { api } from "@/lib/api";
import { formatCpf, formatCurrency, formatDate, formatPhone, normalizeMoneyInput } from "@/lib/format";

type Plan = {
  id: string;
  name: string;
  value: string;
  modality: string;
  durationDays: number;
  dueDay: number;
  isActive: boolean;
};

type PaymentTransaction = {
  id: string;
  provider: "MOCK" | "MERCADO_PAGO" | "ASAAS" | "EFI";
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED" | "FAILED";
  qrCodeBase64?: string | null;
  copyPasteCode?: string | null;
  expiresAt?: string | null;
};

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const today = () => formatDateInput(new Date());

function dueDateFromPlan(plan: Plan) {
  const date = new Date();
  date.setDate(date.getDate() + plan.durationDays);
  return formatDateInput(date);
}

const initialForm = () => ({
  fullName: "",
  cpf: "",
  birthDate: "",
  phone: "",
  address: "",
  email: "",
  photoUrl: "",
  notes: "",
  createAccess: true,
  modalities: [] as string[],
  planId: "",
  enrollmentDate: today(),
  dueDate: today(),
  amount: "",
  status: "PENDENTE" as "PENDENTE" | "PAGO",
  paymentMode: "PENDENTE" as "PENDENTE" | "PAGO_MANUAL" | "PIX_MERCADO_PAGO",
  paidAt: today()
});

export default function EnrollmentsPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createdStudentId, setCreatedStudentId] = useState<string | null>(null);
  const [createdPayment, setCreatedPayment] = useState<PaymentTransaction | null>(null);

  useEffect(() => {
    api<{ plans: Plan[] }>("/plans")
      .then((payload) => setPlans(payload.plans.filter((plan) => plan.isActive)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === form.planId) ?? null, [form.planId, plans]);

  function toggleModality(modality: string) {
    setForm((current) => ({
      ...current,
      modalities: current.modalities.includes(modality)
        ? current.modalities.filter((item) => item !== modality)
        : [...current.modalities, modality]
    }));
  }

  function selectPlan(planId: string) {
    const plan = plans.find((item) => item.id === planId);
    setForm((current) => ({
      ...current,
      planId,
      amount: plan ? String(plan.value).replace(".", ",") : current.amount,
      dueDate: plan ? dueDateFromPlan(plan) : current.dueDate
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setCreatedStudentId(null);
    setCreatedPayment(null);
    setSaving(true);

    try {
      const payload = await api<{ enrollment: { student: { id: string }; access?: { setupEmailSent: boolean } | null; paymentTransaction?: PaymentTransaction; paymentError?: string } }>("/enrollments", {
        method: "POST",
        body: JSON.stringify({
          student: {
            fullName: form.fullName,
            cpf: form.cpf,
            birthDate: form.birthDate,
            phone: form.phone,
            address: form.address,
            email: form.email,
            photoUrl: form.photoUrl,
            notes: form.notes,
            createAccess: form.createAccess
          },
          modalities: form.modalities,
          planId: form.planId,
          enrollmentDate: form.enrollmentDate,
          invoice: {
            dueDate: form.dueDate,
            amount: form.amount,
            status: form.paymentMode === "PAGO_MANUAL" ? "PAGO" : "PENDENTE",
            paymentMode: form.paymentMode,
            paidAt: form.paymentMode === "PAGO_MANUAL" ? form.paidAt : ""
          }
        })
      });

      setForm(initialForm());
      setCreatedStudentId(payload.enrollment.student.id);
      setCreatedPayment(payload.enrollment.paymentTransaction ?? null);
      const accessMessage =
        payload.enrollment.access && !payload.enrollment.access.setupEmailSent
          ? " O acesso do aluno foi criado, mas o e-mail de definição de senha não foi enviado. Confira as configurações de SMTP."
          : "";
      const pixMessage = payload.enrollment.paymentError ? ` O Pix não foi gerado: ${payload.enrollment.paymentError}` : "";
      setSuccess(`Matrícula concluída com sucesso.${accessMessage}${pixMessage} Você pode registrar a avaliação agora ou fazer depois.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  async function copyPixCode() {
    if (!createdPayment?.copyPasteCode) return;
    await navigator.clipboard.writeText(createdPayment.copyPasteCode);
    setSuccess("Código Pix copiado.");
  }

  async function simulateCreatedPayment() {
    if (!createdPayment?.id) return;
    setError("");
    setSuccess("");

    try {
      const payload = await api<{ transaction: PaymentTransaction }>(`/dev/payments/${createdPayment.id}/approve`, { method: "POST" });
      setCreatedPayment(payload.transaction);
      setSuccess("Pagamento mock confirmado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao simular pagamento.");
    }
  }

  function qrCodeImageSrc(payment: PaymentTransaction) {
    if (!payment.qrCodeBase64) return "";
    const mediaType = payment.qrCodeBase64.startsWith("PHN2Z") ? "image/svg+xml" : "image/png";
    return `data:${mediaType};base64,${payment.qrCodeBase64}`;
  }

  return (
    <AppShell>
      <header className="mb-6">
        <p className="text-sm font-semibold text-brand">Cadastro rápido</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Nova Matrícula</h1>
        <p className="mt-1 text-sm text-muted">Cadastre o aluno, vincule um plano e gere a primeira mensalidade em um único fluxo.</p>
      </header>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}
      {createdStudentId && (
        <SectionCard className="mb-5 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Aluno matriculado</p>
              <p className="mt-1 text-sm text-muted">A avaliação física completa pode ser preenchida agora, mas também fica disponível depois no perfil do aluno.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" onClick={() => router.push(`/assessments?studentId=${createdStudentId}`)}>
                Registrar avaliação física agora
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.push(`/students/${createdStudentId}`)}>
                Fazer depois
              </Button>
            </div>
          </div>
        </SectionCard>
      )}
      {createdPayment && (
        <SectionCard className="mb-5 p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            {createdPayment.qrCodeBase64 ? (
              <img src={qrCodeImageSrc(createdPayment)} alt="QR Code Pix" className="h-48 w-48 rounded-lg border border-gray-200 bg-white p-2" />
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">Pix da primeira mensalidade</p>
                  <p className="mt-1 text-sm text-muted">A mensalidade fica pendente até a confirmação do Pix.</p>
                  {createdPayment.provider === "MOCK" && (
                    <p className="mt-1 text-sm font-medium text-amber-700">Modo teste: nenhum valor será cobrado.</p>
                  )}
                </div>
                <StatusBadge status="AGUARDANDO PIX" />
              </div>
              <p className="mt-4 text-sm text-muted">Pix copia e cola</p>
              <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 break-all">
                {createdPayment.copyPasteCode ?? "-"}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={copyPixCode}>Copiar Pix</Button>
                {process.env.NODE_ENV !== "production" && createdPayment.provider === "MOCK" && createdPayment.status === "PENDING" && (
                  <Button type="button" variant="secondary" onClick={simulateCreatedPayment}>Simular pagamento</Button>
                )}
                <Button type="button" variant="secondary" onClick={() => setCreatedPayment(null)}>Fechar</Button>
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {loading ? (
        <LoadingState />
      ) : plans.length === 0 ? (
        <EmptyState title="Nenhum plano ativo" description="Cadastre ou ative um plano antes de criar uma matrícula completa." />
      ) : (
        <form onSubmit={submit} className="grid gap-5">
          <SectionCard className="p-5">
            <div className="mb-4">
              <p className="text-sm font-semibold text-brand">1. Dados do aluno</p>
              <h2 className="text-lg font-semibold text-ink">Informações pessoais</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="text-sm font-medium text-gray-700">
                Nome completo
                <input className={fieldClass} value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
              </label>
              <label className="text-sm font-medium text-gray-700">
                CPF
                <input className={fieldClass} value={form.cpf} onChange={(event) => setForm((current) => ({ ...current, cpf: formatCpf(event.target.value) }))} />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Nascimento
                <input className={fieldClass} type="date" value={form.birthDate} onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))} />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Telefone
                <input className={fieldClass} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: formatPhone(event.target.value) }))} />
              </label>
              <label className="text-sm font-medium text-gray-700">
                E-mail
                <input className={fieldClass} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Foto URL
                <input className={fieldClass} value={form.photoUrl} onChange={(event) => setForm((current) => ({ ...current, photoUrl: event.target.value }))} />
              </label>
              <label className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700">
                <input type="checkbox" checked={form.createAccess} onChange={(event) => setForm((current) => ({ ...current, createAccess: event.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-brand" />
                Enviar link para o aluno definir a senha
              </label>
              <label className="text-sm font-medium text-gray-700 md:col-span-2 xl:col-span-3">
                Endereço
                <input className={fieldClass} value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
              </label>
              <label className="text-sm font-medium text-gray-700 md:col-span-2 xl:col-span-3">
                Observações
                <textarea className={textareaClass} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
              </label>
            </div>
          </SectionCard>

          <SectionCard className="p-5">
            <div className="mb-4">
              <p className="text-sm font-semibold text-brand">2. Modalidade e plano</p>
              <h2 className="text-lg font-semibold text-ink">Contrato inicial</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div>
                <p className="text-sm font-medium text-gray-700">Modalidades</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {enrollmentModalities.map((modality) => (
                    <label key={modality} className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700">
                      <input type="checkbox" checked={form.modalities.includes(modality)} onChange={() => toggleModality(modality)} className="h-4 w-4 rounded border-gray-300 text-brand" />
                      {modality}
                    </label>
                  ))}
                </div>
              </div>
              <label className="text-sm font-medium text-gray-700">
                Plano
                <select className={fieldClass} value={form.planId} onChange={(event) => selectPlan(event.target.value)}>
                  <option value="">Selecione</option>
                  {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                </select>
                {selectedPlan && (
                  <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
                    <p className="font-semibold text-ink">{selectedPlan.name}</p>
                    <p className="mt-1 text-muted">{selectedPlan.modality} - {selectedPlan.durationDays} dias - vencimento dia {selectedPlan.dueDay}</p>
                    <p className="mt-2 font-semibold text-ink">{formatCurrency(selectedPlan.value)}</p>
                  </div>
                )}
              </label>
            </div>
          </SectionCard>

          <SectionCard className="p-5">
            <div className="mb-4">
              <p className="text-sm font-semibold text-brand">3. Mensalidade inicial</p>
              <h2 className="text-lg font-semibold text-ink">Primeira cobrança</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <label className="text-sm font-medium text-gray-700">
                Data da matrícula
                <input className={fieldClass} type="date" value={form.enrollmentDate} onChange={(event) => setForm((current) => ({ ...current, enrollmentDate: event.target.value }))} />
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
                Pagamento inicial
                <select
                  className={fieldClass}
                  value={form.paymentMode}
                  onChange={(event) => {
                    const paymentMode = event.target.value as "PENDENTE" | "PAGO_MANUAL" | "PIX_MERCADO_PAGO";
                    setForm((current) => ({
                      ...current,
                      paymentMode,
                      status: paymentMode === "PAGO_MANUAL" ? "PAGO" : "PENDENTE"
                    }));
                  }}
                >
                  <option value="PENDENTE">Criar mensalidade pendente</option>
                  <option value="PAGO_MANUAL">Marcar como paga manualmente</option>
                  <option value="PIX_MERCADO_PAGO">Gerar Pix</option>
                </select>
              </label>
              {form.paymentMode === "PAGO_MANUAL" && (
                <label className="text-sm font-medium text-gray-700">
                  Data de pagamento
                  <input className={fieldClass} type="date" value={form.paidAt} onChange={(event) => setForm((current) => ({ ...current, paidAt: event.target.value }))} />
                </label>
              )}
            </div>
          </SectionCard>

          <SectionCard className="p-5">
            <div className="mb-4">
              <p className="text-sm font-semibold text-brand">4. Revisão</p>
              <h2 className="text-lg font-semibold text-ink">Confirmar matrícula</h2>
            </div>
            <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-md bg-gray-50 p-3"><p className="text-muted">Aluno</p><p className="font-semibold text-ink">{form.fullName || "-"}</p></div>
              <div className="rounded-md bg-gray-50 p-3"><p className="text-muted">Modalidade</p><p className="font-semibold text-ink">{form.modalities.join(", ") || "-"}</p></div>
              <div className="rounded-md bg-gray-50 p-3"><p className="text-muted">Plano</p><p className="font-semibold text-ink">{selectedPlan?.name ?? "-"}</p></div>
              <div className="rounded-md bg-gray-50 p-3"><p className="text-muted">Valor</p><p className="font-semibold text-ink">{form.amount ? formatCurrency(form.amount.replace(",", ".")) : "-"}</p></div>
              <div className="rounded-md bg-gray-50 p-3"><p className="text-muted">Vencimento</p><p className="font-semibold text-ink">{formatDate(form.dueDate)}</p></div>
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-muted">Pagamento inicial</p>
                <p className="font-semibold text-ink">{form.paymentMode === "PIX_MERCADO_PAGO" ? "Pix" : form.paymentMode === "PAGO_MANUAL" ? "Pago manualmente" : "Pendente"}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Concluindo..." : "Concluir matrícula"}</Button>
              <Button type="button" variant="secondary" onClick={() => setForm(initialForm())}>Limpar formulário</Button>
            </div>
          </SectionCard>
        </form>
      )}
    </AppShell>
  );
}
