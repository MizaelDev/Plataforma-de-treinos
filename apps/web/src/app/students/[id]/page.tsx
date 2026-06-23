"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Activity, CreditCard, Dumbbell, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BmiIndicator } from "@/components/bmi-indicator";
import { Alert, EmptyState, LoadingState, SectionCard, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { formatCpf, formatCurrency, formatDate, formatDecimal, formatPhone } from "@/lib/format";

type Invoice = {
  id: string;
  dueDate: string;
  paidAt?: string | null;
  amount: string;
  status: string;
  totalPaid?: string;
  plan?: { id: string; name: string } | null;
  charges?: { fineAmount: string; interestAmount: string; total: string; overdueDays: number };
};

type Assessment = {
  id: string;
  assessedAt: string;
  weightKg: string;
  heightCm: string;
  bmi: string;
  bodyFatPercentage?: string | null;
  muscleMassKg?: string | null;
  professor?: { id: string; name: string } | null;
};

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
  studentPlans: Array<{ id: string; isActive: boolean; startDate: string; endDate?: string | null; plan: { id: string; name: string; value: string; modality: string } }>;
  invoices: Invoice[];
  assessments: Assessment[];
  workoutPlans: WorkoutPlan[];
};

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

  useEffect(() => {
    if (!params.id) return;
    api<{ student: StudentDetail }>(`/students/${params.id}`)
      .then((payload) => setStudent(payload.student))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  const activePlan = useMemo(() => student?.studentPlans.find((item) => item.isActive)?.plan ?? student?.studentPlans[0]?.plan ?? null, [student]);
  const overdueInvoices = useMemo(
    () => student?.invoices.filter((invoice) => invoice.status !== "PAGO" && invoice.status !== "CANCELADO" && (invoice.charges?.overdueDays ?? 0) > 0) ?? [],
    [student]
  );

  return (
    <AppShell>
      {error && <Alert type="error" message={error} />}

      {loading ? (
        <LoadingState />
      ) : !student ? (
        <EmptyState title="Aluno nao encontrado" description="O aluno solicitado nao existe ou nao esta disponivel." />
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
                <p className="mt-1 text-sm text-muted">{student.modality} - matricula {formatDate(student.enrollmentDate)}</p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <QuickAction href="/invoices" label="Criar mensalidade" icon={CreditCard} />
              <QuickAction href="/assessments" label="Registrar avaliacao" icon={Activity} />
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
                <div className="sm:col-span-2"><p className="text-muted">Endereco</p><p className="font-medium text-ink">{student.address}</p></div>
              </div>
              {student.notes && <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm text-gray-700">{student.notes}</div>}
            </SectionCard>

            <SectionCard className="p-5">
              <p className="text-sm font-semibold text-ink">Resumo financeiro e plano</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-md bg-gray-50 p-3"><p className="text-xs text-muted">Plano atual</p><p className="font-semibold text-ink">{activePlan?.name ?? "Sem plano"}</p></div>
                <div className="rounded-md bg-gray-50 p-3"><p className="text-xs text-muted">Valor do plano</p><p className="font-semibold text-ink">{activePlan ? formatCurrency(activePlan.value) : "-"}</p></div>
                <div className="rounded-md bg-gray-50 p-3"><p className="text-xs text-muted">Situacao</p><p className="font-semibold text-ink">{overdueInvoices.length > 0 ? "Inadimplente" : "Em dia"}</p></div>
              </div>
            </SectionCard>
          </section>

          <section className="mt-5 grid gap-4 xl:grid-cols-2">
            <SectionCard className="overflow-hidden">
              <div className="border-b border-gray-200 px-4 py-3"><p className="text-sm font-semibold text-ink">Historico de mensalidades</p></div>
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
                          <td className="px-4 py-3 font-semibold">{formatCurrency(invoice.charges?.total ?? invoice.amount)}</td>
                          <td className="px-4 py-3"><StatusBadge status={invoice.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            <SectionCard className="overflow-hidden">
              <div className="border-b border-gray-200 px-4 py-3"><p className="text-sm font-semibold text-ink">Avaliacoes fisicas</p></div>
              {student.assessments.length === 0 ? <div className="p-4"><EmptyState title="Sem avaliacoes" description="Nenhuma avaliacao registrada para este aluno." /></div> : (
                <div className="divide-y divide-gray-100">
                  {student.assessments.slice(0, 5).map((assessment) => (
                    <div key={assessment.id} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-4">
                      <div><p className="text-muted">Data</p><p className="font-medium">{formatDate(assessment.assessedAt)}</p></div>
                      <div><p className="text-muted">Peso</p><p className="font-medium">{formatDecimal(assessment.weightKg, " kg")}</p></div>
                      <div><p className="text-muted">IMC</p><BmiIndicator value={assessment.bmi} compact /></div>
                      <div><p className="text-muted">% gordura</p><p className="font-medium">{formatDecimal(assessment.bodyFatPercentage, "%")}</p></div>
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
