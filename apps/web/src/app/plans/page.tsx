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
import { formatCurrency, normalizeMoneyInput } from "@/lib/format";
import { defaultPlanAccessForModality, planModalities } from "@academia/shared";

type Plan = {
  id: string;
  name: string;
  value: string;
  modality: string;
  durationDays: number;
  dueDay: number;
  allowAssessments: boolean;
  allowWorkouts: boolean;
  isActive: boolean;
};

const pageSize = 8;
const initialPlanForm = () => ({ name: "", value: "", modality: "", durationDays: "30", dueDay: "10", allowAssessments: false, allowWorkouts: false, isActive: true });
const planFields: Array<{ name: "name" | "value" | "modality" | "durationDays" | "dueDay"; label: string }> = [
  { name: "name", label: "Nome" },
  { name: "value", label: "Valor" },
  { name: "modality", label: "Tipo" },
  { name: "durationDays", label: "Duração" },
  { name: "dueDay", label: "Vencimento" }
];

function planAccessLabels(plan: Pick<Plan, "allowAssessments" | "allowWorkouts">) {
  return ["Pagamentos", plan.allowAssessments ? "Avaliações" : null, plan.allowWorkouts ? "Treinos" : null].filter(Boolean) as string[];
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialPlanForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [page, setPage] = useState(1);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);

  async function load() {
    const payload = await api<{ plans: Plan[] }>("/plans");
    setPlans(payload.plans);
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredPlans = useMemo(() => {
    const term = search.trim().toLowerCase();
    return plans.filter((plan) => {
      const matchesSearch = [plan.name, plan.modality, String(plan.value)].some((value) => value.toLowerCase().includes(term));
      const matchesStatus = statusFilter === "TODOS" || (statusFilter === "ATIVO" ? plan.isActive : !plan.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [plans, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPlans.length / pageSize));
  const visiblePlans = filteredPlans.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await api(editingId ? `/plans/${editingId}` : "/plans", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(form)
      });
      setForm(initialPlanForm());
      setEditingId(null);
      await load();
      setSuccess(editingId ? "Plano atualizado com sucesso." : "Plano criado com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  function editPlan(plan: Plan) {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      value: String(plan.value).replace(".", ","),
      modality: plan.modality,
      durationDays: String(plan.durationDays),
      dueDay: String(plan.dueDay),
      allowAssessments: plan.allowAssessments,
      allowWorkouts: plan.allowWorkouts,
      isActive: plan.isActive
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(initialPlanForm());
    setEditingId(null);
  }

  async function inactivatePlan(plan: Plan) {
    setError("");
    setSuccess("");
    try {
      await api(`/plans/${plan.id}`, { method: "DELETE" });
      setPlanToDelete(null);
      await load();
      setSuccess("Plano inativado com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    }
  }

  return (
    <AppShell>
      <header className="mb-6">
        <p className="text-sm font-semibold text-brand">Comercial</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Planos</h1>
        <p className="mt-1 text-sm text-muted">Planos por tipo, valor, duração, vencimento e acessos liberados.</p>
      </header>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <SectionCard className="mb-6 p-4">
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {planFields.map(({ name, label }) => (
            <label key={name} className="text-sm font-medium text-gray-700">
              {label}
              {name === "modality" ? (
                <select
                  className={fieldClass}
                  value={form.modality}
                  onChange={(event) => {
                    const modality = event.target.value;
                    const access = modality ? defaultPlanAccessForModality(modality) : { allowAssessments: false, allowWorkouts: false };
                    setForm((current) => ({ ...current, modality, ...access }));
                  }}
                >
                  <option value="">Selecione</option>
                  {planModalities.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  className={fieldClass}
                  value={form[name]}
                  onChange={(event) => {
                    const value = name === "value" ? normalizeMoneyInput(event.target.value) : event.target.value;
                    setForm((current) => ({ ...current, [name]: value }));
                  }}
                />
              )}
            </label>
          ))}
          <label className="text-sm font-medium text-gray-700">
            Status
            <select className={fieldClass} value={form.isActive ? "ATIVO" : "INATIVO"} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "ATIVO" }))}>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </label>
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 md:col-span-2 xl:col-span-5">
            <p className="text-sm font-semibold text-ink">Acessos do plano</p>
            <p className="mt-1 text-xs text-muted">Financeiro fica sempre disponível. Avaliações e treinos dependem do plano contratado.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <label className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked
                  disabled
                  className="h-4 w-4 rounded border-gray-300"
                />
                Pagamentos
              </label>
              <label className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={form.allowAssessments}
                  onChange={(event) => setForm((current) => ({ ...current, allowAssessments: event.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Avaliações
              </label>
              <label className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={form.allowWorkouts}
                  onChange={(event) => setForm((current) => ({ ...current, allowWorkouts: event.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Treinos
              </label>
            </div>
          </div>
          <div className="flex gap-2 md:col-span-2 xl:col-span-5">
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingId ? "Atualizar plano" : "Criar plano"}</Button>
            <Button type="button" variant="secondary" onClick={resetForm}>Cancelar</Button>
          </div>
        </form>
      </SectionCard>

      {loading ? (
        <LoadingState />
      ) : plans.length === 0 ? (
        <EmptyState title="Nenhum plano cadastrado" description="Crie um plano para vincular alunos e registrar mensalidades." />
      ) : (
        <SectionCard className="overflow-hidden">
          <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Buscar por plano, tipo ou valor">
            <label className="w-full text-sm font-medium text-gray-700 sm:w-44">
              Status
              <select className={fieldClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="TODOS">Todos</option>
                <option value="ATIVO">Ativos</option>
                <option value="INATIVO">Inativos</option>
              </select>
            </label>
          </TableToolbar>

          {filteredPlans.length === 0 ? (
            <div className="p-4">
              <EmptyState title="Nenhum plano encontrado" description="Ajuste a busca ou o filtro para visualizar os planos cadastrados." />
            </div>
          ) : (
            <>
              <div className="grid gap-3 p-4 md:hidden">
                {visiblePlans.map((plan) => (
                  <MobileRecordCard key={plan.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">{plan.name}</p>
                        <p className="mt-1 text-sm text-muted">{plan.modality}</p>
                      </div>
                      <StatusBadge status={plan.isActive ? "ATIVO" : "INATIVO"} />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div><p className="text-xs text-muted">Valor</p><p className="font-semibold text-ink">{formatCurrency(plan.value)}</p></div>
                      <div><p className="text-xs text-muted">Duração</p><p className="font-medium text-ink">{plan.durationDays} dias</p></div>
                      <div><p className="text-xs text-muted">Vencimento</p><p className="font-medium text-ink">Dia {plan.dueDay}</p></div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {planAccessLabels(plan).map((label) => <StatusBadge key={label} status={label} />)}
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <Button type="button" variant="secondary" onClick={() => editPlan(plan)}>Editar</Button>
                      {plan.isActive && <Button type="button" variant="danger" onClick={() => setPlanToDelete(plan)}>Inativar</Button>}
                    </div>
                  </MobileRecordCard>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Plano</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Duração</th>
                      <th className="px-4 py-3">Vencimento</th>
                      <th className="px-4 py-3">Acessos</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePlans.map((plan) => (
                      <tr key={plan.id} className="border-t border-gray-100 hover:bg-gray-50/70">
                        <td className="px-4 py-3 font-medium text-ink">{plan.name}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(plan.value)}</td>
                        <td className="px-4 py-3 text-gray-600">{plan.modality}</td>
                        <td className="px-4 py-3 text-gray-600">{plan.durationDays} dias</td>
                        <td className="px-4 py-3 text-gray-600">Dia {plan.dueDay}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {planAccessLabels(plan).map((label) => <StatusBadge key={label} status={label} />)}
                          </div>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={plan.isActive ? "ATIVO" : "INATIVO"} /></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button type="button" variant="secondary" className="h-8 px-3" onClick={() => editPlan(plan)}>
                              Editar
                            </Button>
                            {plan.isActive && (
                              <Button type="button" variant="danger" className="h-8 px-3" onClick={() => setPlanToDelete(plan)}>
                                Inativar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} totalPages={totalPages} totalItems={filteredPlans.length} onPageChange={setPage} />
            </>
          )}
        </SectionCard>
      )}

      <ConfirmModal
        open={!!planToDelete}
        title="Inativar plano"
        description={`O plano ${planToDelete?.name ?? ""} ficara indisponível para novos vinculos.`}
        confirmLabel="Inativar"
        onCancel={() => setPlanToDelete(null)}
        onConfirm={() => planToDelete && inactivatePlan(planToDelete)}
      />
    </AppShell>
  );
}
