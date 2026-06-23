"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  Alert,
  Button,
  ConfirmModal,
  EmptyState,
  LoadingState,
  Pagination,
  SectionCard,
  StatusBadge,
  TableToolbar,
  fieldClass,
  textareaClass
} from "@/components/ui";
import { api } from "@/lib/api";
import { formatCpf, formatPhone } from "@/lib/format";

type Student = {
  id: string;
  fullName: string;
  cpf: string;
  birthDate: string;
  email: string;
  phone: string;
  address: string;
  photoUrl?: string | null;
  enrollmentDate: string;
  modality: string;
  notes?: string | null;
  status: "ATIVO" | "INATIVO";
  user?: { id: string; email: string; isActive: boolean } | null;
};

const pageSize = 8;
const modalityOptions = ["LUTA", "MUSCULAÇÃO"];

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
  status: "ATIVO",
  createAccess: false
});

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialStudentForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [page, setPage] = useState(1);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  async function load() {
    const payload = await api<{ students: Student[] }>("/students");
    setStudents(payload.students);
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((student) => {
      const matchesSearch = [student.fullName, student.email, student.phone, student.modality].some((value) =>
        value.toLowerCase().includes(term)
      );
      const matchesStatus = statusFilter === "TODOS" || student.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, students]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const visibleStudents = filteredStudents.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const payload = await api<{ access?: { email: string; temporaryPassword: string } | null }>(
        editingId ? `/students/${editingId}` : "/students",
        {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify(editingId ? { ...form, createAccess: undefined } : form)
        }
      );
      setForm(initialStudentForm());
      setEditingId(null);
      await load();
      if (editingId) {
        setSuccess("Aluno atualizado com sucesso.");
      } else {
        setSuccess(
          payload.access
            ? `Aluno cadastrado com sucesso. Acesso criado: ${payload.access.email} / senha temporaria ${payload.access.temporaryPassword}.`
            : "Aluno cadastrado com sucesso."
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  function editStudent(student: Student) {
    setEditingId(student.id);
    setForm({
      fullName: student.fullName,
      cpf: formatCpf(student.cpf),
      birthDate: student.birthDate.slice(0, 10),
      phone: formatPhone(student.phone),
      address: student.address,
      email: student.email,
      photoUrl: student.photoUrl ?? "",
      enrollmentDate: student.enrollmentDate.slice(0, 10),
      modality: student.modality,
      notes: student.notes ?? "",
      status: student.status,
      createAccess: false
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(initialStudentForm());
    setEditingId(null);
  }

  async function inactivateStudent(student: Student) {
    setError("");
    setSuccess("");
    try {
      await api(`/students/${student.id}`, { method: "DELETE" });
      setStudentToDelete(null);
      await load();
      setSuccess("Aluno inativado com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    }
  }

  return (
    <AppShell>
      <header className="mb-6">
        <p className="text-sm font-semibold text-brand">Cadastros</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Alunos</h1>
        <p className="mt-1 text-sm text-muted">Cadastro com dados pessoais, matricula, modalidade e acesso do aluno.</p>
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
            ["photoUrl", "Foto URL"],
            ["birthDate", "Nascimento"],
            ["enrollmentDate", "Matricula"]
          ].map(([name, label]) => (
            <label key={name} className="text-sm font-medium text-gray-700">
              {label}
              <input
                className={fieldClass}
                type={name.includes("Date") ? "date" : "text"}
                value={String((form as Record<string, unknown>)[name] ?? "")}
                onChange={(event) => {
                  const value = name === "cpf" ? formatCpf(event.target.value) : name === "phone" ? formatPhone(event.target.value) : event.target.value;
                  setForm((current) => ({ ...current, [name]: value }));
                }}
              />
            </label>
          ))}
          <label className="text-sm font-medium text-gray-700">
            Modalidade
            <select className={fieldClass} value={form.modality} onChange={(event) => setForm((current) => ({ ...current, modality: event.target.value }))}>
              <option value="">Selecione</option>
              {modalityOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Status
            <select className={fieldClass} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700 md:col-span-2 xl:col-span-3">
            Observacoes
            <textarea className={textareaClass} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
          </label>
          <label className="flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 md:col-span-2 xl:col-span-3">
            <input
              className="mt-1 h-4 w-4 rounded border-gray-300 text-brand"
              type="checkbox"
              checked={form.createAccess}
              disabled={!!editingId}
              onChange={(event) => setForm((current) => ({ ...current, createAccess: event.target.checked }))}
            />
            <span>
              <span className="block font-semibold text-ink">Criar acesso do aluno</span>
              <span className="block text-muted">{editingId ? "Use o perfil do aluno para criar ou redefinir acesso." : "Cria um usuario ALUNO usando o e-mail informado e uma senha temporaria."}</span>
            </span>
          </label>
          <div className="flex gap-2 md:col-span-2 xl:col-span-3">
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingId ? "Atualizar aluno" : "Cadastrar aluno"}</Button>
            <Button type="button" variant="secondary" onClick={resetForm}>Cancelar</Button>
          </div>
        </form>
      </SectionCard>

      {loading ? (
        <LoadingState />
      ) : students.length === 0 ? (
        <EmptyState title="Nenhum aluno cadastrado" description="Cadastre o primeiro aluno para começar a controlar planos e mensalidades." />
      ) : (
        <SectionCard className="overflow-hidden">
          <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Buscar por nome, e-mail, telefone ou modalidade">
            <label className="w-full text-sm font-medium text-gray-700 sm:w-44">
              Status
              <select className={fieldClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="TODOS">Todos</option>
                <option value="ATIVO">Ativos</option>
                <option value="INATIVO">Inativos</option>
              </select>
            </label>
          </TableToolbar>

          {filteredStudents.length === 0 ? (
            <div className="p-4">
              <EmptyState title="Nenhum aluno encontrado" description="Ajuste a busca ou o filtro para visualizar os alunos cadastrados." />
            </div>
          ) : (
            <>
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
                    {visibleStudents.map((student) => (
                      <tr key={student.id} className="border-t border-gray-100 hover:bg-gray-50/70">
                        <td className="px-4 py-3 font-medium text-ink">
                          <Link href={`/students/${student.id}`} className="hover:text-brand">
                            {student.fullName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{student.email}</td>
                        <td className="px-4 py-3 text-gray-600">{student.phone}</td>
                        <td className="px-4 py-3 text-gray-600">{student.modality}</td>
                        <td className="px-4 py-3"><StatusBadge status={student.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Link href={`/students/${student.id}`} className="inline-flex h-8 items-center rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                              Ver perfil
                            </Link>
                            <Button type="button" variant="secondary" className="h-8 px-3" onClick={() => editStudent(student)}>
                              Editar
                            </Button>
                            {student.status === "ATIVO" && (
                              <Button type="button" variant="danger" className="h-8 px-3" onClick={() => setStudentToDelete(student)}>
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
              <Pagination page={page} totalPages={totalPages} totalItems={filteredStudents.length} onPageChange={setPage} />
            </>
          )}
        </SectionCard>
      )}

      <ConfirmModal
        open={!!studentToDelete}
        title="Inativar aluno"
        description={`O aluno ${studentToDelete?.fullName ?? ""} sera marcado como inativo e o acesso dele sera bloqueado.`}
        confirmLabel="Inativar"
        onCancel={() => setStudentToDelete(null)}
        onConfirm={() => studentToDelete && inactivateStudent(studentToDelete)}
      />
    </AppShell>
  );
}
