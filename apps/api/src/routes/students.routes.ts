import { Router } from "express";
import { requireAuth, requireRoles } from "../middlewares/auth.js";
import { auditLog } from "../services/audit.service.js";
import { prisma } from "../services/prisma.js";
import { createStudent, updateStudent } from "../services/students.service.js";
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
        phone: true,
        modality: true,
        status: true,
        photoUrl: true,
        enrollmentDate: true,
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
    const student = await createStudent(request.body, {
      organizationId: request.user!.organizationId
    });

    await auditLog({
      organizationId: request.user!.organizationId,
      actorUserId: request.user!.id,
      action: "CREATE",
      entity: "Student",
      entityId: student.id
    });

    response.status(201).json({ student: removeInternalStudentFields(student) });
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
        invoices: { orderBy: { dueDate: "desc" } },
        studentPlans: { include: { plan: true }, orderBy: { createdAt: "desc" } }
      }
    });

    if (!student) {
      response.status(404).json({ message: "Aluno nao encontrado." });
      return;
    }

    response.json({ student: removeInternalStudentFields(student) });
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

studentsRouter.delete(
  "/:id",
  requireRoles("ADMIN"),
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    await prisma.student.update({
      where: { id, organizationId: request.user!.organizationId },
      data: { deletedAt: new Date(), status: "INATIVO" }
    });

    await auditLog({
      organizationId: request.user!.organizationId,
      actorUserId: request.user!.id,
      action: "SOFT_DELETE",
      entity: "Student",
      entityId: id
    });

    response.status(204).send();
  })
);
