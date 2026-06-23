import { Router } from "express";
import { requireAuth, requireRoles } from "../middlewares/auth.js";
import { auditLog } from "../services/audit.service.js";
import { prisma } from "../services/prisma.js";
import { createWorkout, updateWorkout } from "../services/workouts.service.js";
import { asyncRoute } from "../utils/async-route.js";
import { requiredParam } from "../utils/http.js";

export const workoutsRouter = Router();

workoutsRouter.use(requireAuth);
workoutsRouter.use(requireRoles("ADMIN", "PROFESSOR"));

const workoutInclude = {
  student: { select: { id: true, fullName: true } },
  professor: { select: { id: true, name: true } },
  days: { include: { exercises: { orderBy: { order: "asc" as const } } }, orderBy: { label: "asc" as const } }
};

workoutsRouter.get(
  "/",
  asyncRoute(async (request, response) => {
    const studentId = typeof request.query.studentId === "string" ? request.query.studentId : undefined;
    const workouts = await prisma.workoutPlan.findMany({
      where: { organizationId: request.user!.organizationId, deletedAt: null, ...(studentId ? { studentId } : {}) },
      include: workoutInclude,
      orderBy: { createdAt: "desc" }
    });

    response.json({ workouts });
  })
);

workoutsRouter.post(
  "/",
  asyncRoute(async (request, response) => {
    const workout = await createWorkout(request.body, {
      organizationId: request.user!.organizationId,
      actorUserId: request.user!.id
    });

    await auditLog({ organizationId: request.user!.organizationId, actorUserId: request.user!.id, action: "CREATE", entity: "WorkoutPlan", entityId: workout.id });
    response.status(201).json({ workout });
  })
);

workoutsRouter.get(
  "/:id",
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    const workout = await prisma.workoutPlan.findFirst({
      where: { id, organizationId: request.user!.organizationId, deletedAt: null },
      include: workoutInclude
    });

    if (!workout) {
      response.status(404).json({ message: "Ficha de treino nao encontrada." });
      return;
    }

    response.json({ workout });
  })
);

workoutsRouter.put(
  "/:id",
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    const workout = await updateWorkout(id, request.body, {
      organizationId: request.user!.organizationId,
      actorUserId: request.user!.id
    });

    await auditLog({ organizationId: request.user!.organizationId, actorUserId: request.user!.id, action: "UPDATE", entity: "WorkoutPlan", entityId: workout.id });
    response.json({ workout });
  })
);

workoutsRouter.delete(
  "/:id",
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    await prisma.workoutPlan.update({
      where: { id, organizationId: request.user!.organizationId },
      data: { isActive: false }
    });

    await auditLog({ organizationId: request.user!.organizationId, actorUserId: request.user!.id, action: "INACTIVATE", entity: "WorkoutPlan", entityId: id });
    response.status(204).send();
  })
);
