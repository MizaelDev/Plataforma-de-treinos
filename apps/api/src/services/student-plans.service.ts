import { Prisma } from "@prisma/client";
import { studentPlanChangeSchema } from "@academia/shared";
import { parseDate } from "../utils/date.js";
import { AppError } from "../utils/errors.js";
import { prisma } from "./prisma.js";

type ChangeStudentPlanContext = {
  organizationId: string;
};

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export async function changeStudentCurrentPlan(studentId: string, payload: unknown, context: ChangeStudentPlanContext) {
  if (!context.organizationId) {
    throw new AppError(401, "Sessão inválida. Faça login novamente.");
  }

  const input = studentPlanChangeSchema.parse(payload);
  const startDate = parseDate(input.startDate || new Date().toISOString(), "Data de início")!;

  const [student, plan] = await Promise.all([
    prisma.student.findFirst({
      where: { id: studentId, organizationId: context.organizationId, deletedAt: null },
      select: { id: true }
    }),
    prisma.plan.findFirst({
      where: { id: input.planId, organizationId: context.organizationId, deletedAt: null, isActive: true }
    })
  ]);

  if (!student) {
    throw new AppError(404, "Aluno não encontrado.");
  }

  if (!plan) {
    throw new AppError(404, "Plano não encontrado ou inativo.");
  }

  const dueDate = parseDate(input.dueDate, "Data de vencimento", false) ?? addDays(startDate, plan.durationDays);
  const amount = input.amount === "" || input.amount === undefined ? plan.value : new Prisma.Decimal(input.amount);

  return prisma.$transaction(async (tx) => {
    await tx.studentPlan.updateMany({
      where: {
        studentId,
        isActive: true,
        student: {
          organizationId: context.organizationId
        }
      },
      data: {
        isActive: false,
        endDate: startDate
      }
    });

    const studentPlan = await tx.studentPlan.create({
      data: {
        studentId,
        planId: plan.id,
        startDate,
        isActive: true
      },
      include: { plan: true }
    });

    const invoice = input.createInitialInvoice
      ? await tx.invoice.create({
          data: {
            organizationId: context.organizationId,
            studentId,
            planId: plan.id,
            dueDate,
            amount,
            status: "PENDENTE",
            fineAmount: 0,
            interestAmount: 0,
            totalPaid: 0
          },
          include: { plan: true }
        })
      : null;

    return { studentPlan, invoice };
  });
}
