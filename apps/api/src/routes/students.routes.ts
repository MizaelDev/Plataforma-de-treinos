import { Router } from "express";
import { requireAuth, requireRoles } from "../middlewares/auth.js";
import { auditLog } from "../services/audit.service.js";
import { calculateInvoiceCharges } from "../services/finance.service.js";
import { safePaymentTransactionSelect } from "../services/payments.service.js";
import { prisma } from "../services/prisma.js";
import { createOrResetStudentAccess, createStudent, updateStudent } from "../services/students.service.js";
import { changeStudentCurrentPlan } from "../services/student-plans.service.js";
import { releaseDeletedStudentIdentity } from "../services/student-identity.service.js";
import { asyncRoute } from "../utils/async-route.js";
import { requiredParam } from "../utils/http.js";

export const studentsRouter = Router();

studentsRouter.use(requireAuth);

function removeInternalStudentFields<T extends { cpfHash?: string }>(student: T) {
  const { cpfHash: _cpfHash, ...safeStudent } = student;
  return safeStudent;
}

studentsRouter.get(
  "/",
  requireRoles("ADMIN", "PROFESSOR"),
  asyncRoute(async (request, response) => {
    const students = await prisma.student.findMany({
      where: { organizationId: request.user!.organizationId, deletedAt: null },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        cpf: true,
        birthDate: true,
        phone: true,
        address: true,
        modality: true,
        notes: true,
        status: true,
        photoUrl: true,
        enrollmentDate: true,
        user: { select: { id: true, email: true, isActive: true } },
        studentPlans: {
          where: { isActive: true },
          include: { plan: true },
          take: 1
        }
      }
    });

    response.json({ students });
  })
);

studentsRouter.post(
  "/",
  requireRoles("ADMIN", "PROFESSOR"),
  asyncRoute(async (request, response) => {
    const result = await createStudent(request.body, {
      organizationId: request.user!.organizationId
    });

    await auditLog({
      organizationId: request.user!.organizationId,
      actorUserId: request.user!.id,
      action: "CREATE",
      entity: "Student",
      entityId: result.student.id
    });

    response.status(201).json({ student: removeInternalStudentFields(result.student), access: result.access });
  })
);

studentsRouter.get(
  "/:id",
  requireRoles("ADMIN", "PROFESSOR"),
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    const student = await prisma.student.findFirst({
      where: { id, organizationId: request.user!.organizationId, deletedAt: null },
      include: {
        invoices: {
          include: {
            plan: true,
            paymentTransactions: { select: safePaymentTransactionSelect, orderBy: { createdAt: "desc" }, take: 1 }
          },
          orderBy: { dueDate: "desc" }
        },
        studentPlans: { include: { plan: true }, orderBy: { createdAt: "desc" } },
        assessments: {
          where: { deletedAt: null },
          include: { professor: { select: { id: true, name: true } } },
          orderBy: { assessedAt: "desc" }
        },
        workoutPlans: {
          where: { deletedAt: null },
          include: {
            professor: { select: { id: true, name: true } },
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
          orderBy: [{ isActive: "desc" }, { createdAt: "desc" }]
        },
        user: { select: { id: true, email: true, isActive: true, updatedAt: true } }
      }
    });

    if (!student) {
      response.status(404).json({ message: "Aluno não encontrado." });
      return;
    }

    response.json({
      student: {
        ...removeInternalStudentFields(student),
        invoices: await Promise.all(
          student.invoices.map(async (invoice) => ({
            ...invoice,
            charges: await calculateInvoiceCharges(request.user!.organizationId, invoice.dueDate, invoice.amount)
          }))
        )
      }
    });
  })
);

studentsRouter.patch(
  "/:id",
  requireRoles("ADMIN", "PROFESSOR"),
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    const student = await updateStudent(id, request.body, {
      organizationId: request.user!.organizationId
    });

    await auditLog({
      organizationId: request.user!.organizationId,
      actorUserId: request.user!.id,
      action: "UPDATE",
      entity: "Student",
      entityId: student.id
    });

    response.json({ student: removeInternalStudentFields(student) });
  })
);

studentsRouter.post(
  "/:id/access",
  requireRoles("ADMIN"),
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    const access = await createOrResetStudentAccess(id, {
      organizationId: request.user!.organizationId
    });

    await auditLog({
      organizationId: request.user!.organizationId,
      actorUserId: request.user!.id,
      action: access.created ? "CREATE_ACCESS" : "RESET_ACCESS",
      entity: "Student",
      entityId: id,
      metadata: { userId: access.user.id }
    });

    response.json({
      access: {
        userId: access.user.id,
        email: access.user.email,
        isActive: access.user.isActive,
        created: access.created,
        setupEmailSent: access.setupEmailSent,
        setupEmailError: access.setupEmailError
      }
    });
  })
);

studentsRouter.post(
  "/:id/plan",
  requireRoles("ADMIN", "PROFESSOR"),
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    const result = await changeStudentCurrentPlan(id, request.body, {
      organizationId: request.user!.organizationId
    });

    await auditLog({
      organizationId: request.user!.organizationId,
      actorUserId: request.user!.id,
      action: "CHANGE_PLAN",
      entity: "Student",
      entityId: id,
      metadata: {
        studentPlanId: result.studentPlan.id,
        planId: result.studentPlan.planId,
        invoiceId: result.invoice?.id ?? null
      }
    });

    response.status(201).json(result);
  })
);

studentsRouter.delete(
  "/:id",
  requireRoles("ADMIN"),
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    const student = await prisma.student.findFirst({
      where: { id, organizationId: request.user!.organizationId, deletedAt: null },
      select: { id: true, userId: true, cpfHash: true, email: true }
    });

    if (!student) {
      response.status(404).json({ message: "Aluno não encontrado." });
      return;
    }

    await prisma.$transaction([
      prisma.student.update({
        where: { id: student.id },
        data: { status: "INATIVO", deletedAt: new Date() }
      }),
      ...(student.userId
        ? [
            prisma.user.update({
              where: { id: student.userId },
              data: { isActive: false }
            })
          ]
        : [])
    ]);

    await releaseDeletedStudentIdentity({
      organizationId: request.user!.organizationId,
      cpfHash: student.cpfHash,
      email: student.email
    });

    await auditLog({
      organizationId: request.user!.organizationId,
      actorUserId: request.user!.id,
      action: "DELETE",
      entity: "Student",
      entityId: id
    });

    response.status(204).send();
  })
);
