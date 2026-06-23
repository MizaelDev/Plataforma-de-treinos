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
  student: { select: { id: true, fullName: true } },
  professor: { select: { id: true, name: true } },
  days: {
    include: { exercises: { orderBy: { order: "asc" as const } } },
    orderBy: { label: "asc" as const }
  }
};

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
            include: { plan: true },
            take: 1
          }
        }
      }),
      prisma.invoice.findFirst({
        where: { organizationId, studentId, status: { in: ["PENDENTE", "ATRASADO"] } },
        include: { plan: true },
        orderBy: { dueDate: "asc" }
      }),
      prisma.invoice.count({
        where: { organizationId, studentId, status: { in: ["PENDENTE", "ATRASADO"] }, dueDate: { lt: new Date() } }
      }),
      prisma.invoice.findMany({
        where: { organizationId, studentId },
        include: { plan: true },
        orderBy: { dueDate: "desc" },
        take: 5
      }),
      prisma.physicalAssessment.findFirst({
        where: { organizationId, studentId, deletedAt: null },
        include: { professor: { select: { id: true, name: true } } },
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

    response.json({
      student,
      plan: student.studentPlans[0]?.plan ?? null,
      nextInvoice,
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
      include: { plan: true },
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
      include: { professor: { select: { id: true, name: true } } },
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
