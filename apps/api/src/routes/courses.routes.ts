import { Router } from "express";
import { courseSchema } from "@academia/shared";
import { requireAuth, requireRoles } from "../middlewares/auth.js";
import { auditLog } from "../services/audit.service.js";
import { prisma } from "../services/prisma.js";
import { asyncRoute } from "../utils/async-route.js";
import { requiredParam } from "../utils/http.js";

export const coursesRouter = Router();

coursesRouter.use(requireAuth);
coursesRouter.use(requireRoles("ADMIN", "PROFESSOR"));

function optionalText(value?: string | null) {
  return value?.trim() || null;
}

function lessonData(lessons: ReturnType<typeof courseSchema.parse>["lessons"]) {
  return lessons.map((lesson, index) => ({
    title: lesson.title.trim(),
    description: optionalText(lesson.description),
    videoUrl: optionalText(lesson.videoUrl),
    thumbnailUrl: optionalText(lesson.thumbnailUrl),
    videoProvider: lesson.videoProvider,
    durationSeconds: lesson.durationSeconds === "" ? null : lesson.durationSeconds,
    isPreview: lesson.isPreview,
    order: Number(lesson.order ?? index)
  }));
}

coursesRouter.get(
  "/",
  asyncRoute(async (request, response) => {
    const courses = await prisma.course.findMany({
      where: { organizationId: request.user!.organizationId, deletedAt: null },
      include: { lessons: { where: { deletedAt: null }, orderBy: { order: "asc" } } },
      orderBy: [{ isActive: "desc" }, { title: "asc" }]
    });

    response.json({ courses });
  })
);

coursesRouter.post(
  "/",
  asyncRoute(async (request, response) => {
    const input = courseSchema.parse(request.body);
    const course = await prisma.course.create({
      data: {
        organizationId: request.user!.organizationId,
        title: input.title.trim(),
        description: optionalText(input.description),
        isActive: input.isActive,
        lessons: { create: lessonData(input.lessons) }
      },
      include: { lessons: { orderBy: { order: "asc" } } }
    });

    await auditLog({ organizationId: request.user!.organizationId, actorUserId: request.user!.id, action: "CREATE", entity: "Course", entityId: course.id });
    response.status(201).json({ course });
  })
);

coursesRouter.get(
  "/:id",
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    const course = await prisma.course.findFirst({
      where: { id, organizationId: request.user!.organizationId, deletedAt: null },
      include: { lessons: { where: { deletedAt: null }, orderBy: { order: "asc" } } }
    });

    if (!course) {
      response.status(404).json({ message: "Curso não encontrado." });
      return;
    }

    response.json({ course });
  })
);

coursesRouter.put(
  "/:id",
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    const input = courseSchema.parse(request.body);
    const existing = await prisma.course.findFirst({ where: { id, organizationId: request.user!.organizationId, deletedAt: null }, select: { id: true } });

    if (!existing) {
      response.status(404).json({ message: "Curso não encontrado." });
      return;
    }

    const course = await prisma.$transaction(async (tx) => {
      await tx.courseLesson.deleteMany({ where: { courseId: id } });
      return tx.course.update({
        where: { id },
        data: {
          title: input.title.trim(),
          description: optionalText(input.description),
          isActive: input.isActive,
          lessons: { create: lessonData(input.lessons) }
        },
        include: { lessons: { orderBy: { order: "asc" } } }
      });
    });

    await auditLog({ organizationId: request.user!.organizationId, actorUserId: request.user!.id, action: "UPDATE", entity: "Course", entityId: course.id });
    response.json({ course });
  })
);

coursesRouter.delete(
  "/:id",
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    await prisma.course.update({
      where: { id, organizationId: request.user!.organizationId },
      data: { isActive: false, deletedAt: new Date() }
    });

    await auditLog({ organizationId: request.user!.organizationId, actorUserId: request.user!.id, action: "INACTIVATE", entity: "Course", entityId: id });
    response.status(204).send();
  })
);
