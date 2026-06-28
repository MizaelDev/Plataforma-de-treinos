import { Router } from "express";
import { requireAuth, requireRoles } from "../middlewares/auth.js";
import { auditLog } from "../services/audit.service.js";
import { createExerciseLibraryItem, updateExerciseLibraryItem } from "../services/exercises.service.js";
import { prisma } from "../services/prisma.js";
import { asyncRoute } from "../utils/async-route.js";
import { requiredParam } from "../utils/http.js";

export const exercisesRouter = Router();

exercisesRouter.use(requireAuth);
exercisesRouter.use(requireRoles("ADMIN", "PROFESSOR"));

exercisesRouter.get(
  "/",
  asyncRoute(async (request, response) => {
    const { search, category, modality, difficultyLevel, active } = request.query;
    const searchTerm = typeof search === "string" ? search.trim() : "";

    const exercises = await prisma.exerciseLibrary.findMany({
      where: {
        organizationId: request.user!.organizationId,
        deletedAt: null,
        ...(active === "true" ? { isActive: true } : {}),
        ...(active === "false" ? { isActive: false } : {}),
        ...(typeof category === "string" && category ? { category } : {}),
        ...(typeof modality === "string" && modality ? { modality } : {}),
        ...(typeof difficultyLevel === "string" && difficultyLevel ? { difficultyLevel } : {}),
        ...(searchTerm
          ? {
              OR: [
                { name: { contains: searchTerm, mode: "insensitive" } },
                { muscleGroup: { contains: searchTerm, mode: "insensitive" } },
                { description: { contains: searchTerm, mode: "insensitive" } }
              ]
            }
          : {})
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }]
    });

    response.json({ exercises });
  })
);

exercisesRouter.post(
  "/",
  asyncRoute(async (request, response) => {
    const exercise = await createExerciseLibraryItem(request.body, {
      organizationId: request.user!.organizationId
    });

    await auditLog({ organizationId: request.user!.organizationId, actorUserId: request.user!.id, action: "CREATE", entity: "ExerciseLibrary", entityId: exercise.id });
    response.status(201).json({ exercise });
  })
);

exercisesRouter.get(
  "/:id",
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    const exercise = await prisma.exerciseLibrary.findFirst({
      where: { id, organizationId: request.user!.organizationId, deletedAt: null }
    });

    if (!exercise) {
      response.status(404).json({ message: "Exercício não encontrado." });
      return;
    }

    response.json({ exercise });
  })
);

exercisesRouter.put(
  "/:id",
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    const exercise = await updateExerciseLibraryItem(id, request.body, {
      organizationId: request.user!.organizationId
    });

    await auditLog({ organizationId: request.user!.organizationId, actorUserId: request.user!.id, action: "UPDATE", entity: "ExerciseLibrary", entityId: exercise.id });
    response.json({ exercise });
  })
);

exercisesRouter.delete(
  "/:id",
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    await prisma.exerciseLibrary.update({
      where: { id, organizationId: request.user!.organizationId },
      data: { isActive: false, deletedAt: new Date() }
    });

    await auditLog({ organizationId: request.user!.organizationId, actorUserId: request.user!.id, action: "INACTIVATE", entity: "ExerciseLibrary", entityId: id });
    response.status(204).send();
  })
);
