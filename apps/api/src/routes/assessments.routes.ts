import { Router } from "express";
import { requireAuth, requireRoles } from "../middlewares/auth.js";
import { auditLog } from "../services/audit.service.js";
import { createAssessment, updateAssessment } from "../services/assessments.service.js";
import { prisma } from "../services/prisma.js";
import { asyncRoute } from "../utils/async-route.js";
import { requiredParam } from "../utils/http.js";

export const assessmentsRouter = Router();

assessmentsRouter.use(requireAuth);
assessmentsRouter.use(requireRoles("ADMIN", "PROFESSOR"));

assessmentsRouter.get(
  "/",
  asyncRoute(async (request, response) => {
    const studentId = typeof request.query.studentId === "string" ? request.query.studentId : undefined;
    const assessments = await prisma.physicalAssessment.findMany({
      where: { organizationId: request.user!.organizationId, deletedAt: null, ...(studentId ? { studentId } : {}) },
      include: { student: { select: { id: true, fullName: true } }, professor: { select: { id: true, name: true } } },
      orderBy: { assessedAt: "desc" }
    });

    response.json({ assessments });
  })
);

assessmentsRouter.post(
  "/",
  asyncRoute(async (request, response) => {
    const assessment = await createAssessment(request.body, {
      organizationId: request.user!.organizationId,
      actorUserId: request.user!.id
    });

    await auditLog({ organizationId: request.user!.organizationId, actorUserId: request.user!.id, action: "CREATE", entity: "PhysicalAssessment", entityId: assessment.id });
    response.status(201).json({ assessment });
  })
);

assessmentsRouter.get(
  "/:id",
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    const assessment = await prisma.physicalAssessment.findFirst({
      where: { id, organizationId: request.user!.organizationId, deletedAt: null },
      include: { student: { select: { id: true, fullName: true } }, professor: { select: { id: true, name: true } } }
    });

    if (!assessment) {
      response.status(404).json({ message: "Avaliacao nao encontrada." });
      return;
    }

    const history = await prisma.physicalAssessment.findMany({
      where: { organizationId: request.user!.organizationId, studentId: assessment.studentId, deletedAt: null },
      orderBy: { assessedAt: "desc" },
      take: 10
    });

    response.json({ assessment, history });
  })
);

assessmentsRouter.put(
  "/:id",
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    const assessment = await updateAssessment(id, request.body, {
      organizationId: request.user!.organizationId,
      actorUserId: request.user!.id
    });

    await auditLog({ organizationId: request.user!.organizationId, actorUserId: request.user!.id, action: "UPDATE", entity: "PhysicalAssessment", entityId: assessment.id });
    response.json({ assessment });
  })
);

assessmentsRouter.delete(
  "/:id",
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    await prisma.physicalAssessment.update({
      where: { id, organizationId: request.user!.organizationId },
      data: { deletedAt: new Date() }
    });

    await auditLog({ organizationId: request.user!.organizationId, actorUserId: request.user!.id, action: "SOFT_DELETE", entity: "PhysicalAssessment", entityId: id });
    response.status(204).send();
  })
);
