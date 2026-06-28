import { AppError } from "../utils/errors.js";
import { prisma } from "./prisma.js";

type PlanFeature = "assessments" | "workouts";

export async function getActivePlanAccess(studentId: string, organizationId: string) {
  const activePlan = await prisma.studentPlan.findFirst({
    where: { studentId, isActive: true, student: { organizationId, deletedAt: null } },
    include: {
      plan: {
        select: {
          id: true,
          name: true,
          allowAssessments: true,
          allowWorkouts: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return {
    plan: activePlan?.plan ?? null,
    allowFinancial: true,
    allowAssessments: activePlan?.plan.allowAssessments ?? false,
    allowWorkouts: activePlan?.plan.allowWorkouts ?? false
  };
}

export async function ensureStudentPlanAllows(studentId: string, organizationId: string, feature: PlanFeature) {
  const access = await getActivePlanAccess(studentId, organizationId);
  const allowed = feature === "assessments" ? access.allowAssessments : access.allowWorkouts;

  if (!access.plan) {
    throw new AppError(403, "Vincule um plano ativo ao aluno antes de liberar este recurso.");
  }

  if (!allowed) {
    throw new AppError(403, `O plano ativo "${access.plan.name}" não permite ${feature === "assessments" ? "avaliações" : "treinos"}.`);
  }

  return access;
}
