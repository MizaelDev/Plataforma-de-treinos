import type { PlanInput } from "@academia/shared";
import { planSchema } from "@academia/shared";
import { AppError } from "../utils/errors.js";
import { prisma } from "./prisma.js";

type PlanContext = {
  organizationId: string;
};

function buildPlanData(input: PlanInput, context: PlanContext) {
  if (!context.organizationId) {
    throw new AppError(401, "Sessao invalida. Faca login novamente.");
  }

  return {
    organizationId: context.organizationId,
    name: input.name.trim(),
    value: input.value,
    modality: input.modality.trim(),
    durationDays: input.durationDays,
    dueDay: input.dueDay,
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
    throw new AppError(401, "Sessao invalida. Faca login novamente.");
  }

  const input = planSchema.partial().parse(payload);

  return prisma.plan.update({
    where: { id, organizationId: context.organizationId },
    data: {
      ...(input.name && { name: input.name.trim() }),
      ...(input.value !== undefined && { value: input.value }),
      ...(input.modality && { modality: input.modality.trim() }),
      ...(input.durationDays !== undefined && { durationDays: input.durationDays }),
      ...(input.dueDay !== undefined && { dueDay: input.dueDay }),
      ...(input.isActive !== undefined && { isActive: input.isActive })
    }
  });
}
