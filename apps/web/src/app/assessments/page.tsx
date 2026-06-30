"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { trainingGoals } from "@academia/shared";
import { AppShell } from "@/components/app-shell";
import { BmiIndicator } from "@/components/bmi-indicator";
import { Alert, Button, EmptyState, FieldGroup, LoadingState, MobileRecordCard, SectionCard, fieldClass, textareaClass } from "@/components/ui";
import { api } from "@/lib/api";
import { normalizeMoneyInput } from "@/lib/format";

type Student = { id: string; fullName: string };
type NumericGroup = Record<string, string | number | null | undefined>;
type GroupKey = "bioimpedance" | "anthropometry" | "skinfolds" | "physicalTests";

type Assessment = {
  id: string;
  studentId: string;
  student: Student;
  professor?: { id: string; name: string } | null;
  assessedAt: string;
  startDate?: string | null;
  trainingGoals?: string[];
  weightKg: string;
  heightCm: string;
  bmi: string;
  bodyFatPercentage?: string | null;
  muscleMassKg?: string | null;
  abdominalCircumferenceCm?: string | null;
  armCircumferenceCm?: string | null;
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
  bioimpedance?: NumericGroup | null;
  anthropometry?: NumericGroup | null;
  anthropometryMeasuredAt?: string | null;
  skinfolds?: NumericGroup | null;
  skinfoldsMeasuredAt?: string | null;
  physicalTests?: NumericGroup | null;
  notes?: string | null;
};

const today = () => new Date().toISOString().slice(0, 10);

const bioimpedanceFields = [
  ["bodyFatPercentage", "Gordura corporal (%)"],
  ["muscleRate", "Taxa muscular (%)"],
  ["leanBodyMassKg", "Massa corporal magra (kg)"],
  ["subcutaneousFatPercentage", "Gordura subcutânea (%)"],
  ["visceralFatLevel", "Gordura visceral"],
  ["bodyWaterPercentage", "Água corporal (%)"],
  ["muscleMassKg", "Massa muscular (kg)"],
  ["boneMassKg", "Massa óssea (kg)"],
  ["proteinPercentage", "Proteína (%)"],
  ["basalMetabolicRate", "TBM / TMB"],
  ["bodyAge", "Idade do corpo"],
  ["fatMassKg", "Massa gorda (kg)"],
  ["waterWeightKg", "Peso da agua (kg)"],
  ["skeletalMuscleKg", "Músculo esquelético (kg)"],
  ["proteinMassKg", "Massa de proteína (kg)"],
  ["idealBodyWeightKg", "Peso corporal ideal (kg)"],
  ["obesityLevel", "Nível de obesidade"]
] as const;

const anthropometryFields = [
  ["neckCm", "Pescoço"],
  ["shoulderCm", "Ombro"],
  ["rightArmCm", "Braço direito"],
  ["leftArmCm", "Braço esquerdo"],
  ["rightForearmCm", "Antebraço direito"],
  ["leftForearmCm", "Antebraço esquerdo"],
  ["chestCm", "Tórax"],
  ["waistCm", "Cintura"],
  ["abdomenCm", "Abdômen"],
  ["hipCm", "Quadril"],
  ["rightThighCm", "Coxa direita"],
  ["leftThighCm", "Coxa esquerda"],
  ["rightCalfCm", "Panturrilha direita"],
  ["leftCalfCm", "Panturrilha esquerda"]
] as const;

const skinfoldFields = [
  ["tricepsMm", "Tríceps"],
  ["subscapularMm", "Subescapular"],
  ["chestMm", "Peito / Tórax"],
  ["midaxillaryMm", "Média axilar"],
  ["suprailiacMm", "Supra-ilíaca"],
  ["abdomenMm", "Abdômen"],
  ["thighMm", "Coxa"],
  ["calfMm", "Panturrilha"]
] as const;

const physicalTestFields = [
  ["restingPas", "Repouso - PAS"],
  ["restingPad", "Repouso - PAD"],
  ["restingFc1", "Repouso - FC1"],
  ["mcardlePas", "McArdle - PAS"],
  ["mcardlePad", "McArdle - PAD"],
  ["mcardleFc2", "McArdle - FC2"],
  ["sitUpOneMinute", "Abdominal remador 1 min"],
  ["pushUps", "Flexão de braço"],
  ["wellsBenchCm", "Banco de Wells (cm)"],
  ["vo2Max", "VO2 máximo"]
] as const;

const steps = [
  { id: "general", label: "Dados e objetivos" },
  { id: "bioimpedance", label: "Bioimpedância" },
  { id: "anthropometry", label: "Antropometria" },
  { id: "skinfolds", label: "Dobras cutâneas" },
  { id: "tests", label: "Testes físicos" },
  { id: "review", label: "Revisão" }
] as const;

const makeGroup = (fields: readonly (readonly [string, string])[]) => Object.fromEntries(fields.map(([key]) => [key, ""])) as Record<string, string>;

const emptyForm = () => ({
  studentId: "",
  assessedAt: today(),
  startDate: "",
  trainingGoals: [] as string[],
  weightKg: "",
  heightCm: "",
  bodyFatPercentage: "",
  muscleMassKg: "",
  abdominalCircumferenceCm: "",
  armCircumferenceCm: "",
  leftArmCircumferenceCm: "",
  rightArmCircumferenceCm: "",
  leftLegCircumferenceCm: "",
  rightLegCircumferenceCm: "",
  chestCircumferenceCm: "",
  shoulderCircumferenceCm: "",
  gluteCircumferenceCm: "",
  leftCalfCircumferenceCm: "",
  rightCalfCircumferenceCm: "",
  waistCircumferenceCm: "",
  hipCircumferenceCm: "",
  bioimpedance: makeGroup(bioimpedanceFields),
  anthropometry: makeGroup(anthropometryFields),
  anthropometryMeasuredAt: "",
  skinfolds: makeGroup(skinfoldFields),
  skinfoldsMeasuredAt: "",
  physicalTests: makeGroup(physicalTestFields),
  notes: ""
});

type AssessmentForm = ReturnType<typeof emptyForm>;

function groupToForm(fields: readonly (readonly [string, string])[], group?: NumericGroup | null, fallback: Record<string, string | null | undefined> = {}) {
  return Object.fromEntries(
    fields.map(([key]) => {
      const value = group?.[key] ?? fallback[key] ?? "";
      return [key, String(value).replace(".", ",")];
    })
  ) as Record<string, string>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-gray-700">{children}</label>;
}

export default function AssessmentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [form, setForm] = useState<AssessmentForm>(emptyForm);
  const [activeStep, setActiveStep] = useState<(typeof steps)[number]["id"]>("general");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [studentsPayload, assessmentsPayload] = await Promise.all([
      api<{ students: Student[] }>("/students"),
      api<{ assessments: Assessment[] }>("/assessments")
    ]);
    setStudents(studentsPayload.students);
    setAssessments(assessmentsPayload.assessments);
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const studentId = new URLSearchParams(window.location.search).get("studentId");
    if (studentId) setForm((current) => ({ ...current, studentId }));
  }, []);

  const studentHistory = useMemo(
    () => assessments.filter((assessment) => assessment.studentId === form.studentId),
    [assessments, form.studentId]
  );

  const comparison = useMemo(() => {
    if (studentHistory.length < 2) return null;
    const [latest, previous] = studentHistory;
    return {
      weight: Number(latest.weightKg) - Number(previous.weightKg),
      bmi: Number(latest.bmi) - Number(previous.bmi),
      bodyFat:
        latest.bodyFatPercentage && previous.bodyFatPercentage
          ? Number(latest.bodyFatPercentage) - Number(previous.bodyFatPercentage)
          : null,
      muscleMass:
        latest.muscleMassKg && previous.muscleMassKg
          ? Number(latest.muscleMassKg) - Number(previous.muscleMassKg)
          : null
    };
  }, [studentHistory]);

  const bmiPreview = useMemo(() => {
    const weight = Number(form.weightKg.replace(",", "."));
    const height = Number(form.heightCm.replace(",", ".")) / 100;
    if (!weight || !height) return "-";
    return (weight / (height * height)).toFixed(2).replace(".", ",");
  }, [form.heightCm, form.weightKg]);

  function updateGroup(group: GroupKey, key: string, value: string) {
    setForm((current) => ({
      ...current,
      [group]: { ...current[group], [key]: normalizeMoneyInput(value) }
    }));
  }

  function toggleGoal(goal: string) {
    setForm((current) => ({
      ...current,
      trainingGoals: current.trainingGoals.includes(goal)
        ? current.trainingGoals.filter((item) => item !== goal)
        : [...current.trainingGoals, goal]
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      await api(editingId ? `/assessments/${editingId}` : "/assessments", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify({
          ...form,
          anthropometryMeasuredAt: form.assessedAt,
          skinfoldsMeasuredAt: form.assessedAt
        })
      });
      setForm(emptyForm());
      setEditingId(null);
      setActiveStep("general");
      await load();
      setSuccess(editingId ? "Avaliação atualizada com sucesso." : "Avaliação cadastrada com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  function editAssessment(assessment: Assessment) {
    setEditingId(assessment.id);
    setActiveStep("general");
    setForm({
      studentId: assessment.studentId,
      assessedAt: assessment.assessedAt.slice(0, 10),
      startDate: assessment.startDate?.slice(0, 10) ?? "",
      trainingGoals: assessment.trainingGoals ?? [],
      weightKg: String(assessment.weightKg).replace(".", ","),
      heightCm: String(assessment.heightCm).replace(".", ","),
      bodyFatPercentage: String(assessment.bodyFatPercentage ?? "").replace(".", ","),
      muscleMassKg: String(assessment.muscleMassKg ?? "").replace(".", ","),
      abdominalCircumferenceCm: String(assessment.abdominalCircumferenceCm ?? "").replace(".", ","),
      armCircumferenceCm: String(assessment.armCircumferenceCm ?? "").replace(".", ","),
      leftArmCircumferenceCm: String(assessment.leftArmCircumferenceCm ?? "").replace(".", ","),
      rightArmCircumferenceCm: String(assessment.rightArmCircumferenceCm ?? "").replace(".", ","),
      leftLegCircumferenceCm: String(assessment.leftLegCircumferenceCm ?? "").replace(".", ","),
      rightLegCircumferenceCm: String(assessment.rightLegCircumferenceCm ?? "").replace(".", ","),
      chestCircumferenceCm: String(assessment.chestCircumferenceCm ?? "").replace(".", ","),
      shoulderCircumferenceCm: String(assessment.shoulderCircumferenceCm ?? "").replace(".", ","),
      gluteCircumferenceCm: String(assessment.gluteCircumferenceCm ?? "").replace(".", ","),
      leftCalfCircumferenceCm: String(assessment.leftCalfCircumferenceCm ?? "").replace(".", ","),
      rightCalfCircumferenceCm: String(assessment.rightCalfCircumferenceCm ?? "").replace(".", ","),
      waistCircumferenceCm: String(assessment.waistCircumferenceCm ?? "").replace(".", ","),
      hipCircumferenceCm: String(assessment.hipCircumferenceCm ?? "").replace(".", ","),
      bioimpedance: groupToForm(bioimpedanceFields, assessment.bioimpedance, {
        bodyFatPercentage: assessment.bodyFatPercentage,
        muscleMassKg: assessment.muscleMassKg
      }),
      anthropometry: groupToForm(anthropometryFields, assessment.anthropometry, {
        shoulderCm: assessment.shoulderCircumferenceCm,
        chestCm: assessment.chestCircumferenceCm,
        waistCm: assessment.waistCircumferenceCm,
        abdômenCm: assessment.abdominalCircumferenceCm,
        hipCm: assessment.hipCircumferenceCm,
        rightArmCm: assessment.rightArmCircumferenceCm,
        leftArmCm: assessment.leftArmCircumferenceCm,
        rightThighCm: assessment.rightLegCircumferenceCm,
        leftThighCm: assessment.leftLegCircumferenceCm,
        rightCalfCm: assessment.rightCalfCircumferenceCm,
        leftCalfCm: assessment.leftCalfCircumferenceCm
      }),
      anthropometryMeasuredAt: assessment.anthropometryMeasuredAt?.slice(0, 10) ?? "",
      skinfolds: groupToForm(skinfoldFields, assessment.skinfolds),
      skinfoldsMeasuredAt: assessment.skinfoldsMeasuredAt?.slice(0, 10) ?? "",
      physicalTests: groupToForm(physicalTestFields, assessment.physicalTests),
      notes: assessment.notes ?? ""
    });
  }

  async function removeAssessment(id: string) {
    if (!window.confirm("Excluir esta avaliação do histórico?")) return;
    setError("");
    setSuccess("");
    try {
      await api(`/assessments/${id}`, { method: "DELETE" });
      await load();
      setSuccess("Avaliação removida do histórico.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    }
  }

  function renderGroupFields(group: GroupKey, fields: readonly (readonly [string, string])[], suffix = "") {
    return fields.map(([key, label]) => (
      <FieldLabel key={key}>
        {label}{suffix}
        <input className={fieldClass} value={form[group][key] ?? ""} onChange={(event) => updateGroup(group, key, event.target.value)} />
      </FieldLabel>
    ));
  }

  return (
    <AppShell>
      <header className="mb-6">
        <p className="text-sm font-semibold text-brand">Evolução</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Avaliações físicas</h1>
        <p className="mt-1 text-sm text-muted">Registre uma avaliação completa em etapas, sem pesar o cadastro básico do aluno.</p>
      </header>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <SectionCard className="mb-6 p-4">
        <div className="mb-5 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          {steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveStep(step.id)}
              className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                activeStep === step.id
                  ? "border-brand bg-orange-50 text-brand"
                  : "border-[#ded7cf] bg-[#fffdfa] text-gray-700 hover:border-orange-200"
              }`}
            >
              <span className="block text-xs font-semibold">{index + 1}/6</span>
              <span className="font-semibold">{step.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {activeStep === "general" && (
            <FieldGroup title="Dados e objetivos" description="Vincule a avaliação ao aluno, informe datas e objetivos do treinamento.">
              <FieldLabel>
                Aluno
                <select className={fieldClass} value={form.studentId} onChange={(event) => setForm((current) => ({ ...current, studentId: event.target.value }))}>
                  <option value="">Selecione</option>
                  {students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}
                </select>
              </FieldLabel>
              <FieldLabel>
                Data da avaliação
                <input className={fieldClass} type="date" value={form.assessedAt} onChange={(event) => setForm((current) => ({ ...current, assessedAt: event.target.value }))} />
              </FieldLabel>
              <FieldLabel>
                Data de início
                <input className={fieldClass} type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
              </FieldLabel>
              <div className="md:col-span-2 xl:col-span-4">
                <p className="text-sm font-medium text-gray-700">Objetivos</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {trainingGoals.map((goal) => (
                    <label key={goal} className="flex items-center gap-2 rounded-md border border-[#ded7cf] bg-[#fffdfa] px-3 py-2 text-sm font-medium text-gray-700">
                      <input type="checkbox" checked={form.trainingGoals.includes(goal)} onChange={() => toggleGoal(goal)} className="h-4 w-4 rounded border-gray-300 text-brand" />
                      {goal}
                    </label>
                  ))}
                </div>
              </div>
              <label className="text-sm font-medium text-gray-700 md:col-span-2 xl:col-span-4">
                Observações gerais
                <textarea className={textareaClass} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
              </label>
            </FieldGroup>
          )}

          {activeStep === "bioimpedance" && (
            <FieldGroup title="Bioimpedância" description="Peso e altura são obrigatorios para o IMC. Os demais campos podem ficar em branco.">
              <FieldLabel>
                Peso (kg)
                <input className={fieldClass} value={form.weightKg} onChange={(event) => setForm((current) => ({ ...current, weightKg: normalizeMoneyInput(event.target.value) }))} />
              </FieldLabel>
              <FieldLabel>
                Altura (cm)
                <input className={fieldClass} value={form.heightCm} onChange={(event) => setForm((current) => ({ ...current, heightCm: normalizeMoneyInput(event.target.value) }))} />
              </FieldLabel>
              <div className="rounded-md border border-orange-100 bg-orange-50 px-3 py-2 text-sm">
                <span className="text-muted">IMC calculado</span>
                <div className="mt-2">{bmiPreview === "-" ? <p className="text-lg font-semibold text-brand">-</p> : <BmiIndicator value={bmiPreview} compact />}</div>
              </div>
              {renderGroupFields("bioimpedance", bioimpedanceFields)}
            </FieldGroup>
          )}

          {activeStep === "anthropometry" && (
            <FieldGroup title="Antropometria" description="Medidas em centímetros. A data usada será a mesma data da avaliação informada na primeira etapa.">
              {renderGroupFields("anthropometry", anthropometryFields, " (cm)")}
            </FieldGroup>
          )}

          {activeStep === "skinfolds" && (
            <FieldGroup title="Dobras cutâneas" description="Medidas em milímetros. A data usada será a mesma data da avaliação informada na primeira etapa. Campos vazios serão ignorados.">
              {renderGroupFields("skinfolds", skinfoldFields, " (mm)")}
            </FieldGroup>
          )}

          {activeStep === "tests" && (
            <FieldGroup title="Capacidade cardiorrespiratoria e testes físicos" description="Registre dados de repouso, teste do banco de McArdle e testes complementares.">
              {renderGroupFields("physicalTests", physicalTestFields)}
            </FieldGroup>
          )}

          {activeStep === "review" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard className="p-4">
                <p className="text-sm font-semibold text-ink">Resumo</p>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-md bg-orange-50 p-3"><p className="text-muted">Aluno</p><p className="font-semibold text-ink">{students.find((student) => student.id === form.studentId)?.fullName ?? "-"}</p></div>
                  <div className="rounded-md bg-orange-50 p-3"><p className="text-muted">Data</p><p className="font-semibold text-ink">{form.assessedAt || "-"}</p></div>
                  <div className="rounded-md bg-orange-50 p-3"><p className="text-muted">Peso</p><p className="font-semibold text-ink">{form.weightKg || "-"} kg</p></div>
                  <div className="rounded-md bg-orange-50 p-3"><p className="text-muted">IMC</p><p className="font-semibold text-ink">{bmiPreview}</p></div>
                  <div className="rounded-md bg-orange-50 p-3 sm:col-span-2"><p className="text-muted">Objetivos</p><p className="font-semibold text-ink">{form.trainingGoals.join(", ") || "-"}</p></div>
                </div>
              </SectionCard>

              <SectionCard className="p-4">
                <p className="text-sm font-semibold text-ink">Comparação</p>
                {comparison ? (
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-md bg-orange-50 p-3"><p className="text-muted">Peso</p><p className="font-semibold text-ink">{comparison.weight.toFixed(2).replace(".", ",")} kg</p></div>
                    <div className="rounded-md bg-orange-50 p-3"><p className="text-muted">IMC</p><p className="font-semibold text-ink">{comparison.bmi.toFixed(2).replace(".", ",")}</p></div>
                    <div className="rounded-md bg-orange-50 p-3"><p className="text-muted">% gordura</p><p className="font-semibold text-ink">{comparison.bodyFat === null ? "-" : `${comparison.bodyFat.toFixed(2).replace(".", ",")}%`}</p></div>
                    <div className="rounded-md bg-orange-50 p-3"><p className="text-muted">Massa muscular</p><p className="font-semibold text-ink">{comparison.muscleMass === null ? "-" : `${comparison.muscleMass.toFixed(2).replace(".", ",")} kg`}</p></div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted">Selecione um aluno com pelo menos duas avaliações para comparar a evolução.</p>
                )}
              </SectionCard>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingId ? "Atualizar avaliação" : "Salvar avaliação completa"}</Button>
            <Button type="button" variant="secondary" onClick={() => setActiveStep(steps[Math.max(steps.findIndex((step) => step.id === activeStep) - 1, 0)].id)}>
              Voltar etapa
            </Button>
            <Button type="button" variant="secondary" onClick={() => setActiveStep(steps[Math.min(steps.findIndex((step) => step.id === activeStep) + 1, steps.length - 1)].id)}>
              Proxima etapa
            </Button>
            {editingId && <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(emptyForm()); }}>Cancelar edicao</Button>}
          </div>
        </form>
      </SectionCard>

      {loading ? (
        <LoadingState />
      ) : assessments.length === 0 ? (
        <EmptyState title="Nenhuma avaliação cadastrada" description="Cadastre a primeira avaliação para acompanhar a evolução física dos alunos." />
      ) : (
        <SectionCard className="overflow-hidden">
          <div className="grid gap-3 p-4 md:hidden">
            {assessments.map((assessment) => (
              <MobileRecordCard key={assessment.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{assessment.student.fullName}</p>
                    <p className="mt-1 text-sm text-muted">{new Date(assessment.assessedAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <BmiIndicator value={assessment.bmi} compact />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted">Peso</p><p className="font-medium text-ink">{assessment.weightKg} kg</p></div>
                  <div><p className="text-xs text-muted">Altura</p><p className="font-medium text-ink">{assessment.heightCm} cm</p></div>
                  <div><p className="text-xs text-muted">Professor</p><p className="font-medium text-ink">{assessment.professor?.name ?? "-"}</p></div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Button type="button" variant="secondary" onClick={() => editAssessment(assessment)}>Editar</Button>
                  <Button type="button" variant="danger" onClick={() => removeAssessment(assessment.id)}>Excluir</Button>
                </div>
              </MobileRecordCard>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[#1a130f] text-xs uppercase tracking-wide text-orange-100">
                <tr>
                  <th className="px-4 py-3">Aluno</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Peso</th>
                  <th className="px-4 py-3">Altura</th>
                  <th className="px-4 py-3">IMC</th>
                  <th className="px-4 py-3">Professor</th>
                  <th className="px-4 py-3">Ação</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((assessment) => (
                  <tr key={assessment.id} className="border-t border-[#ded7cf] hover:bg-orange-50/60">
                    <td className="px-4 py-3 font-medium text-ink">{assessment.student.fullName}</td>
                    <td className="px-4 py-3 text-gray-700">{new Date(assessment.assessedAt).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 text-gray-700">{assessment.weightKg} kg</td>
                    <td className="px-4 py-3 text-gray-700">{assessment.heightCm} cm</td>
                    <td className="px-4 py-3"><BmiIndicator value={assessment.bmi} compact /></td>
                    <td className="px-4 py-3 text-gray-700">{assessment.professor?.name ?? "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button type="button" variant="secondary" className="h-8 px-3" onClick={() => editAssessment(assessment)}>Editar</Button>
                        <Button type="button" variant="danger" className="h-8 px-3" onClick={() => removeAssessment(assessment.id)}>Excluir</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </AppShell>
  );
}
