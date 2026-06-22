"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Alert, Button, EmptyState, LoadingState, SectionCard, StatusBadge, fieldClass, textareaClass } from "@/components/ui";
import { api } from "@/lib/api";
import { formatCpf, formatPhone } from "@/lib/format";

type Student = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  modality: string;
  status: "ATIVO" | "INATIVO";
};

const initialStudentForm = () => ({
  fullName: "",
  cpf: "",
  birthDate: "",
  phone: "",
  address: "",
  email: "",
  photoUrl: "",
  enrollmentDate: new Date().toISOString().slice(0, 10),
  modality: "",
  notes: "",
  status: "ATIVO"
});

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialStudentForm);

  async function load() {
    const payload = await api<{ students: Student[] }>("/students");
    setStudents(payload.students);
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await api("/students", { method: "POST", body: JSON.stringify(form) });
      setForm(initialStudentForm());
      await load();
      setSuccess("Aluno cadastrado com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteStudent(student: Student) {
    const confirmed = window.confirm(`Excluir o aluno ${student.fullName}?`);
    if (!confirmed) return;

    setError("");
    setSuccess("");
    try {
      await api(`/students/${student.id}`, { method: "DELETE" });
      await load();
      setSuccess("Aluno excluido da listagem.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    }
  }

  return (
    <AppShell>
      <header className="mb-6">
        <p className="text-sm font-semibold text-brand">Cadastros</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Alunos</h1>
        <p className="mt-1 text-sm text-muted">Cadastro inicial com dados pessoais, matricula e modalidade.</p>
      </header>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <SectionCard className="mb-6 p-4">
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          ["fullName", "Nome completo"],
          ["cpf", "CPF"],
          ["phone", "Telefone"],
          ["address", "Endereco"],
          ["email", "E-mail"],
          ["modality", "Modalidade"],
          ["photoUrl", "Foto URL"],
          ["birthDate", "Nascimento"],
          ["enrollmentDate", "Matricula"]
        ].map(([name, label]) => (
          <label key={name} className="text-sm font-medium text-gray-700">
            {label}
            <input
              className={fieldClass}
              type={name.includes("Date") ? "date" : "text"}
              value={(form as Record<string, string>)[name]}
              onChange={(event) => {
                const value = name === "cpf" ? formatCpf(event.target.value) : name === "phone" ? formatPhone(event.target.value) : event.target.value;
                setForm((current) => ({ ...current, [name]: value }));
              }}
            />
          </label>
        ))}
        <label className="text-sm font-medium text-gray-700 md:col-span-2 xl:col-span-3">
          Observacoes
          <textarea
            className={textareaClass}
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          />
        </label>
        <div className="md:col-span-2 xl:col-span-3">
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Cadastrar aluno"}</Button>
        </div>
      </form>
      </SectionCard>

      {loading ? (
        <LoadingState />
      ) : students.length === 0 ? (
        <EmptyState title="Nenhum aluno cadastrado" description="Cadastre o primeiro aluno para começar a controlar planos e mensalidades." />
      ) : (
      <SectionCard className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Modalidade</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Acao</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-t border-gray-100 hover:bg-gray-50/70">
                <td className="px-4 py-3 font-medium text-ink">{student.fullName}</td>
                <td className="px-4 py-3 text-gray-600">{student.email}</td>
                <td className="px-4 py-3 text-gray-600">{student.phone}</td>
                <td className="px-4 py-3 text-gray-600">{student.modality}</td>
                <td className="px-4 py-3"><StatusBadge status={student.status} /></td>
                <td className="px-4 py-3">
                  <Button
                    type="button"
                    variant="danger"
                    className="h-8 px-3"
                    onClick={() => deleteStudent(student)}
                  >
                    Excluir
                  </Button>
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
