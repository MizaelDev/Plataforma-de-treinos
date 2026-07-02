"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, CalendarClock, CircleDollarSign, ClipboardList, CreditCard, Plus, UserPlus, Users, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { api, getStoredUser, getToken } from "@/lib/api";
import { Alert, Button, EmptyState, LoadingState, SectionCard, StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate, formatPhone } from "@/lib/format";

type Invoice = {
  id: string;
  dueDate: string;
  amount: string;
  status: string;
  paidAt?: string | null;
  totalPaid?: string | number;
  student: { id: string; fullName: string };
  plan?: { id: string; name: string } | null;
  charges?: { total: string; fineAmount: string; interestAmount: string; overdueDays: number };
};

type DashboardStudent = {
  id: string;
  fullName: string;
  phone?: string;
  modality?: string;
  enrollmentDate?: string;
  status?: string;
  oldestInvoice?: Invoice | null;
};

type Dashboard = {
  activeStudents: number;
  dueSoon: number;
  overdue: number;
  monthRevenue: number;
  delinquentStudents: number;
  dueSoonInvoices: Invoice[];
  delinquentStudentRows: DashboardStudent[];
  latestPayments: Invoice[];
  latestStudents: DashboardStudent[];
};

function QuickAction({ href, label, icon: Icon, primary = false }: { href: string; label: string; icon: typeof Plus; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
        primary
          ? "bg-brand text-white shadow-sm shadow-orange-950/30 hover:bg-brandDark"
          : "border border-[#ded7cf] bg-[#fffdfa] text-gray-800 hover:border-orange-300 hover:bg-orange-50"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function ListPanel({
  title,
  emptyTitle,
  empty,
  action,
  children
}: {
  title: string;
  emptyTitle: string;
  empty: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <SectionCard className="overflow-hidden">
      <div className="border-b border-gray-200 px-4 py-3">
        <p className="text-sm font-semibold text-ink">{title}</p>
      </div>
      {hasItems ? <div className="divide-y divide-gray-100">{children}</div> : <div className="p-4"><EmptyState title={emptyTitle} description={empty} action={action} /></div>}
    </SectionCard>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }

    if (getStoredUser()?.role === "ALUNO") {
      router.replace("/student/dashboard");
      return;
    }

    api<Dashboard>("/dashboard/admin")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <AppShell>
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand">Visão geral</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Indicadores operacionais e financeiro do mês.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <QuickAction href="/enrollments" label="Nova Matrícula" icon={UserPlus} primary />
          <QuickAction href="/students" label="Novo aluno" icon={Users} />
          <QuickAction href="/invoices" label="Nova mensalidade" icon={CreditCard} />
          <QuickAction href="/assessments" label="Nova avaliação" icon={Activity} />
          <QuickAction href="/workouts" label="Novo treino" icon={ClipboardList} />
        </div>
      </header>

      {error && <Alert type="error" message={error} />}

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard icon={Users} label="Alunos ativos" value={data?.activeStudents ?? 0} description="Atualizado hoje" tone="brand" />
            <StatCard icon={CalendarClock} label="Vencendo em 7 dias" value={data?.dueSoon ?? 0} description={(data?.dueSoon ?? 0) > 0 ? "Cobranças próximas" : "Nenhuma cobrança próxima"} tone="blue" />
            <StatCard icon={AlertTriangle} label="Mensalidades em atraso" value={data?.overdue ?? 0} description={(data?.overdue ?? 0) > 0 ? "Requer acompanhamento" : "Tudo em dia"} tone="red" />
            <StatCard icon={CircleDollarSign} label="Receita do mês" value={formatCurrency(data?.monthRevenue ?? 0)} description="Pagamentos confirmados" tone="gray" />
            <StatCard icon={WalletCards} label="Alunos inadimplentes" value={data?.delinquentStudents ?? 0} description={(data?.delinquentStudents ?? 0) > 0 ? "Com mensalidades vencidas" : "Sem pendências críticas"} tone="amber" />
          </section>

          <section className="mt-6 grid gap-4 xl:grid-cols-2">
            <ListPanel title="Mensalidades vencendo" emptyTitle="Nenhuma cobrança próxima" empty="Nenhuma mensalidade vence nos próximos 7 dias." action={<Button type="button" variant="secondary" onClick={() => router.push("/invoices")}>Criar mensalidade</Button>}>
              {(data?.dueSoonInvoices ?? []).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <Link href={`/students/${invoice.student.id}`} className="font-semibold text-ink hover:text-brand">{invoice.student.fullName}</Link>
                    <p className="text-muted">{invoice.plan?.name ?? "Mensalidade"} - {formatDate(invoice.dueDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-ink">{formatCurrency(invoice.charges?.total ?? invoice.amount)}</p>
                    <StatusBadge status={invoice.status} />
                  </div>
                </div>
              ))}
            </ListPanel>

            <ListPanel title="Alunos inadimplentes" emptyTitle="Tudo em dia por aqui" empty="Quando houver alunos inadimplentes, eles aparecerão nesta lista.">
              {(data?.delinquentStudentRows ?? []).map((student) => (
                <div key={student.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <Link href={`/students/${student.id}`} className="font-semibold text-ink hover:text-brand">{student.fullName}</Link>
                    <p className="text-muted">{formatPhone(student.phone ?? "") || "-"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-ink">{formatCurrency(student.oldestInvoice?.charges?.total ?? student.oldestInvoice?.amount ?? 0)}</p>
                    <p className="text-xs text-muted">Desde {formatDate(student.oldestInvoice?.dueDate)}</p>
                  </div>
                </div>
              ))}
            </ListPanel>

            <ListPanel title="Últimos pagamentos" emptyTitle="Nenhum pagamento registrado" empty="Assim que uma mensalidade for marcada como paga, ela aparecerá aqui.">
              {(data?.latestPayments ?? []).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <Link href={`/students/${invoice.student.id}`} className="font-semibold text-ink hover:text-brand">{invoice.student.fullName}</Link>
                    <p className="text-muted">{invoice.plan?.name ?? "Mensalidade"} - pago em {formatDate(invoice.paidAt)}</p>
                  </div>
                  <p className="font-semibold text-ink">{formatCurrency(invoice.totalPaid ?? invoice.amount)}</p>
                </div>
              ))}
            </ListPanel>

            <ListPanel title="Últimos alunos cadastrados" emptyTitle="Nenhum aluno cadastrado ainda" empty="Comece criando a primeira matrícula com plano e mensalidade inicial." action={<Button type="button" onClick={() => router.push("/enrollments")}>Nova matrícula</Button>}>
              {(data?.latestStudents ?? []).map((student) => (
                <div key={student.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <Link href={`/students/${student.id}`} className="font-semibold text-ink hover:text-brand">{student.fullName}</Link>
                    <p className="text-muted">{student.modality ?? "-"} - matrícula {formatDate(student.enrollmentDate)}</p>
                  </div>
                  <StatusBadge status={student.status ?? "ATIVO"} />
                </div>
              ))}
            </ListPanel>
          </section>
        </>
      )}
    </AppShell>
  );
}
