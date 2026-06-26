"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarClock, CreditCard, Dumbbell, Scale, ShieldCheck } from "lucide-react";
import { BmiIndicator } from "@/components/bmi-indicator";
import { StudentShell } from "@/components/student-shell";
import { Alert, EmptyState, LoadingState, SectionCard, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, invoiceDisplayAmount } from "@/lib/format";
import type { AssessmentSummary, InvoiceSummary, PlanSummary, StudentSummary, WorkoutSummary } from "../types";

type StudentDashboard = {
  student: StudentSummary;
  plan: PlanSummary | null;
  nextInvoice: InvoiceSummary | null;
  nextDueDate: string | null;
  nextInvoiceCharges: InvoiceSummary["charges"] | null;
  financialStatus: "EM_DIA" | "INADIMPLENTE";
  latestInvoices: InvoiceSummary[];
  planAccess: {
    allowFinancial: boolean;
    allowAssessments: boolean;
    allowWorkouts: boolean;
  };
  latestAssessment: AssessmentSummary | null;
  activeWorkout: WorkoutSummary | null;
};

function InfoCard({ icon: Icon, label, value }: { icon: typeof CreditCard; label: string; value: ReactNode }) {
  return (
    <SectionCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <div className="mt-1 text-lg font-semibold text-ink">{value}</div>
        </div>
        <div className="rounded-md bg-gray-900 p-2 text-white">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </SectionCard>
  );
}

export default function StudentDashboardPage() {
  const [data, setData] = useState<StudentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<StudentDashboard>("/student/dashboard")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const workoutSummary = useMemo(() => {
    if (!data?.activeWorkout) return "Nenhuma ficha ativa";
    const count = data.activeWorkout.days.reduce((total, day) => total + day.exercises.length, 0);
    return `${data.activeWorkout.name} - ${count} exercícios`;
  }, [data?.activeWorkout]);

  return (
    <StudentShell>
      <header className="mb-6">
        <p className="text-sm font-semibold text-gray-700">Minha área</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Dashboard do aluno</h1>
        <p className="mt-1 text-sm text-muted">Resumo do seu plano, financeiro, avaliações e treinos.</p>
      </header>

      {error && <Alert type="error" message={error} />}

      {loading ? (
        <LoadingState />
      ) : data ? (
        <>
          <section className="mb-5 overflow-hidden rounded-lg border border-[#14110f] bg-[#14110f] p-5 text-white shadow-sm shadow-stone-900/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {data.student.photoUrl ? (
                  <img src={data.student.photoUrl} alt={data.student.fullName} className="h-16 w-16 rounded-full object-cover ring-2 ring-white/20" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-lg font-bold text-gray-900">
                    {data.student.fullName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-semibold">{data.student.fullName}</h2>
                  <p className="text-sm text-orange-100">{data.student.modality}</p>
                  <p className="mt-2 text-sm text-stone-300">{data.plan ? `${data.plan.name} - ${formatCurrency(data.plan.value)}` : "Sem plano ativo"}</p>
                </div>
              </div>
              <StatusBadge status={data.financialStatus === "EM_DIA" ? "EM DIA" : "INADIMPLENTE"} />
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard icon={CreditCard} label="Plano contratado" value={data.plan?.name ?? "Sem plano ativo"} />
            <InfoCard icon={CalendarClock} label="Próximo vencimento" value={data.nextDueDate ? formatDate(data.nextDueDate) : "Sem mensalidade"} />
            {data.planAccess.allowAssessments && <InfoCard icon={Scale} label="Última avaliação" value={data.latestAssessment ? <BmiIndicator value={data.latestAssessment.bmi} compact /> : "Sem avaliação"} />}
            {data.planAccess.allowWorkouts && <InfoCard icon={Dumbbell} label="Ficha ativa" value={workoutSummary} />}
          </section>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <SectionCard className="p-5">
              <p className="text-sm font-semibold text-ink">Últimas mensalidades</p>
              <div className="mt-4 space-y-3">
                {data.latestInvoices.length === 0 ? (
                  <EmptyState title="Sem mensalidades" description="Nenhuma mensalidade foi registrada para você ainda." />
                ) : (
                  data.latestInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium text-ink">{invoice.plan?.name ?? "Mensalidade"}</p>
                        <p className="text-xs text-muted">Vencimento {new Date(invoice.dueDate).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-ink">{formatCurrency(invoiceDisplayAmount(invoice))}</p>
                        <StatusBadge status={invoice.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>

            {data.planAccess.allowWorkouts && <SectionCard className="p-5">
              <p className="text-sm font-semibold text-ink">Resumo de treino</p>
              {data.activeWorkout ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <ShieldCheck className="h-4 w-4 text-brand" />
                    {data.activeWorkout.goal}
                  </div>
                  {data.activeWorkout.days.map((day) => (
                    <div key={day.label} className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
                      <span className="font-semibold text-ink">Treino {day.label}</span>
                      <span className="ml-2 text-muted">{day.exercises.length} exercício{day.exercises.length === 1 ? "" : "s"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="Sem ficha ativa" description="Quando uma ficha for liberada, ela aparecera aqui." />
              )}
            </SectionCard>}
          </div>
        </>
      ) : null}
    </StudentShell>
  );
}
