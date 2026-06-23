import { Router } from "express";
import { requireAuth, requireRoles } from "../middlewares/auth.js";
import { calculateInvoiceCharges } from "../services/finance.service.js";
import { prisma } from "../services/prisma.js";
import { asyncRoute } from "../utils/async-route.js";

export const studentAreaRouter = Router();

studentAreaRouter.use(requireAuth);
studentAreaRouter.use(requireRoles("ALUNO"));

function getStudentId(user: Express.Request["user"]) {
  return user?.studentId;
}

const workoutInclude = {
  professor: { select: { id: true, name: true } },
  days: {
    include: { exercises: { orderBy: { order: "asc" as const } } },
    orderBy: { label: "asc" as const }
  }
};

const planSelect = {
  id: true,
  name: true,
  value: true,
  modality: true,
  dueDay: true
};

const invoiceSelect = {
  id: true,
  dueDate: true,
  paidAt: true,
  amount: true,
  totalPaid: true,
  status: true,
  plan: { select: planSelect }
};

const assessmentSelect = {
  id: true,
  assessedAt: true,
  weightKg: true,
  heightCm: true,
  bmi: true,
  bodyFatPercentage: true,
  muscleMassKg: true,
  abdominalCircumferenceCm: true,
  armCircumferenceCm: true,
  waistCircumferenceCm: true,
  hipCircumferenceCm: true,
  notes: true,
  professor: { select: { id: true, name: true } }
};

function nextDueDateFromPlan(dueDay?: number | null) {
  if (!dueDay) return null;

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const dayInCurrentMonth = Math.min(dueDay, new Date(year, month + 1, 0).getDate());
  const currentMonthDueDate = new Date(year, month, dayInCurrentMonth);

  if (currentMonthDueDate >= new Date(year, month, today.getDate())) {
    return currentMonthDueDate;
  }

  const nextMonth = month + 1;
  const dayInNextMonth = Math.min(dueDay, new Date(year, nextMonth + 1, 0).getDate());
  return new Date(year, nextMonth, dayInNextMonth);
}

studentAreaRouter.get(
  "/dashboard",
  asyncRoute(async (request, response) => {
    const studentId = getStudentId(request.user);
    if (!studentId) {
      response.status(404).json({ message: "Perfil de aluno nao encontrado." });
      return;
    }

    const organizationId = request.user!.organizationId;
    const [student, nextInvoice, overdueCount, latestInvoices, latestAssessment, activeWorkout] = await Promise.all([
      prisma.student.findFirst({
        where: { id: studentId, organizationId, deletedAt: null },
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
        where: { organizationId, studentId, status: { in: ["PENDENTE", "ATRASADO"] } },
        select: invoiceSelect,
        orderBy: { dueDate: "asc" }
      }),
      prisma.invoice.count({
        where: { organizationId, studentId, status: { in: ["PENDENTE", "ATRASADO"] }, dueDate: { lt: new Date() } }
      }),
      prisma.invoice.findMany({
        where: { organizationId, studentId },
        select: invoiceSelect,
        orderBy: { dueDate: "desc" },
        take: 5
      }),
      prisma.physicalAssessment.findFirst({
        where: { organizationId, studentId, deletedAt: null },
        select: assessmentSelect,
        orderBy: { assessedAt: "desc" }
      }),
      prisma.workoutPlan.findFirst({
        where: { organizationId, studentId, isActive: true, deletedAt: null },
        include: workoutInclude,
        orderBy: { createdAt: "desc" }
      })
    ]);

    if (!student) {
      response.status(404).json({ message: "Perfil de aluno nao encontrado." });
      return;
    }

    const invoicesWithCharges = await Promise.all(
      latestInvoices.map(async (invoice) => ({
        ...invoice,
        charges: await calculateInvoiceCharges(organizationId, invoice.dueDate, invoice.amount)
      }))
    );
    const currentPlan = student.studentPlans[0]?.plan ?? latestInvoices.find((invoice) => invoice.plan)?.plan ?? null;
    const nextDueDate = nextInvoice?.dueDate ?? nextDueDateFromPlan(currentPlan?.dueDay ?? null);

    response.json({
      student,
      plan: currentPlan,
      nextInvoice,
      nextDueDate,
      nextInvoiceCharges: nextInvoice ? await calculateInvoiceCharges(organizationId, nextInvoice.dueDate, nextInvoice.amount) : null,
      financialStatus: overdueCount > 0 ? "INADIMPLENTE" : "EM_DIA",
      latestInvoices: invoicesWithCharges,
      latestAssessment,
      activeWorkout
    });
  })
);

studentAreaRouter.get(
  "/financial",
  asyncRoute(async (request, response) => {
    const studentId = getStudentId(request.user);
    if (!studentId) {
      response.status(404).json({ message: "Perfil de aluno nao encontrado." });
      return;
    }

    const organizationId = request.user!.organizationId;
    const invoices = await prisma.invoice.findMany({
      where: { organizationId, studentId },
      select: invoiceSelect,
      orderBy: { dueDate: "desc" }
    });

    response.json({
      invoices: await Promise.all(
        invoices.map(async (invoice) => ({
          ...invoice,
          charges: await calculateInvoiceCharges(organizationId, invoice.dueDate, invoice.amount)
        }))
      )
    });
  })
);

studentAreaRouter.get(
  "/assessments",
  asyncRoute(async (request, response) => {
    const studentId = getStudentId(request.user);
    if (!studentId) {
      response.status(404).json({ message: "Perfil de aluno nao encontrado." });
      return;
    }

    const assessments = await prisma.physicalAssessment.findMany({
      where: { organizationId: request.user!.organizationId, studentId, deletedAt: null },
      select: assessmentSelect,
      orderBy: { assessedAt: "desc" }
    });

    response.json({ assessments });
  })
);

studentAreaRouter.get(
  "/workouts",
  asyncRoute(async (request, response) => {
    const studentId = getStudentId(request.user);
    if (!studentId) {
      response.status(404).json({ message: "Perfil de aluno nao encontrado." });
      return;
    }

    const workouts = await prisma.workoutPlan.findMany({
      where: { organizationId: request.user!.organizationId, studentId, deletedAt: null },
      include: workoutInclude,
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }]
    });

    response.json({ workouts });
  })
);
