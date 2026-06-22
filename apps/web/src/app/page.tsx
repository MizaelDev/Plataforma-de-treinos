"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, CircleDollarSign, Users, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { api, getToken } from "@/lib/api";
import { Alert, LoadingState, SectionCard } from "@/components/ui";

type Dashboard = {
  activeStudents: number;
  dueSoon: number;
  overdue: number;
  monthRevenue: number;
  delinquentStudents: number;
};

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
    api<Dashboard>("/dashboard/admin")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <AppShell>
      <header className="mb-6">
        <p className="text-sm font-semibold text-brand">Visao geral</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Indicadores operacionais e financeiros da academia.</p>
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
            <StatCard icon={CircleDollarSign} label="Receita do mes" value={data ? data.monthRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00"} tone="gray" />
            <StatCard icon={WalletCards} label="Alunos inadimplentes" value={data?.delinquentStudents ?? 0} tone="amber" />
          </section>
          <SectionCard className="mt-6 p-5">
            <p className="text-sm font-semibold text-ink">Resumo operacional</p>
            <p className="mt-1 text-sm text-muted">
              Acompanhe diariamente vencimentos, atrasos e entrada de receita para manter a rotina financeira organizada.
            </p>
          </SectionCard>
        </>
      )}
    </AppShell>
  );
}
