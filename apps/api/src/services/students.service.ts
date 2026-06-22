import type { StudentInput } from "@academia/shared";
import { studentSchema } from "@academia/shared";
import { hashCpf, normalizeCpf } from "../utils/cpf.js";
import { AppError } from "../utils/errors.js";
import { prisma } from "./prisma.js";

type StudentContext = {
  organizationId: string;
};

function parseStudentDate(value: string, fieldLabel: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, `${fieldLabel} invalida.`);
  }

  return date;
}

function buildStudentData(input: StudentInput, context: StudentContext) {
  if (!context.organizationId) {
    throw new AppError(401, "Sessao invalida. Faca login novamente.");
  }

  const cpf = normalizeCpf(input.cpf);

  if (cpf.length !== 11) {
    throw new AppError(400, "CPF invalido. Informe 11 digitos.");
  }

  return {
    organizationId: context.organizationId,
    fullName: input.fullName.trim(),
    cpf,
    cpfHash: hashCpf(cpf),
    birthDate: parseStudentDate(input.birthDate, "Data de nascimento"),
    phone: input.phone.trim(),
    address: input.address.trim(),
    email: input.email.trim().toLowerCase(),
    photoUrl: input.photoUrl?.trim() || null,
    enrollmentDate: parseStudentDate(input.enrollmentDate, "Data de matricula"),
    modality: input.modality.trim(),
    notes: input.notes?.trim() || null,
    status: input.status
  };
}

export async function createStudent(payload: unknown, context: StudentContext) {
  const input = studentSchema.parse(payload);
  const data = buildStudentData(input, context);

  const duplicatedStudent = await prisma.student.findUnique({
    where: {
      organizationId_cpfHash: {
        organizationId: context.organizationId,
        cpfHash: data.cpfHash
      }
    },
    select: { id: true }
  });

  if (duplicatedStudent) {
    throw new AppError(409, "Ja existe um aluno cadastrado com este CPF.");
  }

  return prisma.student.create({ data });
}

export async function updateStudent(id: string, payload: unknown, context: StudentContext) {
  const input = studentSchema.partial().parse(payload);
  const cpf = input.cpf ? normalizeCpf(input.cpf) : undefined;
  const cpfHash = cpf ? hashCpf(cpf) : undefined;

  if (cpf && cpf.length !== 11) {
    throw new AppError(400, "CPF invalido. Informe 11 digitos.");
  }

  if (cpfHash) {
    const duplicatedStudent = await prisma.student.findUnique({
      where: {
        organizationId_cpfHash: {
          organizationId: context.organizationId,
          cpfHash
        }
      },
      select: { id: true }
    });

    if (duplicatedStudent && duplicatedStudent.id !== id) {
      throw new AppError(409, "Ja existe um aluno cadastrado com este CPF.");
    }
  }

  return prisma.student.update({
    where: { id, organizationId: context.organizationId },
    data: {
      ...(input.fullName && { fullName: input.fullName.trim() }),
      ...(cpf && { cpf, cpfHash }),
      ...(input.birthDate && { birthDate: parseStudentDate(input.birthDate, "Data de nascimento") }),
      ...(input.phone && { phone: input.phone.trim() }),
      ...(input.address && { address: input.address.trim() }),
      ...(input.email && { email: input.email.trim().toLowerCase() }),
      ...(input.photoUrl !== undefined && { photoUrl: input.photoUrl.trim() || null }),
      ...(input.enrollmentDate && { enrollmentDate: parseStudentDate(input.enrollmentDate, "Data de matricula") }),
      ...(input.modality && { modality: input.modality.trim() }),
      ...(input.notes !== undefined && { notes: input.notes?.trim() || null }),
      ...(input.status && { status: input.status })
    }
  });
}
