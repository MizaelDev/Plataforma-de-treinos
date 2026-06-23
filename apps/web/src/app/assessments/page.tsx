"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { BmiIndicator } from "@/components/bmi-indicator";
import { Alert, Button, EmptyState, FieldGroup, LoadingState, MobileRecordCard, SectionCard, fieldClass, textareaClass } from "@/components/ui";
import { api } from "@/lib/api";
import { normalizeMoneyInput } from "@/lib/format";

type Student = { id: string; fullName: string };
type Assessment = {
  id: string;
  studentId: string;
  student: Student;
  professor?: { id: string; name: string } | null;
  assessedAt: string;
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
  notes?: string | null;
};

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = () => ({
  studentId: "",
  assessedAt: today(),
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
  notes: ""
});

const bodyMeasurementFields = [
  ["bodyFatPercentage", "% gordura"],
  ["muscleMassKg", "Massa muscular"],
  ["abdominalCircumferenceCm", "Abdominal"],
  ["chestCircumferenceCm", "Peitoral"],
  ["shoulderCircumferenceCm", "Ombros"],
  ["gluteCircumferenceCm", "Gluteos"],
  ["leftArmCircumferenceCm", "Braco esquerdo"],
  ["rightArmCircumferenceCm", "Braco direito"],
  ["leftLegCircumferenceCm", "Perna esquerda"],
  ["rightLegCircumferenceCm", "Perna direita"],
  ["leftCalfCircumferenceCm", "Panturrilha esquerda"],
  ["rightCalfCircumferenceCm", "Panturrilha direita"],
  ["waistCircumferenceCm", "Cintura"],
  ["hipCircumferenceCm", "Quadril"]
] as const;

const numberFields = new Set(["weightKg", "heightCm", ...bodyMeasurementFields.map(([name]) => name)]);

export default function AssessmentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [form, setForm] = useState(emptyForm);
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

  const studentHistory = useMemo(
    () => assessments.filter((assessment) => assessment.studentId === form.studentId),
    [assessments, form.studentId]
  );

  const comparison = useMemo(() => {
    if (studentHistory.length < 2) return null;
    const [latest, previous] = studentHistory;
    return {
      weight: Number(latest.weightKg) - Number(previous.weightKg),
      bmi: Number(latest.bmi) - Number(previous.bmi)
    };
  }, [studentHistory]);

  const bmiPreview = useMemo(() => {
    const weight = Number(form.weightKg.replace(",", "."));
    const height = Number(form.heightCm.replace(",", ".")) / 100;
    if (!weight || !height) return "-";
    return (weight / (height * height)).toFixed(2).replace(".", ",");
  }, [form.heightCm, form.weightKg]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      await api(editingId ? `/assessments/${editingId}` : "/assessments", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      setForm(emptyForm());
      setEditingId(null);
      await load();
      setSuccess(editingId ? "Avaliacao atualizada com sucesso." : "Avaliacao cadastrada com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  function editAssessment(assessment: Assessment) {
    setEditingId(assessment.id);
    setForm({
      studentId: assessment.studentId,
      assessedAt: assessment.assessedAt.slice(0, 10),
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
      notes: assessment.notes ?? ""
    });
  }

  async function removeAssessment(id: string) {
    if (!window.confirm("Excluir esta avaliacao do historico?")) return;
    setError("");
    setSuccess("");
    try {
      await api(`/assessments/${id}`, { method: "DELETE" });
      await load();
      setSuccess("Avaliacao removida do historico.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    }
  }

  return (
    <AppShell>
      <header className="mb-6">
        <p className="text-sm font-semibold text-brand">Evolucao</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Avaliacoes fisicas</h1>
        <p className="mt-1 text-sm text-muted">Registre medidas corporais, IMC automatico e historico por aluno.</p>
      </header>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <SectionCard className="mb-6 p-4">
        <form onSubmit={submit} className="space-y-4">
          <FieldGroup title="Dados principais" description="Selecione o aluno e informe os dados usados para calcular o IMC automaticamente.">
            <label className="text-sm font-medium text-gray-700">
              Aluno
              <select className={fieldClass} value={form.studentId} onChange={(event) => setForm((current) => ({ ...current, studentId: event.target.value }))}>
                <option value="">Selecione</option>
                {students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700">
              Data da avaliacao
              <input className={fieldClass} type="date" value={form.assessedAt} onChange={(event) => setForm((current) => ({ ...current, assessedAt: event.target.value }))} />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Peso (kg)
              <input className={fieldClass} value={form.weightKg} onChange={(event) => setForm((current) => ({ ...current, weightKg: normalizeMoneyInput(event.target.value) }))} />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Altura (cm)
              <input className={fieldClass} value={form.heightCm} onChange={(event) => setForm((current) => ({ ...current, heightCm: normalizeMoneyInput(event.target.value) }))} />
            </label>

            <div className="rounded-md border border-teal-100 bg-teal-50 px-3 py-2 text-sm">
              <span className="text-muted">IMC calculado</span>
              <div className="mt-2">{bmiPreview === "-" ? <p className="text-lg font-semibold text-brand">-</p> : <BmiIndicator value={bmiPreview} compact />}</div>
            </div>
          </FieldGroup>

          <FieldGroup title="Composicao e medidas corporais" description="Preencha somente as medidas realizadas. Campos em branco serao ignorados.">
            {bodyMeasurementFields.map(([name, label]) => (
              <label key={name} className="text-sm font-medium text-gray-700">
                {label}
                <input
                  className={fieldClass}
                  value={(form as Record<string, string>)[name]}
                  onChange={(event) => {
                    const value = numberFields.has(name) ? normalizeMoneyInput(event.target.value) : event.target.value;
                    setForm((current) => ({ ...current, [name]: value }));
                  }}
                />
              </label>
            ))}
          </FieldGroup>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <label className="text-sm font-medium text-gray-700">
              Observacoes
              <textarea className={textareaClass} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingId ? "Atualizar avaliacao" : "Cadastrar avaliacao"}</Button>
            {editingId && <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(emptyForm()); }}>Cancelar edicao</Button>}
          </div>
        </form>
      </SectionCard>

      {comparison && (
        <SectionCard className="mb-6 p-4">
          <p className="text-sm font-semibold text-ink">Comparacao das duas ultimas avaliacoes do aluno selecionado</p>
          <p className="mt-2 text-sm text-muted">Peso: {comparison.weight.toFixed(2)} kg | IMC: {comparison.bmi.toFixed(2)}</p>
        </SectionCard>
      )}

      {loading ? (
        <LoadingState />
      ) : assessments.length === 0 ? (
        <EmptyState title="Nenhuma avaliacao cadastrada" description="Cadastre a primeira avaliacao para acompanhar a evolucao fisica dos alunos." />
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
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Aluno</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Peso</th>
                  <th className="px-4 py-3">Altura</th>
                  <th className="px-4 py-3">IMC</th>
                  <th className="px-4 py-3">Professor</th>
                  <th className="px-4 py-3">Acao</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((assessment) => (
                  <tr key={assessment.id} className="border-t border-gray-100 hover:bg-gray-50/70">
                    <td className="px-4 py-3 font-medium text-ink">{assessment.student.fullName}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(assessment.assessedAt).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 text-gray-600">{assessment.weightKg} kg</td>
                    <td className="px-4 py-3 text-gray-600">{assessment.heightCm} cm</td>
                    <td className="px-4 py-3"><BmiIndicator value={assessment.bmi} compact /></td>
                    <td className="px-4 py-3 text-gray-600">{assessment.professor?.name ?? "-"}</td>
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
