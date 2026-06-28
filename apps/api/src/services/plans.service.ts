import type { PlanInput } from "@academia/shared";
import { defaultPlanAccessForModality, planSchema } from "@academia/shared";
import { AppError } from "../utils/errors.js";
import { prisma } from "./prisma.js";

type PlanContext = {
  organizationId: string;
};

function buildPlanData(input: PlanInput, context: PlanContext) {
  if (!context.organizationId) {
    throw new AppError(401, "Sessão inválida. Faça login novamente.");
  }

  const defaultAccess = defaultPlanAccessForModality(input.modality);

  return {
    organizationId: context.organizationId,
    name: input.name.trim(),
    value: input.value,
    modality: input.modality,
    durationDays: input.durationDays,
    dueDay: input.dueDay,
    allowAssessments: input.allowAssessments ?? defaultAccess.allowAssessments,
    allowWorkouts: input.allowWorkouts ?? defaultAccess.allowWorkouts,
    isActive: input.isActive
  };
}

export async function createPlan(payload: unknown, context: PlanContext) {
  const input = planSchema.parse(payload);
  return prisma.plan.create({
    data: buildPlanData(input, context)
  });
}

export async function updatePlan(id: string, payload: unknown, context: PlanContext) {
  if (!context.organizationId) {
    throw new AppError(401, "Sessão inválida. Faça login novamente.");
  }

  const input = planSchema.partial().parse(payload);
  const defaultAccess = input.modality ? defaultPlanAccessForModality(input.modality) : null;

  return prisma.plan.update({
    where: { id, organizationId: context.organizationId },
    data: {
      ...(input.name && { name: input.name.trim() }),
      ...(input.value !== undefined && { value: input.value }),
      ...(input.modality && { modality: input.modality }),
      ...(input.durationDays !== undefined && { durationDays: input.durationDays }),
      ...(input.dueDay !== undefined && { dueDay: input.dueDay }),
      ...(input.allowAssessments !== undefined
        ? { allowAssessments: input.allowAssessments }
        : defaultAccess
          ? { allowAssessments: defaultAccess.allowAssessments }
          : {}),
      ...(input.allowWorkouts !== undefined
        ? { allowWorkouts: input.allowWorkouts }
        : defaultAccess
          ? { allowWorkouts: defaultAccess.allowWorkouts }
          : {}),
      ...(input.isActive !== undefined && { isActive: input.isActive })
    }
  });
}
