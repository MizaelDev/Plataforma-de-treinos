"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Alert, Button, EmptyState, LoadingState, MobileRecordCard, SectionCard, StatusBadge, fieldClass, textareaClass } from "@/components/ui";
import { api } from "@/lib/api";

type Student = { id: string; fullName: string };
type ExerciseMediaType = "IMAGE" | "GIF" | "VIDEO" | "EXTERNAL_URL";
type LibraryExercise = {
  id: string;
  name: string;
  category: string;
  modality: string;
  muscleGroup?: string | null;
  description?: string | null;
  executionInstructions?: string | null;
  commonMistakes?: string | null;
  difficultyLevel: string;
  mediaType: ExerciseMediaType;
  mediaUrl: string;
  thumbnailUrl?: string | null;
};
type ExerciseForm = {
  libraryExerciseId: string;
  libraryExercise?: LibraryExercise | null;
  name: string;
  sets: string;
  repetitions: string;
  load: string;
  restSeconds: string;
  notes: string;
  order: string;
};
type WorkoutDayForm = { label: "A" | "B" | "C" | "D" | "E"; exercises: ExerciseForm[] };
type Workout = {
  id: string;
  studentId: string;
  student: Student;
  professor?: { id: string; name: string } | null;
  name: string;
  goal: string;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  days: WorkoutDayForm[];
};

const labels = ["A", "B", "C", "D", "E"] as const;
const today = () => new Date().toISOString().slice(0, 10);
const emptyExercise = (): ExerciseForm => ({ libraryExerciseId: "", name: "", sets: "3", repetitions: "10", load: "", restSeconds: "", notes: "", order: "1" });
const emptyDays = (): WorkoutDayForm[] => labels.map((label) => ({ label, exercises: [] }));
const emptyForm = () => ({ studentId: "", name: "", goal: "", startDate: today(), endDate: "", isActive: true, days: emptyDays() });

export default function WorkoutsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [libraryExercises, setLibraryExercises] = useState<LibraryExercise[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedDay, setSelectedDay] = useState<(typeof labels)[number]>("A");
  const [exerciseForm, setExerciseForm] = useState(emptyExercise);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [studentsPayload, workoutsPayload, exercisesPayload] = await Promise.all([
      api<{ students: Student[] }>("/students"),
      api<{ workouts: Workout[] }>("/workouts"),
      api<{ exercises: LibraryExercise[] }>("/exercises?active=true")
    ]);
    setStudents(studentsPayload.students);
    setWorkouts(workoutsPayload.workouts);
    setLibraryExercises(exercisesPayload.exercises);
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function addExercise() {
    if (!exerciseForm.name.trim()) {
      setError("Informe o nome do exercício.");
      return;
    }

    setError("");
    setForm((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.label === selectedDay
          ? {
              ...day,
              exercises: [...day.exercises, { ...exerciseForm, libraryExercise: libraryExercises.find((item) => item.id === exerciseForm.libraryExerciseId) ?? null, order: String(day.exercises.length + 1) }]
            }
          : day
      )
    }));
    setExerciseForm(emptyExercise());
  }

  function removeExercise(label: string, index: number) {
    setForm((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.label === label ? { ...day, exercises: day.exercises.filter((_, exerciseIndex) => exerciseIndex !== index) } : day
      )
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      await api(editingId ? `/workouts/${editingId}` : "/workouts", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      setForm(emptyForm());
      setEditingId(null);
      await load();
      setSuccess(editingId ? "Ficha atualizada com sucesso." : "Ficha criada com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  function editWorkout(workout: Workout) {
    setEditingId(workout.id);
    setForm({
      studentId: workout.studentId,
      name: workout.name,
      goal: workout.goal,
      startDate: workout.startDate.slice(0, 10),
      endDate: workout.endDate ? workout.endDate.slice(0, 10) : "",
      isActive: workout.isActive,
      days: labels.map((label) => {
        const day = workout.days.find((item) => item.label === label);
        return {
          label,
          exercises: (day?.exercises ?? []).map((exercise, index) => ({
            name: exercise.name,
            libraryExerciseId: exercise.libraryExerciseId ?? "",
            libraryExercise: exercise.libraryExercise ?? null,
            sets: String(exercise.sets),
            repetitions: exercise.repetitions,
            load: exercise.load ?? "",
            restSeconds: exercise.restSeconds ? String(exercise.restSeconds) : "",
            notes: exercise.notes ?? "",
            order: String(exercise.order || index + 1)
          }))
        };
      })
    });
  }

  async function inactivateWorkout(id: string) {
    if (!window.confirm("Inativar esta ficha de treino?")) return;
    setError("");
    setSuccess("");
    try {
      await api(`/workouts/${id}`, { method: "DELETE" });
      await load();
      setSuccess("Ficha inativada com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    }
  }

  const selectedExercises = form.days.find((day) => day.label === selectedDay)?.exercises ?? [];
  const selectedLibraryExercise = libraryExercises.find((exercise) => exercise.id === exerciseForm.libraryExerciseId) ?? null;

  function selectLibraryExercise(id: string) {
    const selected = libraryExercises.find((exercise) => exercise.id === id);
    setExerciseForm((current) => ({
      ...current,
      libraryExerciseId: id,
      libraryExercise: selected ?? null,
      name: selected?.name ?? "",
      notes: selected?.executionInstructions || selected?.description || current.notes
    }));
  }

  return (
    <AppShell>
      <header className="mb-6">
        <p className="text-sm font-semibold text-brand">Prescrição</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Fichas de treino</h1>
        <p className="mt-1 text-sm text-muted">Crie fichas por aluno com treinos A-E e exercícios ordenados.</p>
      </header>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <SectionCard className="mb-6 p-4">
        <form onSubmit={submit} className="grid gap-4 lg:grid-cols-4">
          <label className="text-sm font-medium text-gray-700">
            Aluno
            <select className={fieldClass} value={form.studentId} onChange={(event) => setForm((current) => ({ ...current, studentId: event.target.value }))}>
              <option value="">Selecione</option>
              {students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Nome da ficha
            <input className={fieldClass} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Início
            <input className={fieldClass} type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Fim
            <input className={fieldClass} type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} />
          </label>
          <label className="text-sm font-medium text-gray-700 lg:col-span-3">
            Objetivo do treino
            <input className={fieldClass} value={form.goal} onChange={(event) => setForm((current) => ({ ...current, goal: event.target.value }))} />
          </label>
          <label className="flex items-end gap-2 text-sm font-medium text-gray-700">
            <input
              className="mb-3 h-4 w-4 rounded border-gray-300 text-brand"
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
            />
            <span className="mb-2">Ficha ativa</span>
          </label>

          <div className="lg:col-span-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {labels.map((label) => (
                <Button key={label} type="button" variant={selectedDay === label ? "primary" : "secondary"} className="h-9 px-3" onClick={() => setSelectedDay(label)}>
                  Treino {label}
                </Button>
              ))}
            </div>

            <div className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 md:grid-cols-6">
              <select className={`${fieldClass} md:col-span-2`} value={exerciseForm.libraryExerciseId} onChange={(event) => selectLibraryExercise(event.target.value)}>
                <option value="">Digitar exercício manualmente</option>
                {libraryExercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>{exercise.name} - {exercise.category}</option>
                ))}
              </select>
              <input className={fieldClass} placeholder="Exercício" value={exerciseForm.name} onChange={(event) => setExerciseForm((current) => ({ ...current, name: event.target.value }))} />
              <input className={fieldClass} placeholder="Séries" value={exerciseForm.sets} onChange={(event) => setExerciseForm((current) => ({ ...current, sets: event.target.value }))} />
              <input className={fieldClass} placeholder="Repetições" value={exerciseForm.repetitions} onChange={(event) => setExerciseForm((current) => ({ ...current, repetitions: event.target.value }))} />
              <input className={fieldClass} placeholder="Carga" value={exerciseForm.load} onChange={(event) => setExerciseForm((current) => ({ ...current, load: event.target.value }))} />
              <input className={fieldClass} placeholder="Descanso (s)" value={exerciseForm.restSeconds} onChange={(event) => setExerciseForm((current) => ({ ...current, restSeconds: event.target.value }))} />
              <Button type="button" variant="secondary" onClick={addExercise}>Adicionar</Button>
              {selectedLibraryExercise && (
                <div className="rounded-md border border-gray-200 bg-white p-3 text-sm md:col-span-6">
                  <p className="font-semibold text-ink">{selectedLibraryExercise.name}</p>
                  <p className="mt-1 text-muted">{selectedLibraryExercise.description || selectedLibraryExercise.executionInstructions || "Exercício selecionado da biblioteca."}</p>
                  <p className="mt-2 text-xs font-semibold text-brand">{selectedLibraryExercise.mediaType} - {selectedLibraryExercise.mediaUrl}</p>
                </div>
              )}
              <textarea className={`${textareaClass} md:col-span-6`} placeholder="Observações do exercício" value={exerciseForm.notes} onChange={(event) => setExerciseForm((current) => ({ ...current, notes: event.target.value }))} />
            </div>

            <div className="mt-3 space-y-2">
              {selectedExercises.length === 0 ? (
                <p className="rounded-md border border-dashed border-gray-200 px-3 py-2 text-sm text-muted">Nenhum exercício no Treino {selectedDay}.</p>
              ) : (
                selectedExercises.map((exercise, index) => (
                  <div key={`${exercise.name}-${index}`} className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
                    <span className="font-medium text-ink">{index + 1}. {exercise.name}{exercise.libraryExerciseId ? <span className="ml-2 text-xs text-brand">Biblioteca</span> : null}</span>
                    <span className="text-muted">{exercise.sets}x {exercise.repetitions} {exercise.load ? `| ${exercise.load}` : ""}</span>
                    <Button type="button" variant="danger" className="h-8 px-3" onClick={() => removeExercise(selectedDay, index)}>Remover</Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-2 lg:col-span-4">
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingId ? "Atualizar ficha" : "Criar ficha"}</Button>
            {editingId && <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(emptyForm()); }}>Cancelar edição</Button>}
          </div>
        </form>
      </SectionCard>

      {loading ? (
        <LoadingState />
      ) : workouts.length === 0 ? (
        <EmptyState title="Nenhuma ficha cadastrada" description="Crie uma ficha para organizar treinos A-E e acompanhar a prescrição do aluno." />
      ) : (
        <SectionCard className="overflow-hidden">
          <div className="grid gap-3 p-4 md:hidden">
            {workouts.map((workout) => (
              <MobileRecordCard key={workout.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{workout.name}</p>
                    <p className="mt-1 text-sm text-muted">{workout.student.fullName}</p>
                  </div>
                  <StatusBadge status={workout.isActive ? "ATIVO" : "INATIVO"} />
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div><p className="text-xs text-muted">Objetivo</p><p className="font-medium text-ink">{workout.goal}</p></div>
                  <div><p className="text-xs text-muted">Período</p><p className="font-medium text-ink">{new Date(workout.startDate).toLocaleDateString("pt-BR")} - {workout.endDate ? new Date(workout.endDate).toLocaleDateString("pt-BR") : "sem fim"}</p></div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Button type="button" variant="secondary" onClick={() => editWorkout(workout)}>Editar</Button>
                  <Button type="button" variant="danger" onClick={() => inactivateWorkout(workout.id)}>Inativar</Button>
                </div>
              </MobileRecordCard>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Ficha</th>
                  <th className="px-4 py-3">Aluno</th>
                  <th className="px-4 py-3">Objetivo</th>
                  <th className="px-4 py-3">Período</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ação</th>
                </tr>
              </thead>
              <tbody>
                {workouts.map((workout) => (
                  <tr key={workout.id} className="border-t border-gray-100 hover:bg-gray-50/70">
                    <td className="px-4 py-3 font-medium text-ink">{workout.name}</td>
                    <td className="px-4 py-3 text-gray-600">{workout.student.fullName}</td>
                    <td className="px-4 py-3 text-gray-600">{workout.goal}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(workout.startDate).toLocaleDateString("pt-BR")} - {workout.endDate ? new Date(workout.endDate).toLocaleDateString("pt-BR") : "sem fim"}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={workout.isActive ? "ATIVO" : "INATIVO"} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button type="button" variant="secondary" className="h-8 px-3" onClick={() => editWorkout(workout)}>Editar</Button>
                        <Button type="button" variant="danger" className="h-8 px-3" onClick={() => inactivateWorkout(workout.id)}>Inativar</Button>
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
