"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Activity, CreditCard, Dumbbell, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BmiIndicator } from "@/components/bmi-indicator";
import { Alert, Button, EmptyState, LoadingState, SectionCard, StatusBadge, fieldClass } from "@/components/ui";
import { api } from "@/lib/api";
import { formatCpf, formatCurrency, formatDate, formatDecimal, formatPhone, invoiceDisplayAmount } from "@/lib/format";

type Invoice = {
  id: string;
  dueDate: string;
  paidAt?: string | null;
  amount: string;
  status: string;
  totalPaid?: string;
  plan?: { id: string; name: string; value: string; modality: string } | null;
  charges?: { fineAmount: string; interestAmount: string; total: string; overdueDays: number };
};

type PlanOption = {
  id: string;
  name: string;
  value: string;
  modality: string;
  durationDays: number;
  dueDay: number;
  isActive: boolean;
};

type Assessment = {
  id: string;
  assessedAt: string;
  weightKg: string;
  heightCm: string;
  bmi: string;
  bodyFatPercentage?: string | null;
  muscleMassKg?: string | null;
  abdominalCircumferenceCm?: string | null;
  leftArmCircumferenceCm?: string | null;
  rightArmCircumferenceCm?: string | null;
  leftLegCircumferenceCm?: string | null;
  rightLegCircumferenceCm?: string | null;
  chestCircumferenceCm?: string | null;
  shoulderCircumferenceCm?: string | null;
  gluteCircumferenceCm?: string | null;
  leftCalfCircumferenceCm?: string | null;
  rightCalfCircumferenceCm?: string | null;
  waistCircumferenceCm?: string | null;
  hipCircumferenceCm?: string | null;
  professor?: { id: string; name: string } | null;
};

const detailAssessmentMeasurements: Array<{ key: keyof Assessment; label: string; suffix?: string }> = [
  { key: "weightKg", label: "Peso", suffix: " kg" },
  { key: "bodyFatPercentage", label: "% gordura", suffix: "%" },
  { key: "muscleMassKg", label: "Massa muscular", suffix: " kg" },
  { key: "chestCircumferenceCm", label: "Peitoral", suffix: " cm" },
  { key: "shoulderCircumferenceCm", label: "Ombros", suffix: " cm" },
  { key: "gluteCircumferenceCm", label: "Glúteos", suffix: " cm" },
  { key: "leftArmCircumferenceCm", label: "Braço esq.", suffix: " cm" },
  { key: "rightArmCircumferenceCm", label: "Braço dir.", suffix: " cm" },
  { key: "leftLegCircumferenceCm", label: "Perna esq.", suffix: " cm" },
  { key: "rightLegCircumferenceCm", label: "Perna dir.", suffix: " cm" }
];

type WorkoutPlan = {
  id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  days: Array<{ label: string; exercises: Array<{ id: string; name: string }> }>;
};

type StudentDetail = {
  id: string;
  fullName: string;
  cpf: string;
  birthDate: string;
  phone: string;
  address: string;
  email: string;
  photoUrl?: string | null;
  enrollmentDate: string;
  modality: string;
  notes?: string | null;
  status: string;
  user?: { id: string; email: string; isActive: boolean; updatedAt?: string } | null;
  studentPlans: Array<{ id: string; isActive: boolean; startDate: string; endDate?: string | null; plan: { id: string; name: string; value: string; modality: string } }>;
  invoices: Invoice[];
  assessments: Assessment[];
  workoutPlans: WorkoutPlan[];
};

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function today() {
  return formatDateInput(new Date());
}

function dueDateFromPlan(plan: Pick<PlanOption, "durationDays">, startDate = new Date()) {
  const date = new Date(startDate);
  date.setDate(date.getDate() + plan.durationDays);
  return formatDateInput(date);
}

const initialPlanChangeForm = () => ({
  planId: "",
  startDate: today(),
  createInitialInvoice: true,
  dueDate: "",
  amount: ""
});

function QuickAction({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Plus }) {
  return (
    <Link href={href} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 hover:bg-gray-50">
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingAccess, setSavingAccess] = useState(false);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [planForm, setPlanForm] = useState(initialPlanChangeForm);
  const [savingPlan, setSavingPlan] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    Promise.all([
      api<{ student: StudentDetail }>(`/students/${params.id}`),
      api<{ plans: PlanOption[] }>("/plans")
    ])
      .then(([studentPayload, plansPayload]) => {
        setStudent(studentPayload.student);
        setPlans(plansPayload.plans.filter((plan) => plan.isActive));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function resetAccess() {
    if (!student) return;
    setError("");
    setSuccess("");
    setSavingAccess(true);
    try {
      const payload = await api<{ access: { userId: string; email: string; created: boolean; isActive: boolean; setupEmailSent: boolean } }>(`/students/${student.id}/access`, { method: "POST" });
      setStudent((current) => current ? { ...current, user: { id: payload.access.userId, email: payload.access.email, isActive: payload.access.isActive } } : current);
      setSuccess(
        payload.access.created
          ? `Acesso criado. Enviamos um link para ${payload.access.email} definir a senha.`
          : `Link de redefinição enviado para ${payload.access.email}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSavingAccess(false);
    }
  }

  function selectPlan(planId: string) {
    const plan = plans.find((item) => item.id === planId);
    const startDate = new Date(`${planForm.startDate}T00:00:00`);

    setPlanForm((current) => ({
      ...current,
      planId,
      amount: plan ? String(plan.value).replace(".", ",") : "",
      dueDate: plan ? dueDateFromPlan(plan, startDate) : current.dueDate
    }));
  }

  function changePlanStartDate(startDate: string) {
    const plan = plans.find((item) => item.id === planForm.planId);
    const parsedStartDate = new Date(`${startDate}T00:00:00`);

    setPlanForm((current) => ({
      ...current,
      startDate,
      dueDate: plan ? dueDateFromPlan(plan, parsedStartDate) : current.dueDate
    }));
  }

  async function changeStudentPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!student) return;

    setError("");
    setSuccess("");
    setSavingPlan(true);

    try {
      await api(`/students/${student.id}/plan`, {
        method: "POST",
        body: JSON.stringify({
          planId: planForm.planId,
          startDate: planForm.startDate,
          createInitialInvoice: planForm.createInitialInvoice,
          dueDate: planForm.dueDate,
          amount: planForm.amount
        })
      });

      const payload = await api<{ student: StudentDetail }>(`/students/${student.id}`);
      setStudent(payload.student);
      setPlanForm(initialPlanChangeForm());
      setSuccess("Plano atual do aluno atualizado. O histórico antigo foi preservado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSavingPlan(false);
    }
  }

  const activePlan = useMemo(() => {
    if (!student) return null;

    const linkedPlan = student.studentPlans.find((item) => item.isActive)?.plan ?? student.studentPlans[0]?.plan ?? null;
    const invoicePlan =
      student.invoices.find((invoice) => invoice.status !== "CANCELADO" && invoice.plan)?.plan ??
      student.invoices.find((invoice) => invoice.plan)?.plan ??
      null;

    return linkedPlan ?? invoicePlan;
  }, [student]);
  const overdueInvoices = useMemo(
    () => student?.invoices.filter((invoice) => invoice.status !== "PAGO" && invoice.status !== "CANCELADO" && (invoice.charges?.overdueDays ?? 0) > 0) ?? [],
    [student]
  );
  const latestAssessment = student?.assessments[0] ?? null;
  const previousAssessment = student?.assessments[1] ?? null;

  return (
    <AppShell>
      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      {loading ? (
        <LoadingState />
      ) : !student ? (
        <EmptyState title="Aluno não encontrado" description="O aluno solicitado não existe ou não esta disponível." />
      ) : (
        <>
          <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-4">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={student.fullName} className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-900 text-lg font-bold text-white">
                  {student.fullName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-brand">Perfil do aluno</p>
                <h1 className="mt-1 text-2xl font-semibold text-ink">{student.fullName}</h1>
                <p className="mt-1 text-sm text-muted">{student.modality} - matrícula {formatDate(student.enrollmentDate)}</p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <QuickAction href="/invoices" label="Criar mensalidade" icon={CreditCard} />
              <QuickAction href={`/assessments?studentId=${student.id}`} label="Registrar avaliação" icon={Activity} />
              <QuickAction href="/workouts" label="Criar treino" icon={Dumbbell} />
            </div>
          </header>

          <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <SectionCard className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">Dados pessoais</p>
                <StatusBadge status={student.status} />
              </div>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div><p className="text-muted">CPF</p><p className="font-medium text-ink">{formatCpf(student.cpf)}</p></div>
                <div><p className="text-muted">Nascimento</p><p className="font-medium text-ink">{formatDate(student.birthDate)}</p></div>
                <div><p className="text-muted">Telefone</p><p className="font-medium text-ink">{formatPhone(student.phone)}</p></div>
                <div><p className="text-muted">E-mail</p><p className="font-medium text-ink">{student.email}</p></div>
                <div className="sm:col-span-2"><p className="text-muted">Endereço</p><p className="font-medium text-ink">{student.address}</p></div>
              </div>
              {student.notes && <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm text-gray-700">{student.notes}</div>}
            </SectionCard>

            <SectionCard className="p-5">
              <p className="text-sm font-semibold text-ink">Resumo financeiro e plano</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-md bg-gray-50 p-3"><p className="text-xs text-muted">Plano atual</p><p className="font-semibold text-ink">{activePlan?.name ?? "Sem plano"}</p></div>
                <div className="rounded-md bg-gray-50 p-3"><p className="text-xs text-muted">Valor do plano</p><p className="font-semibold text-ink">{activePlan ? formatCurrency(activePlan.value) : "-"}</p></div>
                <div className="rounded-md bg-gray-50 p-3"><p className="text-xs text-muted">Situação</p><p className="font-semibold text-ink">{overdueInvoices.length > 0 ? "Inadimplente" : "Em dia"}</p></div>
              </div>
              <form onSubmit={changeStudentPlan} className="mt-5 rounded-md border border-[#3a2a20] bg-[#15100d] p-4">
                <div>
                  <p className="text-sm font-semibold text-white">Trocar plano atual</p>
                  <p className="mt-1 text-xs text-stone-300">O plano anterior será encerrado, o novo ficará ativo e as mensalidades antigas não serão alteradas.</p>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <label className="text-sm font-medium text-stone-200">
                    Novo plano
                    <select className={fieldClass} value={planForm.planId} onChange={(event) => selectPlan(event.target.value)} required>
                      <option value="">Selecione</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>{plan.name} - {plan.modality}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-stone-200">
                    Início do novo plano
                    <input className={fieldClass} type="date" value={planForm.startDate} onChange={(event) => changePlanStartDate(event.target.value)} />
                  </label>
                  <label className="text-sm font-medium text-stone-200">
                    Valor da mensalidade
                    <input className={fieldClass} value={planForm.amount} onChange={(event) => setPlanForm((current) => ({ ...current, amount: event.target.value }))} placeholder="Usa valor do plano" />
                  </label>
                  <label className="text-sm font-medium text-stone-200">
                    Vencimento da mensalidade
                    <input className={fieldClass} type="date" value={planForm.dueDate} onChange={(event) => setPlanForm((current) => ({ ...current, dueDate: event.target.value }))} />
                  </label>
                </div>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium text-stone-200">
                    <input
                      type="checkbox"
                      checked={planForm.createInitialInvoice}
                      onChange={(event) => setPlanForm((current) => ({ ...current, createInitialInvoice: event.target.checked }))}
                      className="h-4 w-4 rounded border-stone-600 text-brand"
                    />
                    Criar próxima mensalidade do novo plano
                  </label>
                  <Button type="submit" disabled={savingPlan || !planForm.planId}>
                    {savingPlan ? "Atualizando..." : "Atualizar plano do aluno"}
                  </Button>
                </div>
              </form>
            </SectionCard>
          </section>

          <SectionCard className="mt-5 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">Acesso do aluno</p>
                <p className="mt-1 text-sm text-muted">
                  {student.user ? `Usuário vinculado: ${student.user.email}` : "Este aluno ainda não possui usuário de acesso."}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <StatusBadge status={student.user?.isActive ? "ATIVO" : "INATIVO"} />
                <Button type="button" variant="secondary" onClick={resetAccess} disabled={savingAccess}>
                  {savingAccess ? "Gerando..." : student.user ? "Redefinir senha" : "Criar acesso"}
                </Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard className="mt-5 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">Evolução física</p>
                <p className="mt-1 text-sm text-muted">Resumo da última avaliação e variação em relação a anterior.</p>
              </div>
              <QuickAction href={`/assessments?studentId=${student.id}`} label="Nova avaliação" icon={Activity} />
            </div>
            {!latestAssessment ? (
              <div className="mt-4">
                <EmptyState title="Sem avaliação física" description="Registre a primeira avaliação para acompanhar peso, IMC, gordura e massa muscular." />
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="text-xs text-muted">Peso atual</p>
                  <p className="font-semibold text-ink">{formatDecimal(latestAssessment.weightKg, " kg")}</p>
                  {previousAssessment && <p className="mt-1 text-xs text-muted">Var.: {(Number(latestAssessment.weightKg) - Number(previousAssessment.weightKg)).toFixed(2).replace(".", ",")} kg</p>}
                </div>
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="text-xs text-muted">IMC</p>
                  <div className="mt-1"><BmiIndicator value={latestAssessment.bmi} compact /></div>
                  {previousAssessment && <p className="mt-1 text-xs text-muted">Var.: {(Number(latestAssessment.bmi) - Number(previousAssessment.bmi)).toFixed(2).replace(".", ",")}</p>}
                </div>
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="text-xs text-muted">Gordura corporal</p>
                  <p className="font-semibold text-ink">{formatDecimal(latestAssessment.bodyFatPercentage, "%")}</p>
                </div>
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="text-xs text-muted">Massa muscular</p>
                  <p className="font-semibold text-ink">{formatDecimal(latestAssessment.muscleMassKg, " kg")}</p>
                </div>
              </div>
            )}
          </SectionCard>

          <section className="mt-5 grid gap-4 xl:grid-cols-2">
            <SectionCard className="overflow-hidden">
              <div className="border-b border-gray-200 px-4 py-3"><p className="text-sm font-semibold text-ink">Histórico de mensalidades</p></div>
              {student.invoices.length === 0 ? <div className="p-4"><EmptyState title="Sem mensalidades" description="Nenhuma mensalidade registrada para este aluno." /></div> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Plano</th><th className="px-4 py-3">Vencimento</th><th className="px-4 py-3">Original</th><th className="px-4 py-3">Atualizado</th><th className="px-4 py-3">Status</th></tr></thead>
                    <tbody>
                      {student.invoices.map((invoice) => (
                        <tr key={invoice.id} className="border-t border-gray-100">
                          <td className="px-4 py-3">{invoice.plan?.name ?? "Mensalidade"}</td>
                          <td className="px-4 py-3">{formatDate(invoice.dueDate)}</td>
                          <td className="px-4 py-3">{formatCurrency(invoice.amount)}</td>
                          <td className="px-4 py-3 font-semibold">{formatCurrency(invoiceDisplayAmount(invoice))}</td>
                          <td className="px-4 py-3"><StatusBadge status={invoice.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            <SectionCard className="overflow-hidden">
              <div className="border-b border-gray-200 px-4 py-3"><p className="text-sm font-semibold text-ink">Avaliações físicas</p></div>
              {student.assessments.length === 0 ? <div className="p-4"><EmptyState title="Sem avaliações" description="Nenhuma avaliação registrada para este aluno." /></div> : (
                <div className="divide-y divide-gray-100">
                  {student.assessments.slice(0, 5).map((assessment) => (
                    <div key={assessment.id} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-4">
                      <div><p className="text-muted">Data</p><p className="font-medium">{formatDate(assessment.assessedAt)}</p></div>
                      <div><p className="text-muted">IMC</p><BmiIndicator value={assessment.bmi} compact /></div>
                      {detailAssessmentMeasurements.map((measurement) => (
                        <div key={measurement.key}>
                          <p className="text-muted">{measurement.label}</p>
                          <p className="font-medium">{formatDecimal(assessment[measurement.key] as string | null | undefined, measurement.suffix)}</p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard className="overflow-hidden xl:col-span-2">
              <div className="border-b border-gray-200 px-4 py-3"><p className="text-sm font-semibold text-ink">Fichas de treino</p></div>
              {student.workoutPlans.length === 0 ? <div className="p-4"><EmptyState title="Sem treinos" description="Nenhuma ficha de treino registrada para este aluno." /></div> : (
                <div className="grid gap-3 p-4 md:grid-cols-2">
                  {student.workoutPlans.map((workout) => (
                    <div key={workout.id} className="rounded-md border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink">{workout.name}</p>
                          <p className="text-sm text-muted">{workout.goal}</p>
                        </div>
                        <StatusBadge status={workout.isActive ? "ATIVO" : "INATIVO"} />
                      </div>
                      <p className="mt-3 text-sm text-muted">{workout.days.length} treinos cadastrados</p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </section>
        </>
      )}
    </AppShell>
  );
}
