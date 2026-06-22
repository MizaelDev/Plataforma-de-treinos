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

    response.status(201).json({ studentPlan });
  })
);

invoicesRouter.patch(
  "/:id",
  requireRoles("ADMIN"),
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    const data = invoiceSchema.partial().parse(request.body);
    const invoice = await prisma.invoice.update({
      where: { id, organizationId: request.user!.organizationId },
      data: {
        ...(data.studentId && { studentId: data.studentId }),
        ...(data.planId !== undefined && { planId: data.planId }),
        ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
        ...(data.amount && { amount: data.amount }),
        ...(data.status && { status: data.status })
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
      where: { id, organizationId: request.user!.organizationId }
    });

    if (!invoice) {
      response.status(404).json({ message: "Mensalidade nao encontrada." });
      return;
    }

    const charges = await calculateInvoiceCharges(request.user!.organizationId, invoice.dueDate, invoice.amount);
    const paidInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "PAGO",
        paidAt: new Date(),
        fineAmount: charges.fineAmount,
        interestAmount: charges.interestAmount,
        totalPaid: charges.total
      }
    });

    await auditLog({ organizationId: request.user!.organizationId, actorUserId: request.user!.id, action: "PAY", entity: "Invoice", entityId: invoice.id });
    response.json({ invoice: paidInvoice, charges });
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
