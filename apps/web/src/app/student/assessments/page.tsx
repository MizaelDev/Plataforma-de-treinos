"use client";

import { useEffect, useMemo, useState } from "react";
import { BmiIndicator } from "@/components/bmi-indicator";
import { StudentShell } from "@/components/student-shell";
import { Alert, Button, EmptyState, LoadingState, SectionCard } from "@/components/ui";
import { api } from "@/lib/api";
import { appConfig } from "@/lib/app-config";
import type { AssessmentSummary } from "../types";

function formatMeasure(value?: string | null, suffix = "") {
  return value ? `${String(value).replace(".", ",")}${suffix}` : "-";
}

function formatDelta(value: number | null, suffix = "") {
  if (value === null || Number.isNaN(value)) return "-";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2).replace(".", ",")}${suffix}`;
}

const assessmentMeasurements: Array<{ key: keyof AssessmentSummary; label: string; suffix?: string }> = [
  { key: "weightKg", label: "Peso", suffix: " kg" },
  { key: "heightCm", label: "Altura", suffix: " cm" },
  { key: "bodyFatPercentage", label: "% gordura", suffix: "%" },
  { key: "muscleMassKg", label: "Massa muscular", suffix: " kg" },
  { key: "abdominalCircumferenceCm", label: "Abdominal", suffix: " cm" },
  { key: "chestCircumferenceCm", label: "Peitoral", suffix: " cm" },
  { key: "shoulderCircumferenceCm", label: "Ombros", suffix: " cm" },
  { key: "gluteCircumferenceCm", label: "Glúteos", suffix: " cm" },
  { key: "leftArmCircumferenceCm", label: "Braço esquerdo", suffix: " cm" },
  { key: "rightArmCircumferenceCm", label: "Braço direito", suffix: " cm" },
  { key: "leftLegCircumferenceCm", label: "Perna esquerda", suffix: " cm" },
  { key: "rightLegCircumferenceCm", label: "Perna direita", suffix: " cm" },
  { key: "leftCalfCircumferenceCm", label: "Panturrilha esquerda", suffix: " cm" },
  { key: "rightCalfCircumferenceCm", label: "Panturrilha direita", suffix: " cm" },
  { key: "waistCircumferenceCm", label: "Cintura", suffix: " cm" },
  { key: "hipCircumferenceCm", label: "Quadril", suffix: " cm" }
];

const bioimpedanceLabels: Record<string, string> = {
  bodyFatPercentage: "Gordura corporal",
  muscleRate: "Taxa muscular",
  leanBodyMassKg: "Massa corporal magra",
  subcutaneousFatPercentage: "Gordura subcutânea",
  visceralFat: "Gordura visceral",
  bodyWaterPercentage: "Água corporal",
  muscleMassKg: "Massa muscular",
  boneMassKg: "Massa óssea",
  proteinPercentage: "Proteína",
  basalMetabolicRate: "Taxa metabólica basal",
  bodyAge: "Idade do corpo",
  fatMassKg: "Massa gorda",
  waterWeightKg: "Peso da água",
  skeletalMusclePercentage: "Músculo esquelético",
  proteinMassKg: "Massa de proteína",
  idealBodyWeightKg: "Peso corporal ideal",
  obesityLevel: "Nível de obesidade"
};

const anthropometryLabels: Record<string, string> = {
  neckCm: "Pescoço",
  shoulderCm: "Ombro",
  rightArmCm: "Braço direito",
  leftArmCm: "Braço esquerdo",
  rightForearmCm: "Antebraço direito",
  leftForearmCm: "Antebraço esquerdo",
  chestCm: "Tórax",
  waistCm: "Cintura",
  abdomenCm: "Abdômen",
  hipCm: "Quadril",
  rightThighCm: "Coxa direita",
  leftThighCm: "Coxa esquerda",
  rightCalfCm: "Panturrilha direita",
  leftCalfCm: "Panturrilha esquerda"
};

const skinfoldLabels: Record<string, string> = {
  tricepsMm: "Tríceps",
  subscapularMm: "Subescapular",
  chestMm: "Peito/Tórax",
  midaxillaryMm: "Média axilar",
  suprailiacMm: "Supra-ilíaca",
  abdomenMm: "Abdômen",
  thighMm: "Coxa",
  calfMm: "Panturrilha"
};

const physicalTestLabels: Record<string, string> = {
  restingPas: "PAS em repouso",
  restingPad: "PAD em repouso",
  restingFc1: "FC1 em repouso",
  mcardlePas: "PAS McArdle",
  mcardlePad: "PAD McArdle",
  mcardleFc2: "FC2 McArdle",
  sitUpsOneMinute: "Abdominal remador 1 minuto",
  pushUps: "Flexão de braço",
  wellsBenchCm: "Banco de Wells",
  vo2Max: "VO2 máximo"
};

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "-";
}

function formatRecordValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value).replace(".", ",");
}

function formatProfessorName(name?: string | null) {
  if (!name) return "-";
  return name.toLowerCase() === "administrador" ? appConfig.name.replace(" Treinamentos", "") : name;
}

function recordEntries(record?: Record<string, string | number | null> | null, labels: Record<string, string> = {}) {
  return Object.entries(record ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => ({ label: labels[key] ?? key, value }));
}

function DetailGrid({
  title,
  subtitle,
  items
}: {
  title: string;
  subtitle?: string;
  items: Array<{ label: string; value: string | number | null | undefined; suffix?: string }>;
}) {
  const visibleItems = items.filter((item) => item.value !== null && item.value !== undefined && item.value !== "");
  if (visibleItems.length === 0) return null;

  return (
    <section className="rounded-lg border border-[#3b2d24] bg-[#1b1511] p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-orange-100">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-stone-400">{subtitle}</p> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleItems.map((item) => (
          <div key={item.label} className="rounded-md border border-[#3b2d24] bg-[#241c17] p-3">
            <p className="text-xs text-stone-400">{item.label}</p>
            <p className="mt-1 font-semibold text-orange-50">{formatRecordValue(item.value)}{item.suffix ?? ""}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AssessmentDetailsModal({ assessment, onClose }: { assessment: AssessmentSummary; onClose: () => void }) {
  const bioimpedance = recordEntries(assessment.bioimpedance, bioimpedanceLabels);
  const anthropometry = recordEntries(assessment.anthropometry, anthropometryLabels);
  const skinfolds = recordEntries(assessment.skinfolds, skinfoldLabels);
  const physicalTests = recordEntries(assessment.physicalTests, physicalTestLabels);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-4 py-6">
      <div className="mx-auto w-full max-w-5xl rounded-lg border border-[#3b2d24] bg-[#241c17] shadow-2xl">
        <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-[#3b2d24] bg-[#1a130f] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand">Avaliação completa</p>
            <h2 className="mt-1 text-xl font-semibold text-orange-50">{formatDate(assessment.assessedAt)}</h2>
            <p className="mt-1 text-sm text-stone-400">Professor: {formatProfessorName(assessment.professor?.name)}</p>
          </div>
          <div className="flex items-center gap-2">
            <BmiIndicator value={assessment.bmi} />
            <Button type="button" variant="secondary" onClick={onClose}>Fechar</Button>
          </div>
        </div>

        <div className="grid gap-4 p-5">
          <DetailGrid
            title="Dados gerais"
            items={[
              { label: "Data da avaliação", value: formatDate(assessment.assessedAt) },
              { label: "Data de início", value: formatDate(assessment.startDate) },
              { label: "Peso", value: assessment.weightKg, suffix: " kg" },
              { label: "Altura", value: assessment.heightCm, suffix: " cm" },
              { label: "IMC", value: assessment.bmi },
              { label: "% gordura", value: assessment.bodyFatPercentage, suffix: "%" },
              { label: "Massa muscular", value: assessment.muscleMassKg, suffix: " kg" }
            ]}
          />

          {assessment.trainingGoals && assessment.trainingGoals.length > 0 ? (
            <section className="rounded-lg border border-[#3b2d24] bg-[#1b1511] p-4">
              <p className="text-sm font-semibold text-orange-100">Objetivos</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {assessment.trainingGoals.map((goal) => (
                  <span key={goal} className="rounded-full bg-orange-950/45 px-2 py-1 text-xs font-semibold text-orange-200 ring-1 ring-orange-500/40">
                    {goal}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <DetailGrid
            title="Medidas principais"
            items={assessmentMeasurements.map((measurement) => ({
              label: measurement.label,
              value: assessment[measurement.key] as string | null | undefined,
              suffix: measurement.suffix
            }))}
          />

          <DetailGrid title="Bioimpedância" items={bioimpedance.map((item) => ({ ...item }))} />
          <DetailGrid title="Antropometria" subtitle={`Data da medição: ${formatDate(assessment.anthropometryMeasuredAt)}`} items={anthropometry.map((item) => ({ ...item, suffix: " cm" }))} />
          <DetailGrid title="Dobras cutâneas" subtitle={`Data da medição: ${formatDate(assessment.skinfoldsMeasuredAt)}`} items={skinfolds.map((item) => ({ ...item, suffix: " mm" }))} />
          <DetailGrid title="Testes físicos" items={physicalTests.map((item) => ({ ...item }))} />

          {assessment.notes ? (
            <section className="rounded-lg border border-[#3b2d24] bg-[#1b1511] p-4">
              <p className="text-sm font-semibold text-orange-100">Observações</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-stone-300">{assessment.notes}</p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function StudentAssessmentsPage() {
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentSummary | null>(null);

  useEffect(() => {
    api<{ assessments: AssessmentSummary[] }>("/student/assessments")
      .then((payload) => setAssessments(payload.assessments))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const comparison = useMemo(() => {
    if (assessments.length < 2) return null;
    const [latest, previous] = assessments;
    return {
      weight: Number(latest.weightKg) - Number(previous.weightKg),
      bmi: Number(latest.bmi) - Number(previous.bmi),
      bodyFat:
        latest.bodyFatPercentage && previous.bodyFatPercentage
          ? Number(latest.bodyFatPercentage) - Number(previous.bodyFatPercentage)
          : null
    };
  }, [assessments]);

  const evolutionRows = useMemo(
    () =>
      assessments.map((assessment, index) => {
        const previous = assessments[index + 1];
        return {
          assessment,
          weightDelta: previous ? Number(assessment.weightKg) - Number(previous.weightKg) : null,
          bmiDelta: previous ? Number(assessment.bmi) - Number(previous.bmi) : null,
          bodyFatDelta:
            previous?.bodyFatPercentage && assessment.bodyFatPercentage
              ? Number(assessment.bodyFatPercentage) - Number(previous.bodyFatPercentage)
              : null,
          muscleMassDelta:
            previous?.muscleMassKg && assessment.muscleMassKg
              ? Number(assessment.muscleMassKg) - Number(previous.muscleMassKg)
              : null
        };
      }),
    [assessments]
  );

  return (
    <StudentShell>
      <header className="mb-6">
        <p className="text-sm font-semibold text-brand">Evolução</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Minhas avaliações</h1>
        <p className="mt-1 text-sm text-muted">Histórico de medidas, IMC e observações registradas pelo professor.</p>
      </header>

      {error && <Alert type="error" message={error} />}

      {loading ? (
        <LoadingState />
      ) : assessments.length === 0 ? (
        <EmptyState title="Sem avaliações" description="Quando uma avaliação física for cadastrada, ela aparecerá aqui." />
      ) : (
        <div className="grid gap-5">
          {comparison && (
            <SectionCard className="p-5">
              <p className="text-sm font-semibold text-ink">Comparação com a avaliação anterior</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-md bg-gray-50 p-3 text-sm">
                  <p className="text-muted">Peso</p>
                  <p className="mt-1 font-semibold text-ink">{comparison.weight.toFixed(2).replace(".", ",")} kg</p>
                </div>
                <div className="rounded-md bg-gray-50 p-3 text-sm">
                  <p className="text-muted">IMC</p>
                  <p className="mt-1 font-semibold text-ink">{comparison.bmi.toFixed(2).replace(".", ",")}</p>
                </div>
                <div className="rounded-md bg-gray-50 p-3 text-sm">
                  <p className="text-muted">% gordura</p>
                  <p className="mt-1 font-semibold text-ink">{comparison.bodyFat === null ? "-" : `${comparison.bodyFat.toFixed(2).replace(".", ",")}%`}</p>
                </div>
              </div>
            </SectionCard>
          )}

          <SectionCard className="overflow-hidden">
            <div className="border-b border-[#ded7cf] px-5 py-4">
              <p className="text-sm font-semibold text-ink">Histórico de evolução</p>
              <p className="mt-1 text-sm text-muted">Cada avaliação fica salva por data. Quando houver uma nova, a diferença será comparada com a avaliação anterior.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#1a130f] text-xs uppercase tracking-wide text-orange-100">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Peso</th>
                    <th className="px-4 py-3">Var. peso</th>
                    <th className="px-4 py-3">IMC</th>
                    <th className="px-4 py-3">Var. IMC</th>
                    <th className="px-4 py-3">% gordura</th>
                    <th className="px-4 py-3">Var. gordura</th>
                    <th className="px-4 py-3">Massa muscular</th>
                    <th className="px-4 py-3">Var. massa</th>
                  </tr>
                </thead>
                <tbody>
                  {evolutionRows.map(({ assessment, weightDelta, bmiDelta, bodyFatDelta, muscleMassDelta }) => (
                    <tr key={assessment.id} className="border-t border-[#ded7cf]">
                      <td className="px-4 py-3 font-medium text-ink">{new Date(assessment.assessedAt).toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-3 text-gray-700">{formatMeasure(assessment.weightKg, " kg")}</td>
                      <td className="px-4 py-3 text-gray-700">{formatDelta(weightDelta, " kg")}</td>
                      <td className="px-4 py-3 text-gray-700">{formatMeasure(assessment.bmi)}</td>
                      <td className="px-4 py-3 text-gray-700">{formatDelta(bmiDelta)}</td>
                      <td className="px-4 py-3 text-gray-700">{formatMeasure(assessment.bodyFatPercentage, "%")}</td>
                      <td className="px-4 py-3 text-gray-700">{formatDelta(bodyFatDelta, "%")}</td>
                      <td className="px-4 py-3 text-gray-700">{formatMeasure(assessment.muscleMassKg, " kg")}</td>
                      <td className="px-4 py-3 text-gray-700">{formatDelta(muscleMassDelta, " kg")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {assessments.map((assessment) => (
            <SectionCard key={assessment.id} className="p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-ink">{new Date(assessment.assessedAt).toLocaleDateString("pt-BR")}</p>
                  <p className="text-sm text-muted">Professor: {formatProfessorName(assessment.professor?.name)}</p>
                  {assessment.trainingGoals && assessment.trainingGoals.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {assessment.trainingGoals.map((goal) => (
                        <span key={goal} className="rounded-full bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-800 ring-1 ring-orange-200">
                          {goal}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <BmiIndicator value={assessment.bmi} />
                  <Button type="button" variant="secondary" onClick={() => setSelectedAssessment(assessment)}>
                    Ver avaliação completa
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {assessmentMeasurements.map((measurement) => (
                  <div key={measurement.key} className="rounded-md bg-gray-50 p-3">
                    <p className="text-xs text-muted">{measurement.label}</p>
                    <p className="font-semibold text-ink">{formatMeasure(assessment[measurement.key] as string | null | undefined, measurement.suffix)}</p>
                  </div>
                ))}
              </div>

              {assessment.notes && (
                <div className="mt-4 rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700">
                  {assessment.notes}
                </div>
              )}
            </SectionCard>
          ))}
        </div>
      )}

      {selectedAssessment ? (
        <AssessmentDetailsModal assessment={selectedAssessment} onClose={() => setSelectedAssessment(null)} />
      ) : null}
    </StudentShell>
  );
}
