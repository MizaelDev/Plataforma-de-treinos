import { Router } from "express";
import { invoiceSchema } from "@academia/shared";
import { requireAuth, requireRoles } from "../middlewares/auth.js";
import { auditLog } from "../services/audit.service.js";
import { calculateInvoiceCharges } from "../services/finance.service.js";
import { prisma } from "../services/prisma.js";
import { asyncRoute } from "../utils/async-route.js";
import { requiredParam } from "../utils/http.js";

export const invoicesRouter = Router();

invoicesRouter.use(requireAuth);

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

invoicesRouter.get(
  "/",
  requireRoles("ADMIN", "PROFESSOR"),
  asyncRoute(async (request, response) => {
    const invoices = await prisma.invoice.findMany({
      where: { organizationId: request.user!.organizationId },
      include: { student: { select: { id: true, fullName: true, email: true } }, plan: true },
      orderBy: { dueDate: "desc" }
    });

    const invoicesWithCharges = await Promise.all(
      invoices.map(async (invoice) => ({
        ...invoice,
        charges: await calculateInvoiceCharges(invoice.organizationId, invoice.dueDate, invoice.amount)
      }))
    );

    response.json({ invoices: invoicesWithCharges });
  })
);

invoicesRouter.post(
  "/",
  requireRoles("ADMIN"),
  asyncRoute(async (request, response) => {
    const data = invoiceSchema.parse(request.body);
    const student = await prisma.student.findFirst({
      where: { id: data.studentId, organizationId: request.user!.organizationId, deletedAt: null }
    });

    if (!student) {
      response.status(404).json({ message: "Aluno nao encontrado." });
      return;
    }

    if (data.planId) {
      const plan = await prisma.plan.findFirst({
        where: { id: data.planId, organizationId: request.user!.organizationId, deletedAt: null },
        select: { id: true }
      });

      if (!plan) {
        response.status(404).json({ message: "Plano nao encontrado." });
        return;
      }
    }

    const invoice = await prisma.invoice.create({
      data: {
        organizationId: request.user!.organizationId,
        studentId: data.studentId,
        planId: data.planId,
        dueDate: new Date(data.dueDate),
        amount: data.amount,
        status: data.status
      }
    });

    await auditLog({ organizationId: request.user!.organizationId, actorUserId: request.user!.id, action: "CREATE", entity: "Invoice", entityId: invoice.id });
    response.status(201).json({ invoice });
  })
);

invoicesRouter.get(
  "/:id",
  requireRoles("ADMIN", "PROFESSOR"),
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: request.user!.organizationId },
      include: { student: { select: { id: true, fullName: true, email: true } }, plan: true }
    });

    if (!invoice) {
      response.status(404).json({ message: "Mensalidade nao encontrada." });
      return;
    }

    response.json({
      invoice: {
        ...invoice,
        charges: await calculateInvoiceCharges(invoice.organizationId, invoice.dueDate, invoice.amount)
      }
    });
  })
);

invoicesRouter.post(
  "/student-plans",
  requireRoles("ADMIN"),
  asyncRoute(async (request, response) => {
    const { studentId, planId, startDate } = request.body as { studentId: string; planId: string; startDate?: string };
    const plan = await prisma.plan.findFirst({ where: { id: planId, organizationId: request.user!.organizationId, deletedAt: null } });
    const student = await prisma.student.findFirst({ where: { id: studentId, organizationId: request.user!.organizationId, deletedAt: null } });

    if (!plan || !student) {
      response.status(404).json({ message: "Aluno ou plano nao encontrado." });
      return;
    }

    await prisma.studentPlan.updateMany({ where: { studentId, isActive: true }, data: { isActive: false, endDate: new Date() } });

    const studentPlan = await prisma.studentPlan.create({
      data: {
        studentId,
        planId,
        startDate: startDate ? new Date(startDate) : new Date(),
        isActive: true
      },
      include: { plan: true }
    });

    await auditLog({
      organizationId: request.user!.organizationId,
      actorUserId: request.user!.id,
      action: "LINK_PLAN",
      entity: "StudentPlan",
      entityId: studentPlan.id,
      metadata: { studentId, planId }
    });

    response.status(201).json({ studentPlan });
  })
);

invoicesRouter.patch(
  "/:id",
  requireRoles("ADMIN"),
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    const data = invoiceSchema.partial().parse(request.body);
    const existingInvoice = await prisma.invoice.findFirst({
      where: { id, organizationId: request.user!.organizationId },
      include: { plan: true }
    });

    if (!existingInvoice) {
      response.status(404).json({ message: "Mensalidade nao encontrada." });
      return;
    }

    if (data.studentId) {
      const student = await prisma.student.findFirst({
        where: { id: data.studentId, organizationId: request.user!.organizationId, deletedAt: null },
        select: { id: true }
      });

      if (!student) {
        response.status(404).json({ message: "Aluno nao encontrado." });
        return;
      }
    }

    if (data.planId) {
      const plan = await prisma.plan.findFirst({
        where: { id: data.planId, organizationId: request.user!.organizationId, deletedAt: null },
        select: { id: true }
      });

      if (!plan) {
        response.status(404).json({ message: "Plano nao encontrado." });
        return;
      }
    }

    const selectedPlan = data.planId
      ? await prisma.plan.findFirst({
          where: { id: data.planId, organizationId: request.user!.organizationId, deletedAt: null }
        })
      : existingInvoice.plan;

    if (data.status === "PAGO") {
      const paidAt = new Date();
      const dueDate = data.dueDate ? new Date(data.dueDate) : existingInvoice.dueDate;
      const amount = data.amount ?? existingInvoice.amount;
      const charges = await calculateInvoiceCharges(request.user!.organizationId, dueDate, amount);

      const { invoice, nextInvoice } = await prisma.$transaction(async (tx) => {
        const invoice = await tx.invoice.update({
          where: { id, organizationId: request.user!.organizationId },
          data: {
            ...(data.studentId && { studentId: data.studentId }),
            ...(data.planId !== undefined && { planId: data.planId }),
            ...(data.dueDate && { dueDate }),
            ...(data.amount && { amount: data.amount }),
            status: "PAGO",
            paidAt,
            fineAmount: charges.fineAmount,
            interestAmount: charges.interestAmount,
            totalPaid: charges.total
          }
        });

        if (!selectedPlan) {
          return { invoice, nextInvoice: null };
        }

        const nextDueDate = addDays(paidAt, selectedPlan.durationDays);
        const existingNextInvoice = await tx.invoice.findFirst({
          where: {
            organizationId: request.user!.organizationId,
            studentId: data.studentId ?? existingInvoice.studentId,
            planId: selectedPlan.id,
            status: { in: ["PENDENTE", "ATRASADO"] },
            dueDate: { gt: paidAt }
          },
          orderBy: { dueDate: "asc" }
        });

        if (existingNextInvoice) {
          return { invoice, nextInvoice: existingNextInvoice };
        }

        const nextInvoice = await tx.invoice.create({
          data: {
            organizationId: request.user!.organizationId,
            studentId: data.studentId ?? existingInvoice.studentId,
            planId: selectedPlan.id,
            dueDate: nextDueDate,
            amount: selectedPlan.value,
            status: "PENDENTE"
          }
        });

        return { invoice, nextInvoice };
      });

      await auditLog({ organizationId: request.user!.organizationId, actorUserId: request.user!.id, action: "UPDATE_PAY", entity: "Invoice", entityId: invoice.id });
      response.json({ invoice, nextInvoice });
      return;
    }

    const invoice = await prisma.invoice.update({
      where: { id, organizationId: request.user!.organizationId },
      data: {
        ...(data.studentId && { studentId: data.studentId }),
        ...(data.planId !== undefined && { planId: data.planId }),
        ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
        ...(data.amount && { amount: data.amount }),
        ...(data.status && {
          status: data.status,
          paidAt: null,
          fineAmount: 0,
          interestAmount: 0,
          totalPaid: 0
        })
      }
    });

    await auditLog({ organizationId: request.user!.organizationId, actorUserId: request.user!.id, action: "UPDATE", entity: "Invoice", entityId: invoice.id });
    response.json({ invoice });
  })
);

invoicesRouter.post(
  "/:id/pay",
  requireRoles("ADMIN"),
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: request.user!.organizationId },
      include: { plan: true }
    });

    if (!invoice) {
      response.status(404).json({ message: "Mensalidade nao encontrada." });
      return;
    }

    const charges = await calculateInvoiceCharges(request.user!.organizationId, invoice.dueDate, invoice.amount);
    const { paidInvoice, nextInvoice, createdNextInvoice } = await prisma.$transaction(async (tx) => {
      const paidAt = new Date();
      const paidInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "PAGO",
          paidAt,
          fineAmount: charges.fineAmount,
          interestAmount: charges.interestAmount,
          totalPaid: charges.total
        }
      });

      if (!invoice.planId || !invoice.plan) {
        return { paidInvoice, nextInvoice: null, createdNextInvoice: false };
      }

      const nextDueDate = addDays(paidAt, invoice.plan.durationDays);

      const existingNextInvoice = await tx.invoice.findFirst({
        where: {
          organizationId: request.user!.organizationId,
          studentId: invoice.studentId,
          planId: invoice.planId,
          status: { in: ["PENDENTE", "ATRASADO"] },
          dueDate: { gt: paidAt }
        },
        orderBy: { dueDate: "asc" }
      });

      if (existingNextInvoice) {
        return { paidInvoice, nextInvoice: existingNextInvoice, createdNextInvoice: false };
      }

      const nextInvoice = await tx.invoice.create({
        data: {
          organizationId: request.user!.organizationId,
          studentId: invoice.studentId,
          planId: invoice.planId,
          dueDate: nextDueDate,
          amount: invoice.plan.value,
          status: "PENDENTE"
        }
      });

      return { paidInvoice, nextInvoice, createdNextInvoice: true };
    });

    await auditLog({ organizationId: request.user!.organizationId, actorUserId: request.user!.id, action: "PAY", entity: "Invoice", entityId: invoice.id });
    if (createdNextInvoice && nextInvoice) {
      await auditLog({
        organizationId: request.user!.organizationId,
        actorUserId: request.user!.id,
        action: "CREATE_NEXT_INVOICE",
        entity: "Invoice",
        entityId: nextInvoice.id
      });
    }

    response.json({ invoice: paidInvoice, charges, nextInvoice });
  })
);

invoicesRouter.delete(
  "/:id",
  requireRoles("ADMIN"),
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    const invoice = await prisma.invoice.update({
      where: { id, organizationId: request.user!.organizationId },
      data: { status: "CANCELADO" }
    });

    await auditLog({
      organizationId: request.user!.organizationId,
      actorUserId: request.user!.id,
      action: "CANCEL",
      entity: "Invoice",
      entityId: invoice.id
    });

    response.status(204).send();
  })
);
