import { exerciseLibrarySchema, type ExerciseLibraryInput } from "@academia/shared";
import { AppError } from "../utils/errors.js";
import { prisma } from "./prisma.js";

type ExerciseContext = {
  organizationId: string;
};

function optionalText(value?: string | null) {
  return value?.trim() || null;
}

function buildExerciseData(input: ExerciseLibraryInput, context: ExerciseContext) {
  if (!context.organizationId) {
    throw new AppError(401, "Sessão inválida. Faça login novamente.");
  }

  return {
    organizationId: context.organizationId,
    name: input.name.trim(),
    category: input.category,
    modality: input.modality,
    muscleGroup: optionalText(input.muscleGroup),
    description: optionalText(input.description),
    executionInstructions: optionalText(input.executionInstructions),
    commonMistakes: optionalText(input.commonMistakes),
    difficultyLevel: input.difficultyLevel,
    mediaType: input.mediaType,
    mediaUrl: input.mediaUrl.trim(),
    thumbnailUrl: optionalText(input.thumbnailUrl),
    isActive: input.isActive
  };
}

export async function createExerciseLibraryItem(payload: unknown, context: ExerciseContext) {
  const input = exerciseLibrarySchema.parse(payload);

  return prisma.exerciseLibrary.create({
    data: buildExerciseData(input, context)
  });
}

export async function updateExerciseLibraryItem(id: string, payload: unknown, context: ExerciseContext) {
  if (!context.organizationId) {
    throw new AppError(401, "Sessão inválida. Faça login novamente.");
  }

  const input = exerciseLibrarySchema.parse(payload);

  return prisma.exerciseLibrary.update({
    where: { id, organizationId: context.organizationId },
    data: buildExerciseData(input, context)
  });
}
