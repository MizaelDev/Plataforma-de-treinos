"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Dumbbell, X } from "lucide-react";
import { ExerciseMedia } from "@/components/exercise-media";
import { StudentShell } from "@/components/student-shell";
import { Alert, Button, EmptyState, LoadingState, SectionCard, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import type { ExerciseSummary, WorkoutSummary } from "../types";

const dayLabels = ["A", "B", "C", "D", "E"] as const;

function isMobilityExercise(exercise: ExerciseSummary) {
  const library = exercise.libraryExercise;
  const values = [library?.modality, library?.category, library?.muscleGroup, exercise.name].filter(Boolean).join(" ").toLowerCase();
  return values.includes("mobilidade");
}

function ExerciseStat({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-md bg-gray-50 px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink">{value || "-"}</p>
    </div>
  );
}

function ExerciseCard({ exercise, index, onOpen }: { exercise: ExerciseSummary; index: number; onOpen: (exercise: ExerciseSummary) => void }) {
  const library = exercise.libraryExercise;
  const mobility = isMobilityExercise(exercise);

  return (
    <article className={`overflow-hidden rounded-lg border bg-[#fffdfa] shadow-sm shadow-stone-900/5 ${mobility ? "border-orange-200 ring-1 ring-orange-100" : "border-[#ded7cf]"}`}>
      <div className="grid gap-0 lg:grid-cols-[minmax(260px,0.8fr)_1fr]">
        <div className="bg-gray-50 p-3">
          <ExerciseMedia
            compact
            title={exercise.name}
            mediaType={library?.mediaType}
            mediaUrl={library?.mediaUrl}
            thumbnailUrl={library?.thumbnailUrl}
            onOpen={() => onOpen(exercise)}
          />
        </div>

        <div className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">#{index + 1}</span>
                {mobility ? <StatusBadge status="Mobilidade" /> : null}
                {library?.difficultyLevel ? <StatusBadge status={library.difficultyLevel} /> : null}
              </div>
              <h3 className="mt-2 text-lg font-semibold text-ink">{exercise.name}</h3>
              {library?.muscleGroup ? <p className="mt-1 text-sm text-muted">{library.muscleGroup}</p> : null}
            </div>
            <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => onOpen(exercise)}>
              Ver detalhes
            </Button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <ExerciseStat label="Series" value={exercise.sets} />
            <ExerciseStat label="Repeticoes" value={exercise.repetitions} />
            <ExerciseStat label="Carga" value={exercise.load} />
            <ExerciseStat label="Descanso" value={exercise.restSeconds ? `${exercise.restSeconds}s` : null} />
          </div>

          {exercise.notes ? (
            <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
              <p className="font-semibold text-ink">Observações do professor</p>
              <p className="mt-1 text-muted">{exercise.notes}</p>
            </div>
          ) : null}

          {library?.executionInstructions ? (
            <div className="mt-4 text-sm">
              <p className="font-semibold text-ink">Execucao</p>
              <p className="mt-1 text-muted">{library.executionInstructions}</p>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ExerciseDetailsModal({ exercise, onClose }: { exercise: ExerciseSummary; onClose: () => void }) {
  const library = exercise.libraryExercise;
  const mobility = isMobilityExercise(exercise);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-0 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0" aria-label="Fechar detalhes" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-lg bg-white shadow-xl sm:mx-auto sm:max-w-5xl sm:rounded-lg">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-4 py-3 sm:px-5">
          <div>
            <div className="flex flex-wrap gap-2">
              {mobility ? <StatusBadge status="Mobilidade" /> : null}
              {library?.modality ? <StatusBadge status={library.modality} /> : null}
              {library?.difficultyLevel ? <StatusBadge status={library.difficultyLevel} /> : null}
            </div>
            <h2 className="mt-2 text-xl font-semibold text-ink">{exercise.name}</h2>
            {library?.muscleGroup ? <p className="text-sm text-muted">{library.muscleGroup}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-gray-500 hover:bg-gray-100" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1.1fr_0.9fr]">
          <ExerciseMedia
            title={exercise.name}
            mediaType={library?.mediaType}
            mediaUrl={library?.mediaUrl}
            thumbnailUrl={library?.thumbnailUrl}
          />

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <ExerciseStat label="Series" value={exercise.sets} />
              <ExerciseStat label="Repeticoes" value={exercise.repetitions} />
              <ExerciseStat label="Carga" value={exercise.load} />
              <ExerciseStat label="Descanso" value={exercise.restSeconds ? `${exercise.restSeconds}s` : null} />
            </div>

            {library?.description ? (
              <section>
                <p className="text-sm font-semibold text-ink">Descrição</p>
                <p className="mt-1 text-sm text-muted">{library.description}</p>
              </section>
            ) : null}

            {library?.executionInstructions ? (
              <section>
                <p className="text-sm font-semibold text-ink">Execucao</p>
                <p className="mt-1 text-sm text-muted">{library.executionInstructions}</p>
              </section>
            ) : null}

            {library?.commonMistakes ? (
              <section className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                  <AlertTriangle className="h-4 w-4" />
                  Principais erros
                </div>
                <p className="mt-1 text-sm text-amber-900">{library.commonMistakes}</p>
              </section>
            ) : null}

            {exercise.notes ? (
              <section className="rounded-md border border-gray-200 bg-gray-50 p-3">
                <p className="text-sm font-semibold text-ink">Observações do professor</p>
                <p className="mt-1 text-sm text-muted">{exercise.notes}</p>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentWorkoutsPage() {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [selectedDay, setSelectedDay] = useState<(typeof dayLabels)[number]>("A");
  const [selectedExercise, setSelectedExercise] = useState<ExerciseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ workouts: WorkoutSummary[] }>("/student/workouts")
      .then((payload) => setWorkouts(payload.workouts))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const activeWorkout = useMemo(() => workouts.find((workout) => workout.isActive) ?? workouts[0], [workouts]);
  const activeDay = useMemo(() => activeWorkout?.days.find((day) => day.label === selectedDay) ?? activeWorkout?.days[0], [activeWorkout, selectedDay]);

  useEffect(() => {
    if (activeWorkout && !activeWorkout.days.some((day) => day.label === selectedDay)) {
      setSelectedDay(activeWorkout.days[0]?.label ?? "A");
    }
  }, [activeWorkout, selectedDay]);

  return (
    <StudentShell>
      <header className="mb-6">
        <p className="text-sm font-semibold text-gray-700">Treinos</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Minha ficha de treino</h1>
        <p className="mt-1 text-sm text-muted">Treinos, exercícios, cargas e demonstrações em video, GIF ou imagem.</p>
      </header>

      {error && <Alert type="error" message={error} />}

      {loading ? (
        <LoadingState />
      ) : !activeWorkout ? (
        <EmptyState title="Sem ficha de treino" description="Quando uma ficha for cadastrada para você, ela aparecera aqui." />
      ) : (
        <div className="grid gap-5">
          <SectionCard className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-brand" />
                  <h2 className="text-xl font-semibold text-ink">{activeWorkout.name}</h2>
                </div>
                <p className="mt-1 text-sm text-muted">{activeWorkout.goal}</p>
                <p className="mt-2 text-xs text-muted">
                  Início {new Date(activeWorkout.startDate).toLocaleDateString("pt-BR")}
                  {activeWorkout.endDate ? ` - Fim ${new Date(activeWorkout.endDate).toLocaleDateString("pt-BR")}` : ""}
                </p>
              </div>
              <StatusBadge status={activeWorkout.isActive ? "ATIVO" : "INATIVO"} />
            </div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
              {dayLabels.map((label) => {
                const day = activeWorkout.days.find((item) => item.label === label);
                const active = activeDay?.label === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setSelectedDay(label)}
                    className={`min-w-24 rounded-md border px-3 py-2 text-left text-sm font-semibold transition ${
                      active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Treino {label}
                    <span className={`mt-0.5 block text-xs ${active ? "text-gray-300" : "text-muted"}`}>{day?.exercises.length ?? 0} exerc.</span>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard className="overflow-hidden">
            <div className="border-b border-gray-200 bg-white px-5 py-4">
              <p className="text-base font-semibold text-ink">Treino {activeDay?.label ?? selectedDay}</p>
              <p className="text-sm text-muted">{activeDay?.exercises.length ?? 0} exercício{activeDay?.exercises.length === 1 ? "" : "s"}</p>
            </div>

            {!activeDay || activeDay.exercises.length === 0 ? (
              <div className="p-5">
                <EmptyState title={`Treino ${activeDay?.label ?? selectedDay} vazio`} description="Nenhum exercício cadastrado neste treino." />
              </div>
            ) : (
              <div className="grid gap-4 p-4 sm:p-5">
                {activeDay.exercises.map((exercise, index) => (
                  <ExerciseCard key={`${activeDay.label}-${exercise.name}-${index}`} exercise={exercise} index={index} onOpen={setSelectedExercise} />
                ))}
              </div>
            )}
          </SectionCard>

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

      {selectedExercise ? <ExerciseDetailsModal exercise={selectedExercise} onClose={() => setSelectedExercise(null)} /> : null}
    </StudentShell>
  );
}
