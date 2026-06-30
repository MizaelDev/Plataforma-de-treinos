import { Router } from "express";
import { requireAuth, requireRoles } from "../middlewares/auth.js";
import { calculateInvoiceCharges } from "../services/finance.service.js";
import { prisma } from "../services/prisma.js";
import { asyncRoute } from "../utils/async-route.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

const activeStudentFilter = {
  status: "ATIVO" as const,
  deletedAt: null
};

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

    const [activeStudents, dueSoon, overdue, monthRevenue, delinquentStudents, dueSoonInvoices, delinquentStudentRows, latestPayments, latestStudents] = await Promise.all([
      prisma.student.count({ where: { organizationId, status: "ATIVO", deletedAt: null } }),
      prisma.invoice.count({ where: { organizationId, student: activeStudentFilter, status: "PENDENTE", dueDate: { gte: now, lte: inSevenDays } } }),
      prisma.invoice.count({ where: { organizationId, student: activeStudentFilter, status: { in: ["PENDENTE", "ATRASADO"] }, dueDate: { lt: now } } }),
      prisma.invoice.aggregate({
        where: { organizationId, student: activeStudentFilter, status: "PAGO", paidAt: { gte: firstDayOfMonth, lt: firstDayNextMonth } },
        _sum: { totalPaid: true }
      }),
      prisma.student.count({
        where: {
          organizationId,
          ...activeStudentFilter,
          invoices: { some: { status: { in: ["PENDENTE", "ATRASADO"] }, dueDate: { lt: now } } }
        }
      }),
      prisma.invoice.findMany({
        where: { organizationId, student: activeStudentFilter, status: "PENDENTE", dueDate: { gte: now, lte: inSevenDays } },
        include: { student: { select: { id: true, fullName: true } }, plan: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
        take: 6
      }),
      prisma.student.findMany({
        where: {
          organizationId,
          ...activeStudentFilter,
          invoices: { some: { status: { in: ["PENDENTE", "ATRASADO"] }, dueDate: { lt: now } } }
        },
        select: {
          id: true,
          fullName: true,
          phone: true,
          invoices: {
            where: { status: { in: ["PENDENTE", "ATRASADO"] }, dueDate: { lt: now } },
            select: { id: true, dueDate: true, amount: true, status: true },
            orderBy: { dueDate: "asc" },
            take: 1
          }
        },
        orderBy: { fullName: "asc" },
        take: 6
      }),
      prisma.invoice.findMany({
        where: { organizationId, student: activeStudentFilter, status: "PAGO", paidAt: { not: null } },
        include: { student: { select: { id: true, fullName: true } }, plan: { select: { id: true, name: true } } },
        orderBy: { paidAt: "desc" },
        take: 6
      }),
      prisma.student.findMany({
        where: { organizationId, ...activeStudentFilter },
        select: { id: true, fullName: true, modality: true, enrollmentDate: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 6
      })
    ]);

    const dueSoonInvoicesWithCharges = await Promise.all(
      dueSoonInvoices.map(async (invoice) => ({
        ...invoice,
        charges: await calculateInvoiceCharges(organizationId, invoice.dueDate, invoice.amount)
      }))
    );

    const delinquentStudentRowsWithCharges = await Promise.all(
      delinquentStudentRows.map(async (student) => ({
        id: student.id,
        fullName: student.fullName,
        phone: student.phone,
        oldestInvoice: student.invoices[0]
          ? {
              ...student.invoices[0],
              charges: await calculateInvoiceCharges(organizationId, student.invoices[0].dueDate, student.invoices[0].amount)
            }
          : null
      }))
    );

    response.json({
      activeStudents,
      dueSoon,
      overdue,
      monthRevenue: monthRevenue._sum.totalPaid ?? 0,
      delinquentStudents,
      dueSoonInvoices: dueSoonInvoicesWithCharges,
      delinquentStudentRows: delinquentStudentRowsWithCharges,
      latestPayments,
      latestStudents
    });
  })
);

dashboardRouter.get(
  "/student",
  requireRoles("ALUNO"),
  asyncRoute(async (request, response) => {
    const studentId = request.user!.studentId;
    if (!studentId) {
      response.status(404).json({ message: "Perfil de aluno não encontrado." });
      return;
    }

    const planSelect = {
      id: true,
      name: true,
      value: true,
      modality: true
    };

    const [student, nextInvoice, overdueInvoices, activeWorkout] = await Promise.all([
      prisma.student.findFirst({
        where: { id: studentId, organizationId: request.user!.organizationId, deletedAt: null },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          photoUrl: true,
          modality: true,
          studentPlans: {
            where: { isActive: true },
            include: { plan: { select: planSelect } },
            take: 1
          }
        }
      }),
      prisma.invoice.findFirst({
        where: { organizationId: request.user!.organizationId, studentId, status: { in: ["PENDENTE", "ATRASADO"] } },
        select: { id: true, dueDate: true, amount: true, status: true, plan: { select: planSelect } },
        orderBy: { dueDate: "asc" }
      }),
      prisma.invoice.count({
        where: { organizationId: request.user!.organizationId, studentId, status: { in: ["PENDENTE", "ATRASADO"] }, dueDate: { lt: new Date() } }
      }),
      prisma.workoutPlan.findFirst({
        where: { organizationId: request.user!.organizationId, studentId, isActive: true, deletedAt: null },
        select: {
          id: true,
          name: true,
          goal: true,
          startDate: true,
          endDate: true,
          isActive: true,
          days: {
            include: {
              exercises: {
                include: { libraryExercise: true },
                orderBy: { order: "asc" }
              }
            },
            orderBy: { label: "asc" }
          }
        },
        orderBy: { createdAt: "desc" }
      })
    ]);

    response.json({
      student,
      plan: student?.studentPlans[0]?.plan ?? null,
      nextInvoice,
      nextInvoiceCharges: nextInvoice
        ? await calculateInvoiceCharges(request.user!.organizationId, nextInvoice.dueDate, nextInvoice.amount)
        : null,
      financialStatus: overdueInvoices > 0 ? "INADIMPLENTE" : "EM_DIA",
      activeWorkout
    });
  })
);
