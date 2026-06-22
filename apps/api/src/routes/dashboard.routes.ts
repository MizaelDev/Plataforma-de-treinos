import { Router } from "express";
import { requireAuth, requireRoles } from "../middlewares/auth.js";
import { calculateInvoiceCharges } from "../services/finance.service.js";
import { prisma } from "../services/prisma.js";
import { asyncRoute } from "../utils/async-route.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get(
  "/admin",
  requireRoles("ADMIN", "PROFESSOR"),
  asyncRoute(async (request, response) => {
    const organizationId = request.user!.organizationId;
    const now = new Date();
    const inSevenDays = new Date(now);
    inSevenDays.setDate(now.getDate() + 7);
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [activeStudents, dueSoon, overdue, monthRevenue, delinquentStudents] = await Promise.all([
      prisma.student.count({ where: { organizationId, status: "ATIVO", deletedAt: null } }),
      prisma.invoice.count({ where: { organizationId, status: "PENDENTE", dueDate: { gte: now, lte: inSevenDays } } }),
      prisma.invoice.count({ where: { organizationId, status: { in: ["PENDENTE", "ATRASADO"] }, dueDate: { lt: now } } }),
      prisma.invoice.aggregate({
        where: { organizationId, status: "PAGO", paidAt: { gte: firstDayOfMonth, lt: firstDayNextMonth } },
        _sum: { totalPaid: true }
      }),
      prisma.student.count({
        where: {
          organizationId,
          deletedAt: null,
          invoices: { some: { status: { in: ["PENDENTE", "ATRASADO"] }, dueDate: { lt: now } } }
        }
      })
    ]);

    response.json({
      activeStudents,
      dueSoon,
      overdue,
      monthRevenue: monthRevenue._sum.totalPaid ?? 0,
      delinquentStudents
    });
  })
);

dashboardRouter.get(
  "/student",
  requireRoles("ALUNO"),
  asyncRoute(async (request, response) => {
    const studentId = request.user!.studentId;
    if (!studentId) {
      response.status(404).json({ message: "Perfil de aluno nao encontrado." });
      return;
    }

    const [student, nextInvoice, overdueInvoices] = await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
        include: {
          studentPlans: {
            where: { isActive: true },
            include: { plan: true },
            take: 1
          }
        }
      }),
      prisma.invoice.findFirst({
        where: { studentId, status: { in: ["PENDENTE", "ATRASADO"] } },
        orderBy: { dueDate: "asc" }
      }),
      prisma.invoice.count({
        where: { studentId, status: { in: ["PENDENTE", "ATRASADO"] }, dueDate: { lt: new Date() } }
      })
    ]);

    response.json({
      student,
      plan: student?.studentPlans[0]?.plan ?? null,
      nextInvoice,
      nextInvoiceCharges: nextInvoice
        ? await calculateInvoiceCharges(request.user!.organizationId, nextInvoice.dueDate, nextInvoice.amount)
        : null,
      financialStatus: overdueInvoices > 0 ? "INADIMPLENTE" : "EM_DIA"
    });
  })
);
