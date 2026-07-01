import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import type { StudentInput } from "@academia/shared";
import { studentSchema } from "@academia/shared";
import { hashCpf, normalizeCpf } from "../utils/cpf.js";
import { AppError } from "../utils/errors.js";
import { prisma } from "./prisma.js";
import { sendPasswordResetLink } from "./password-reset.service.js";
import { releaseDeletedStudentIdentity } from "./student-identity.service.js";

type StudentContext = {
  organizationId: string;
};

function generateTemporaryPassword() {
  return randomBytes(16).toString("hex");
}

function parseStudentDate(value: string, fieldLabel: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, `${fieldLabel} inválida.`);
  }

  return date;
}

function buildStudentData(input: StudentInput, context: StudentContext) {
  if (!context.organizationId) {
    throw new AppError(401, "Sessão inválida. Faça login novamente.");
  }

  const cpf = normalizeCpf(input.cpf);

  if (cpf.length !== 11) {
    throw new AppError(400, "CPF inválido. Informe 11 dígitos.");
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
    enrollmentDate: parseStudentDate(input.enrollmentDate, "Data de matrícula"),
    modality: input.modality.trim(),
    notes: input.notes?.trim() || null,
    status: input.status
  };
}

export async function createStudent(payload: unknown, context: StudentContext) {
  const input = studentSchema.parse(payload);
  const data = buildStudentData(input, context);

  await releaseDeletedStudentIdentity({
    organizationId: context.organizationId,
    cpfHash: data.cpfHash,
    email: data.email
  });

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
    throw new AppError(409, "Já existe um aluno cadastrado com este CPF.");
  }

  const temporaryPassword = generateTemporaryPassword();

  if (input.createAccess) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true }
    });

    if (existingUser) {
      throw new AppError(409, "Já existe um usuário cadastrado com este e-mail. Use outro e-mail ou vincule o aluno manualmente.");
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    if (!input.createAccess) {
      const student = await tx.student.create({ data });
      return { student, access: null };
    }

    const user = await tx.user.create({
      data: {
        organizationId: context.organizationId,
        name: data.fullName,
        email: data.email,
        passwordHash: await bcrypt.hash(temporaryPassword, 10),
        role: "ALUNO"
      }
    });

    const student = await tx.student.create({
      data: {
        ...data,
        userId: user.id
      }
    });

    return {
      student,
      access: {
        email: user.email,
        userId: user.id,
        setupEmailSent: false,
        setupEmailError: null as string | null
      }
    };
  });

  if (result.access?.userId) {
    const setupEmail = await sendPasswordResetLink(result.access.userId, "setup");
    result.access.setupEmailSent = setupEmail.sent;
    result.access.setupEmailError = setupEmail.error ?? null;
  }

  return result;
}

export async function updateStudent(id: string, payload: unknown, context: StudentContext) {
  const input = studentSchema.partial().parse(payload);
  const cpf = input.cpf ? normalizeCpf(input.cpf) : undefined;
  const cpfHash = cpf ? hashCpf(cpf) : undefined;

  if (cpf && cpf.length !== 11) {
    throw new AppError(400, "CPF inválido. Informe 11 dígitos.");
  }

  if (cpfHash) {
    await releaseDeletedStudentIdentity({
      organizationId: context.organizationId,
      cpfHash,
      email: input.email
    });

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
      throw new AppError(409, "Já existe um aluno cadastrado com este CPF.");
    }
  }

  return prisma.$transaction(async (tx) => {
    const student = await tx.student.update({
      where: { id, organizationId: context.organizationId },
      data: {
        ...(input.fullName && { fullName: input.fullName.trim() }),
        ...(cpf && { cpf, cpfHash }),
        ...(input.birthDate && { birthDate: parseStudentDate(input.birthDate, "Data de nascimento") }),
        ...(input.phone && { phone: input.phone.trim() }),
        ...(input.address && { address: input.address.trim() }),
        ...(input.email && { email: input.email.trim().toLowerCase() }),
        ...(input.photoUrl !== undefined && { photoUrl: input.photoUrl.trim() || null }),
        ...(input.enrollmentDate && { enrollmentDate: parseStudentDate(input.enrollmentDate, "Data de matrícula") }),
        ...(input.modality && { modality: input.modality.trim() }),
        ...(input.notes !== undefined && { notes: input.notes?.trim() || null }),
        ...(input.status && { status: input.status })
      }
    });

    if (student.userId && (input.fullName || input.email || input.status)) {
      await tx.user.update({
        where: { id: student.userId },
        data: {
          ...(input.fullName && { name: student.fullName }),
          ...(input.email && { email: student.email }),
          ...(input.status && { isActive: input.status === "ATIVO" })
        }
      });
    }

    return student;
  });
}

export async function createOrResetStudentAccess(id: string, context: StudentContext) {
  const student = await prisma.student.findFirst({
    where: { id, organizationId: context.organizationId, deletedAt: null },
    include: { user: true }
  });

  if (!student) {
    throw new AppError(404, "Aluno não encontrado.");
  }

  if (!student.email) {
    throw new AppError(400, "Informe um e-mail válido no cadastro do aluno antes de criar o acesso.");
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  const result = await prisma.$transaction(async (tx) => {
    if (student.userId && student.user) {
      const user = await tx.user.update({
        where: { id: student.userId },
        data: {
          name: student.fullName,
          email: student.email,
          passwordHash,
          isActive: student.status === "ATIVO"
        },
        select: { id: true, email: true, isActive: true }
      });

      return { user, created: false };
    }

    const existingUser = await tx.user.findUnique({
      where: { email: student.email },
      select: { id: true }
    });

    if (existingUser) {
      throw new AppError(409, "Já existe um usuário cadastrado com este e-mail. Use outro e-mail no aluno ou ajuste o usuário existente.");
    }

    const user = await tx.user.create({
      data: {
        organizationId: context.organizationId,
        name: student.fullName,
        email: student.email,
        passwordHash,
        role: "ALUNO",
        isActive: student.status === "ATIVO"
      },
      select: { id: true, email: true, isActive: true }
    });

    await tx.student.update({
      where: { id: student.id },
      data: { userId: user.id }
    });

    return { user, created: true };
  });

  const setupEmail = await sendPasswordResetLink(result.user.id, "setup");
  return { ...result, setupEmailSent: setupEmail.sent, setupEmailError: setupEmail.error ?? null };
}
