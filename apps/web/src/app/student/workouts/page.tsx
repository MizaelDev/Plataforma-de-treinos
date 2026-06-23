"use client";

import { useEffect, useMemo, useState } from "react";
import { StudentShell } from "@/components/student-shell";
import { Alert, EmptyState, LoadingState, SectionCard, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import type { WorkoutSummary } from "../types";

export default function StudentWorkoutsPage() {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ workouts: WorkoutSummary[] }>("/student/workouts")
      .then((payload) => setWorkouts(payload.workouts))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const activeWorkout = useMemo(() => workouts.find((workout) => workout.isActive) ?? workouts[0], [workouts]);

  return (
    <StudentShell>
      <header className="mb-6">
        <p className="text-sm font-semibold text-gray-700">Treinos</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Minha ficha de treino</h1>
        <p className="mt-1 text-sm text-muted">Visualize seus treinos A-E, exercicios, series, repeticoes e cargas.</p>
      </header>

      {error && <Alert type="error" message={error} />}

      {loading ? (
        <LoadingState />
      ) : !activeWorkout ? (
        <EmptyState title="Sem ficha de treino" description="Quando uma ficha for cadastrada para voce, ela aparecera aqui." />
      ) : (
        <div className="grid gap-5">
          <SectionCard className="p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-ink">{activeWorkout.name}</h2>
                <p className="mt-1 text-sm text-muted">{activeWorkout.goal}</p>
                <p className="mt-2 text-xs text-muted">
                  Inicio {new Date(activeWorkout.startDate).toLocaleDateString("pt-BR")}
                  {activeWorkout.endDate ? ` - Fim ${new Date(activeWorkout.endDate).toLocaleDateString("pt-BR")}` : ""}
                </p>
              </div>
              <StatusBadge status={activeWorkout.isActive ? "ATIVO" : "INATIVO"} />
            </div>
          </SectionCard>

          {activeWorkout.days.map((day) => (
            <SectionCard key={day.label} className="overflow-hidden">
              <div className="border-b border-gray-200 bg-white px-5 py-4">
                <p className="text-base font-semibold text-ink">Treino {day.label}</p>
                <p className="text-sm text-muted">{day.exercises.length} exercicio{day.exercises.length === 1 ? "" : "s"}</p>
              </div>

              {day.exercises.length === 0 ? (
                <div className="p-5">
                  <EmptyState title={`Treino ${day.label} vazio`} description="Nenhum exercicio cadastrado neste treino." />
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {day.exercises.map((exercise, index) => (
                    <div key={`${day.label}-${exercise.name}-${index}`} className="grid gap-3 px-5 py-4 md:grid-cols-[1.3fr_repeat(4,0.7fr)]">
                      <div>
                        <p className="font-semibold text-ink">{index + 1}. {exercise.name}</p>
                        {exercise.notes && <p className="mt-1 text-sm text-muted">{exercise.notes}</p>}
                      </div>
                      <div><p className="text-xs text-muted">Series</p><p className="text-sm font-semibold text-ink">{exercise.sets}</p></div>
                      <div><p className="text-xs text-muted">Repeticoes</p><p className="text-sm font-semibold text-ink">{exercise.repetitions}</p></div>
                      <div><p className="text-xs text-muted">Carga</p><p className="text-sm font-semibold text-ink">{exercise.load || "-"}</p></div>
                      <div><p className="text-xs text-muted">Descanso</p><p className="text-sm font-semibold text-ink">{exercise.restSeconds ? `${exercise.restSeconds}s` : "-"}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          ))}

          {workouts.length > 1 && (
            <SectionCard className="p-5">
              <p className="text-sm font-semibold text-ink">Outras fichas</p>
              <div className="mt-3 grid gap-2">
                {workouts.filter((workout) => workout.id !== activeWorkout.id).map((workout) => (
                  <div key={workout.id} className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2 text-sm">
                    <span className="font-medium text-ink">{workout.name}</span>
                    <StatusBadge status={workout.isActive ? "ATIVO" : "INATIVO"} />
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}
    </StudentShell>
  );
}
