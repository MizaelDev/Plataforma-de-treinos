"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, CalendarClock, CircleDollarSign, ClipboardList, CreditCard, Plus, UserPlus, Users, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { api, getStoredUser, getToken } from "@/lib/api";
import { Alert, EmptyState, LoadingState, SectionCard, StatusBadge } from "@/components/ui";
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

function QuickAction({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Plus }) {
  return (
    <Link href={href} className="flex h-10 items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50">
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function ListPanel({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <SectionCard className="overflow-hidden">
      <div className="border-b border-gray-200 px-4 py-3">
        <p className="text-sm font-semibold text-ink">{title}</p>
      </div>
      {hasItems ? <div className="divide-y divide-gray-100">{children}</div> : <div className="p-4"><EmptyState title="Sem registros" description={empty} /></div>}
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
          <p className="text-sm font-semibold text-brand">Visao geral</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Indicadores operacionais e financeiro do mes.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction href="/students" label="Novo aluno" icon={UserPlus} />
          <QuickAction href="/invoices" label="Nova mensalidade" icon={CreditCard} />
          <QuickAction href="/assessments" label="Nova avaliacao" icon={Activity} />
          <QuickAction href="/workouts" label="Novo treino" icon={ClipboardList} />
        </div>
      </header>

      {error && <Alert type="error" message={error} />}

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard icon={Users} label="Alunos ativos" value={data?.activeStudents ?? 0} tone="teal" />
            <StatCard icon={CalendarClock} label="Vencendo em 7 dias" value={data?.dueSoon ?? 0} tone="blue" />
            <StatCard icon={AlertTriangle} label="Mensalidades em atraso" value={data?.overdue ?? 0} tone="red" />
            <StatCard icon={CircleDollarSign} label="Receita do mes" value={formatCurrency(data?.monthRevenue ?? 0)} tone="gray" />
            <StatCard icon={WalletCards} label="Alunos inadimplentes" value={data?.delinquentStudents ?? 0} tone="amber" />
          </section>

          <section className="mt-6 grid gap-4 xl:grid-cols-2">
            <ListPanel title="Mensalidades vencendo" empty="Nenhuma mensalidade vence nos proximos 7 dias.">
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

            <ListPanel title="Alunos inadimplentes" empty="Nenhum aluno inadimplente no momento.">
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

            <ListPanel title="Ultimos pagamentos" empty="Nenhum pagamento registrado ainda.">
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

            <ListPanel title="Ultimos alunos cadastrados" empty="Nenhum aluno cadastrado ainda.">
              {(data?.latestStudents ?? []).map((student) => (
                <div key={student.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <Link href={`/students/${student.id}`} className="font-semibold text-ink hover:text-brand">{student.fullName}</Link>
                    <p className="text-muted">{student.modality ?? "-"} - matricula {formatDate(student.enrollmentDate)}</p>
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
