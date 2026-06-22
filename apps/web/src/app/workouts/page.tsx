"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Alert, Button, EmptyState, LoadingState, SectionCard, StatusBadge, fieldClass, textareaClass } from "@/components/ui";
import { api } from "@/lib/api";

type Student = { id: string; fullName: string };
type ExerciseForm = { name: string; sets: string; repetitions: string; load: string; restSeconds: string; notes: string; order: string };
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
const emptyExercise = (): ExerciseForm => ({ name: "", sets: "3", repetitions: "10", load: "", restSeconds: "", notes: "", order: "1" });
const emptyDays = (): WorkoutDayForm[] => labels.map((label) => ({ label, exercises: [] }));
const emptyForm = () => ({ studentId: "", name: "", goal: "", startDate: today(), endDate: "", isActive: true, days: emptyDays() });

export default function WorkoutsPage() {
  const [students, setStudents] = useState<Student[]>([]);
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
    const [studentsPayload, workoutsPayload] = await Promise.all([
      api<{ students: Student[] }>("/students"),
      api<{ workouts: Workout[] }>("/workouts")
    ]);
    setStudents(studentsPayload.students);
    setWorkouts(workoutsPayload.workouts);
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function addExercise() {
    if (!exerciseForm.name.trim()) {
      setError("Informe o nome do exercicio.");
      return;
    }

    setError("");
    setForm((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.label === selectedDay
          ? {
              ...day,
              exercises: [...day.exercises, { ...exerciseForm, order: String(day.exercises.length + 1) }]
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

  return (
    <AppShell>
      <header className="mb-6">
        <p className="text-sm font-semibold text-brand">Prescricao</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Fichas de treino</h1>
        <p className="mt-1 text-sm text-muted">Crie fichas por aluno com treinos A-E e exercicios ordenados.</p>
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
            Inicio
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
              <input className={fieldClass} placeholder="Exercicio" value={exerciseForm.name} onChange={(event) => setExerciseForm((current) => ({ ...current, name: event.target.value }))} />
              <input className={fieldClass} placeholder="Series" value={exerciseForm.sets} onChange={(event) => setExerciseForm((current) => ({ ...current, sets: event.target.value }))} />
              <input className={fieldClass} placeholder="Repeticoes" value={exerciseForm.repetitions} onChange={(event) => setExerciseForm((current) => ({ ...current, repetitions: event.target.value }))} />
              <input className={fieldClass} placeholder="Carga" value={exerciseForm.load} onChange={(event) => setExerciseForm((current) => ({ ...current, load: event.target.value }))} />
              <input className={fieldClass} placeholder="Descanso (s)" value={exerciseForm.restSeconds} onChange={(event) => setExerciseForm((current) => ({ ...current, restSeconds: event.target.value }))} />
              <Button type="button" variant="secondary" onClick={addExercise}>Adicionar</Button>
              <textarea className={`${textareaClass} md:col-span-6`} placeholder="Observacoes do exercicio" value={exerciseForm.notes} onChange={(event) => setExerciseForm((current) => ({ ...current, notes: event.target.value }))} />
            </div>

            <div className="mt-3 space-y-2">
              {selectedExercises.length === 0 ? (
                <p className="rounded-md border border-dashed border-gray-200 px-3 py-2 text-sm text-muted">Nenhum exercicio no Treino {selectedDay}.</p>
              ) : (
                selectedExercises.map((exercise, index) => (
                  <div key={`${exercise.name}-${index}`} className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
                    <span className="font-medium text-ink">{index + 1}. {exercise.name}</span>
                    <span className="text-muted">{exercise.sets}x {exercise.repetitions} {exercise.load ? `| ${exercise.load}` : ""}</span>
                    <Button type="button" variant="danger" className="h-8 px-3" onClick={() => removeExercise(selectedDay, index)}>Remover</Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-2 lg:col-span-4">
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingId ? "Atualizar ficha" : "Criar ficha"}</Button>
            {editingId && <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(emptyForm()); }}>Cancelar edicao</Button>}
          </div>
        </form>
      </SectionCard>

      {loading ? (
        <LoadingState />
      ) : workouts.length === 0 ? (
        <EmptyState title="Nenhuma ficha cadastrada" description="Crie uma ficha para organizar treinos A-E e acompanhar a prescricao do aluno." />
      ) : (
        <SectionCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Ficha</th>
                  <th className="px-4 py-3">Aluno</th>
                  <th className="px-4 py-3">Objetivo</th>
                  <th className="px-4 py-3">Periodo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Acao</th>
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
