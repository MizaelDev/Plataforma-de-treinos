import { Router } from "express";
import { planSchema } from "@academia/shared";
import { requireAuth, requireRoles } from "../middlewares/auth.js";
import { auditLog } from "../services/audit.service.js";
import { createPlan, updatePlan } from "../services/plans.service.js";
import { prisma } from "../services/prisma.js";
import { asyncRoute } from "../utils/async-route.js";
import { requiredParam } from "../utils/http.js";

export const plansRouter = Router();

plansRouter.use(requireAuth);

plansRouter.get(
  "/",
  requireRoles("ADMIN", "PROFESSOR"),
  asyncRoute(async (request, response) => {
    const plans = await prisma.plan.findMany({
      where: { organizationId: request.user!.organizationId, deletedAt: null },
      orderBy: { name: "asc" }
    });
    response.json({ plans });
  })
);

plansRouter.post(
  "/",
  requireRoles("ADMIN"),
  asyncRoute(async (request, response) => {
    const plan = await createPlan(request.body, {
      organizationId: request.user!.organizationId
    });
    await auditLog({ organizationId: request.user!.organizationId, actorUserId: request.user!.id, action: "CREATE", entity: "Plan", entityId: plan.id });
    response.status(201).json({ plan });
  })
);

plansRouter.get(
  "/:id",
  requireRoles("ADMIN", "PROFESSOR"),
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    const plan = await prisma.plan.findFirst({
      where: { id, organizationId: request.user!.organizationId, deletedAt: null }
    });

    if (!plan) {
      response.status(404).json({ message: "Plano nao encontrado." });
      return;
    }

    response.json({ plan });
  })
);

plansRouter.patch(
  "/:id",
  requireRoles("ADMIN"),
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    const plan = await updatePlan(id, request.body, {
      organizationId: request.user!.organizationId
    });
    await auditLog({ organizationId: request.user!.organizationId, actorUserId: request.user!.id, action: "UPDATE", entity: "Plan", entityId: plan.id });
    response.json({ plan });
  })
);

plansRouter.delete(
  "/:id",
  requireRoles("ADMIN"),
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    await prisma.plan.update({
      where: { id, organizationId: request.user!.organizationId },
      data: { deletedAt: new Date(), isActive: false }
    });
    await auditLog({ organizationId: request.user!.organizationId, actorUserId: request.user!.id, action: "SOFT_DELETE", entity: "Plan", entityId: id });
    response.status(204).send();
  })
);
