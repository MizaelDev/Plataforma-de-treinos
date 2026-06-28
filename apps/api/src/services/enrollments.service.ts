import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { enrollmentSchema } from "@academia/shared";
import { hashCpf, normalizeCpf } from "../utils/cpf.js";
import { parseDate } from "../utils/date.js";
import { AppError } from "../utils/errors.js";
import { prisma } from "./prisma.js";
import { createPixPayment } from "./payments.service.js";
import { sendPasswordResetLink } from "./password-reset.service.js";

type EnrollmentContext = {
  organizationId: string;
  actorUserId?: string;
};

function generateTemporaryPassword() {
  return randomBytes(16).toString("hex");
}

function optionalText(value?: string | null) {
  return value?.trim() || null;
}

export async function createEnrollment(payload: unknown, context: EnrollmentContext) {
  if (!context.organizationId) {
    throw new AppError(401, "Sessão inválida. Faça login novamente.");
  }

  const input = enrollmentSchema.parse(payload);
  const cpf = normalizeCpf(input.student.cpf);
  const cpfHash = hashCpf(cpf);
  const email = input.student.email.trim().toLowerCase();
  const modality = input.modalities.join(", ");
  const enrollmentDate = parseDate(input.enrollmentDate, "Data da matrícula")!;
  const dueDate = parseDate(input.invoice.dueDate, "Data de vencimento")!;
  const shouldGeneratePix = input.invoice.paymentMode === "PIX_MERCADO_PAGO";
  const invoiceStatus = shouldGeneratePix ? "PENDENTE" : input.invoice.status;
  const paidAt = invoiceStatus === "PAGO" ? parseDate(input.invoice.paidAt || new Date().toISOString(), "Data de pagamento")! : null;

  const [duplicatedStudent, plan, existingUser] = await Promise.all([
    prisma.student.findUnique({
      where: {
        organizationId_cpfHash: {
          organizationId: context.organizationId,
          cpfHash
        }
      },
      select: { id: true }
    }),
    prisma.plan.findFirst({
      where: { id: input.planId, organizationId: context.organizationId, isActive: true, deletedAt: null }
    }),
    input.student.createAccess ? prisma.user.findUnique({ where: { email }, select: { id: true } }) : Promise.resolve(null)
  ]);

  if (duplicatedStudent) {
    throw new AppError(409, "Já existe um aluno cadastrado com este CPF.");
  }

  if (!plan) {
    throw new AppError(404, "Plano não encontrado ou inativo.");
  }

  if (existingUser) {
    throw new AppError(409, "Já existe um usuário cadastrado com este e-mail. Use outro e-mail ou crie o acesso depois.");
  }

  const temporaryPassword = input.student.createAccess ? generateTemporaryPassword() : null;

  const enrollment = await prisma.$transaction(async (tx) => {
    const user = input.student.createAccess
      ? await tx.user.create({
          data: {
            organizationId: context.organizationId,
            name: input.student.fullName.trim(),
            email,
            passwordHash: await bcrypt.hash(temporaryPassword!, 10),
            role: "ALUNO",
            isActive: true
          },
          select: { id: true, email: true }
        })
      : null;

    const student = await tx.student.create({
      data: {
        organizationId: context.organizationId,
        userId: user?.id,
        fullName: input.student.fullName.trim(),
        cpf,
        cpfHash,
        birthDate: parseDate(input.student.birthDate, "Data de nascimento")!,
        phone: input.student.phone.trim(),
        address: input.student.address.trim(),
        email,
        photoUrl: optionalText(input.student.photoUrl),
        enrollmentDate,
        modality,
        notes: optionalText(input.student.notes),
        status: "ATIVO"
      }
    });

    const studentPlan = await tx.studentPlan.create({
      data: {
        studentId: student.id,
        planId: plan.id,
        startDate: enrollmentDate,
        isActive: true
      },
      include: { plan: true }
    });

    const invoice = await tx.invoice.create({
      data: {
        organizationId: context.organizationId,
        studentId: student.id,
        planId: plan.id,
        dueDate,
        amount: input.invoice.amount,
        status: invoiceStatus,
        paidAt,
        totalPaid: invoiceStatus === "PAGO" ? input.invoice.amount : 0,
        fineAmount: 0,
        interestAmount: 0
      },
      include: { plan: true }
    });

    return {
      student,
      studentPlan,
      invoice,
      access: user ? { userId: user.id, email: user.email, setupEmailSent: false } : null
    };
  });

  if (enrollment.access?.userId) {
    await sendPasswordResetLink(enrollment.access.userId, "setup");
    enrollment.access.setupEmailSent = true;
  }

  if (!shouldGeneratePix) {
    return enrollment;
  }

  try {
    const paymentTransaction = await createPixPayment(enrollment.invoice.id, {
      userId: context.actorUserId,
      role: "ADMIN",
      organizationId: context.organizationId
    });

    return { ...enrollment, paymentTransaction };
  } catch (error) {
    return {
      ...enrollment,
      paymentError: error instanceof Error ? error.message : "Não foi possível gerar o Pix inicial."
    };
  }
}
