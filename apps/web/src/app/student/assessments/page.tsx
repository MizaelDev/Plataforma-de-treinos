"use client";

import { useEffect, useMemo, useState } from "react";
import { StudentShell } from "@/components/student-shell";
import { Alert, EmptyState, LoadingState, SectionCard } from "@/components/ui";
import { api } from "@/lib/api";
import type { AssessmentSummary } from "../types";

function formatMeasure(value?: string | null, suffix = "") {
  return value ? `${String(value).replace(".", ",")}${suffix}` : "-";
}

export default function StudentAssessmentsPage() {
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <StudentShell>
      <header className="mb-6">
        <p className="text-sm font-semibold text-gray-700">Evolucao</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Minhas avaliacoes</h1>
        <p className="mt-1 text-sm text-muted">Historico de medidas, IMC e observacoes registradas pelo professor.</p>
      </header>

      {error && <Alert type="error" message={error} />}

      {loading ? (
        <LoadingState />
      ) : assessments.length === 0 ? (
        <EmptyState title="Sem avaliacoes" description="Quando uma avaliacao fisica for cadastrada, ela aparecera aqui." />
      ) : (
        <div className="grid gap-5">
          {comparison && (
            <SectionCard className="p-5">
              <p className="text-sm font-semibold text-ink">Comparacao com a avaliacao anterior</p>
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

          {assessments.map((assessment) => (
            <SectionCard key={assessment.id} className="p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-ink">{new Date(assessment.assessedAt).toLocaleDateString("pt-BR")}</p>
                  <p className="text-sm text-muted">Professor: {assessment.professor?.name ?? "-"}</p>
                </div>
                <div className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white">IMC {formatMeasure(assessment.bmi)}</div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md bg-gray-50 p-3"><p className="text-xs text-muted">Peso</p><p className="font-semibold text-ink">{formatMeasure(assessment.weightKg, " kg")}</p></div>
                <div className="rounded-md bg-gray-50 p-3"><p className="text-xs text-muted">Altura</p><p className="font-semibold text-ink">{formatMeasure(assessment.heightCm, " cm")}</p></div>
                <div className="rounded-md bg-gray-50 p-3"><p className="text-xs text-muted">% gordura</p><p className="font-semibold text-ink">{formatMeasure(assessment.bodyFatPercentage, "%")}</p></div>
                <div className="rounded-md bg-gray-50 p-3"><p className="text-xs text-muted">Massa muscular</p><p className="font-semibold text-ink">{formatMeasure(assessment.muscleMassKg, " kg")}</p></div>
                <div className="rounded-md bg-gray-50 p-3"><p className="text-xs text-muted">Abdominal</p><p className="font-semibold text-ink">{formatMeasure(assessment.abdominalCircumferenceCm, " cm")}</p></div>
                <div className="rounded-md bg-gray-50 p-3"><p className="text-xs text-muted">Braco</p><p className="font-semibold text-ink">{formatMeasure(assessment.armCircumferenceCm, " cm")}</p></div>
                <div className="rounded-md bg-gray-50 p-3"><p className="text-xs text-muted">Cintura</p><p className="font-semibold text-ink">{formatMeasure(assessment.waistCircumferenceCm, " cm")}</p></div>
                <div className="rounded-md bg-gray-50 p-3"><p className="text-xs text-muted">Quadril</p><p className="font-semibold text-ink">{formatMeasure(assessment.hipCircumferenceCm, " cm")}</p></div>
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
    </StudentShell>
  );
}
