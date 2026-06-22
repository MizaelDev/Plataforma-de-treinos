import { workoutSchema, type WorkoutInput } from "@academia/shared";
import { prisma } from "./prisma.js";
import { AppError } from "../utils/errors.js";
import { parseDate } from "../utils/date.js";

type Context = {
  organizationId: string;
  actorUserId: string;
};

function optionalNumber(value: number | "" | undefined) {
  return value === "" || value === undefined ? null : value;
}

async function ensureStudent(studentId: string, organizationId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, organizationId, deletedAt: null },
    select: { id: true }
  });

  if (!student) throw new AppError(404, "Aluno nao encontrado.");
}

function workoutInclude() {
  return {
    student: { select: { id: true, fullName: true } },
    professor: { select: { id: true, name: true } },
    days: { include: { exercises: { orderBy: { order: "asc" as const } } }, orderBy: { label: "asc" as const } }
  };
}

function buildDays(input: WorkoutInput) {
  return input.days.map((day) => ({
    label: day.label,
    exercises: {
      create: day.exercises.map((exercise, index) => ({
        name: exercise.name.trim(),
        sets: exercise.sets,
        repetitions: exercise.repetitions.trim(),
        load: exercise.load?.trim() || null,
        restSeconds: optionalNumber(exercise.restSeconds),
        notes: exercise.notes?.trim() || null,
        order: exercise.order || index + 1
      }))
    }
  }));
}

async function deactivateOtherActiveWorkouts(studentId: string, organizationId: string, exceptId?: string) {
  await prisma.workoutPlan.updateMany({
    where: {
      organizationId,
      studentId,
      isActive: true,
      deletedAt: null,
      ...(exceptId ? { id: { not: exceptId } } : {})
    },
    data: { isActive: false }
  });
}

export async function createWorkout(payload: unknown, context: Context) {
  const input = workoutSchema.parse(payload);
  if (!context.organizationId) throw new AppError(401, "Sessao invalida. Faca login novamente.");
  await ensureStudent(input.studentId, context.organizationId);

  if (input.isActive) {
    await deactivateOtherActiveWorkouts(input.studentId, context.organizationId);
  }

  return prisma.workoutPlan.create({
    data: {
      organizationId: context.organizationId,
      studentId: input.studentId,
      professorId: input.professorId || context.actorUserId,
      name: input.name.trim(),
      goal: input.goal.trim(),
      startDate: parseDate(input.startDate, "Data de inicio")!,
      endDate: parseDate(input.endDate || undefined, "Data de fim", false),
      isActive: input.isActive,
      days: { create: buildDays(input) }
    },
    include: workoutInclude()
  });
}

export async function updateWorkout(id: string, payload: unknown, context: Context) {
  const input = workoutSchema.parse(payload);
  if (!context.organizationId) throw new AppError(401, "Sessao invalida. Faca login novamente.");
  await ensureStudent(input.studentId, context.organizationId);

  if (input.isActive) {
    await deactivateOtherActiveWorkouts(input.studentId, context.organizationId, id);
  }

  return prisma.$transaction(async (tx) => {
    await tx.workoutDay.deleteMany({ where: { workoutPlanId: id } });

    return tx.workoutPlan.update({
      where: { id, organizationId: context.organizationId },
      data: {
        studentId: input.studentId,
        professorId: input.professorId || context.actorUserId,
        name: input.name.trim(),
        goal: input.goal.trim(),
        startDate: parseDate(input.startDate, "Data de inicio")!,
        endDate: parseDate(input.endDate || undefined, "Data de fim", false),
        isActive: input.isActive,
        days: { create: buildDays(input) }
      },
      include: workoutInclude()
    });
  });
}
