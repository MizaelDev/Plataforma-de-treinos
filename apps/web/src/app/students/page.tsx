"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  Alert,
  Button,
  ConfirmModal,
  EmptyState,
  LoadingState,
  MobileRecordCard,
  Pagination,
  SectionCard,
  StatusBadge,
  TableToolbar,
  fieldClass
} from "@/components/ui";
import { api } from "@/lib/api";

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

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
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
        <p className="text-sm font-semibold text-brand">Consulta</p>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Alunos</h1>
            <p className="mt-1 text-sm text-muted">Local para consultar dados, perfil, planos, mensalidades e histórico dos alunos.</p>
          </div>
          <Link href="/enrollments" className="inline-flex h-10 items-center justify-center rounded-md bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800">
            Nova matrícula
          </Link>
        </div>
      </header>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      {loading ? (
        <LoadingState />
      ) : students.length === 0 ? (
        <EmptyState
          title="Nenhum aluno cadastrado"
          description="Use Nova Matrícula para cadastrar o primeiro aluno com plano e mensalidade inicial."
          action={<Link href="/enrollments" className="inline-flex h-10 items-center justify-center rounded-md bg-gray-900 px-4 text-sm font-semibold text-white">Nova matrícula</Link>}
        />
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
              <div className="grid gap-3 p-4 md:hidden">
                {visibleStudents.map((student) => (
                  <MobileRecordCard key={student.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link href={`/students/${student.id}`} className="font-semibold text-ink hover:text-brand">{student.fullName}</Link>
                        <p className="mt-1 text-sm text-muted">{student.email}</p>
                      </div>
                      <StatusBadge status={student.status} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-xs text-muted">Telefone</p><p className="font-medium text-ink">{student.phone}</p></div>
                      <div><p className="text-xs text-muted">Modalidade</p><p className="font-medium text-ink">{student.modality}</p></div>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <Link href={`/students/${student.id}`} className="inline-flex h-10 items-center justify-center rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                        Ver detalhes
                      </Link>
                      {student.status === "ATIVO" && <Button type="button" variant="danger" onClick={() => setStudentToDelete(student)}>Inativar</Button>}
                    </div>
                  </MobileRecordCard>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">E-mail</th>
                      <th className="px-4 py-3">Telefone</th>
                      <th className="px-4 py-3">Modalidade</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Ação</th>
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
                              Ver detalhes
                            </Link>
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
        description={`O aluno ${studentToDelete?.fullName ?? ""} será marcado como inativo e o acesso dele será bloqueado.`}
        confirmLabel="Inativar"
        onCancel={() => setStudentToDelete(null)}
        onConfirm={() => studentToDelete && inactivateStudent(studentToDelete)}
      />
    </AppShell>
  );
}
