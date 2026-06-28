import { workoutSchema, type WorkoutInput } from "@academia/shared";
import { prisma } from "./prisma.js";
import { AppError } from "../utils/errors.js";
import { parseDate } from "../utils/date.js";
import { ensureStudentPlanAllows } from "./plan-access.service.js";

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

  if (!student) throw new AppError(404, "Aluno não encontrado.");
}

function workoutInclude() {
  return {
    student: { select: { id: true, fullName: true } },
    professor: { select: { id: true, name: true } },
    days: {
      include: {
        exercises: {
          include: { libraryExercise: true },
          orderBy: { order: "asc" as const }
        }
      },
      orderBy: { label: "asc" as const }
    }
  };
}

async function ensureLibraryExercises(input: WorkoutInput, organizationId: string) {
  const libraryIds = [
    ...new Set(
      input.days.flatMap((day) =>
        day.exercises
          .map((exercise) => exercise.libraryExerciseId)
          .filter((id): id is string => Boolean(id))
      )
    )
  ];
  if (libraryIds.length === 0) return;

  const total = await prisma.exerciseLibrary.count({
    where: {
      organizationId,
      id: { in: libraryIds },
      isActive: true,
      deletedAt: null
    }
  });

  if (total !== libraryIds.length) {
    throw new AppError(400, "Um ou mais exercícios da biblioteca não foram encontrados ou estão inativos.");
  }
}

function buildDays(input: WorkoutInput) {
  return input.days.map((day) => ({
    label: day.label,
    exercises: {
      create: day.exercises.map((exercise, index) => ({
        libraryExerciseId: exercise.libraryExerciseId || null,
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
  if (!context.organizationId) throw new AppError(401, "Sessão inválida. Faça login novamente.");
  await ensureStudent(input.studentId, context.organizationId);
  await ensureStudentPlanAllows(input.studentId, context.organizationId, "workouts");
  await ensureLibraryExercises(input, context.organizationId);

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
      startDate: parseDate(input.startDate, "Data de início")!,
      endDate: parseDate(input.endDate || undefined, "Data de fim", false),
      isActive: input.isActive,
      days: { create: buildDays(input) }
    },
    include: workoutInclude()
  });
}

export async function updateWorkout(id: string, payload: unknown, context: Context) {
  const input = workoutSchema.parse(payload);
  if (!context.organizationId) throw new AppError(401, "Sessão inválida. Faça login novamente.");

  const existingWorkout = await prisma.workoutPlan.findFirst({
    where: { id, organizationId: context.organizationId, deletedAt: null },
    select: { id: true }
  });

  if (!existingWorkout) {
    throw new AppError(404, "Ficha de treino não encontrada.");
  }

  await ensureStudent(input.studentId, context.organizationId);
  await ensureStudentPlanAllows(input.studentId, context.organizationId, "workouts");
  await ensureLibraryExercises(input, context.organizationId);

  if (input.isActive) {
    await deactivateOtherActiveWorkouts(input.studentId, context.organizationId, id);
  }

  return prisma.$transaction(async (tx) => {
    await tx.workoutDay.deleteMany({ where: { workoutPlanId: id, workoutPlan: { organizationId: context.organizationId } } });

    return tx.workoutPlan.update({
      where: { id, organizationId: context.organizationId },
      data: {
        studentId: input.studentId,
        professorId: input.professorId || context.actorUserId,
        name: input.name.trim(),
        goal: input.goal.trim(),
        startDate: parseDate(input.startDate, "Data de início")!,
        endDate: parseDate(input.endDate || undefined, "Data de fim", false),
        isActive: input.isActive,
        days: { create: buildDays(input) }
      },
      include: workoutInclude()
    });
  });
}
