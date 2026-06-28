import { assessmentSchema, type AssessmentInput } from "@academia/shared";
import { Prisma } from "@prisma/client";
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

function numberFromGroup(group: Record<string, number | "" | undefined> | undefined, key: string) {
  const value = group?.[key];
  return value === "" || value === undefined ? undefined : value;
}

function optionalNumberFromGroup(group: Record<string, number | "" | undefined> | undefined, key: string) {
  return optionalNumber(numberFromGroup(group, key));
}

function cleanNumericGroup(group: Record<string, number | "" | undefined> | undefined) {
  const entries = Object.entries(group ?? {}).filter(([, value]) => value !== "" && value !== undefined && value !== null);
  return entries.length > 0 ? Object.fromEntries(entries) : Prisma.JsonNull;
}

function calculateBmi(weightKg: number, heightCm: number) {
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(2));
}

async function ensureStudent(studentId: string, organizationId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, organizationId, deletedAt: null },
    select: { id: true }
  });

  if (!student) throw new AppError(404, "Aluno não encontrado.");
}

function buildAssessmentData(input: AssessmentInput, context: Context) {
  if (!context.organizationId) throw new AppError(401, "Sessão inválida. Faça login novamente.");

  const bioimpedance = cleanNumericGroup(input.bioimpedance);
  const anthropometry = cleanNumericGroup(input.anthropometry);
  const skinfolds = cleanNumericGroup(input.skinfolds);
  const physicalTests = cleanNumericGroup(input.physicalTests);

  return {
    organizationId: context.organizationId,
    studentId: input.studentId,
    professorId: input.professorId || context.actorUserId,
    assessedAt: parseDate(input.assessedAt, "Data da avaliação")!,
    startDate: parseDate(input.startDate || undefined, "Data de início", false),
    trainingGoals: input.trainingGoals ?? [],
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    bmi: calculateBmi(input.weightKg, input.heightCm),
    bodyFatPercentage: optionalNumber(input.bodyFatPercentage) ?? optionalNumberFromGroup(input.bioimpedance, "bodyFatPercentage"),
    muscleMassKg: optionalNumber(input.muscleMassKg) ?? optionalNumberFromGroup(input.bioimpedance, "muscleMassKg"),
    abdominalCircumferenceCm: optionalNumber(input.abdominalCircumferenceCm) ?? optionalNumberFromGroup(input.anthropometry, "abdomenCm"),
    armCircumferenceCm: optionalNumber(input.armCircumferenceCm),
    leftArmCircumferenceCm: optionalNumber(input.leftArmCircumferenceCm) ?? optionalNumberFromGroup(input.anthropometry, "leftArmCm"),
    rightArmCircumferenceCm: optionalNumber(input.rightArmCircumferenceCm) ?? optionalNumberFromGroup(input.anthropometry, "rightArmCm"),
    leftLegCircumferenceCm: optionalNumber(input.leftLegCircumferenceCm) ?? optionalNumberFromGroup(input.anthropometry, "leftThighCm"),
    rightLegCircumferenceCm: optionalNumber(input.rightLegCircumferenceCm) ?? optionalNumberFromGroup(input.anthropometry, "rightThighCm"),
    chestCircumferenceCm: optionalNumber(input.chestCircumferenceCm) ?? optionalNumberFromGroup(input.anthropometry, "chestCm"),
    shoulderCircumferenceCm: optionalNumber(input.shoulderCircumferenceCm) ?? optionalNumberFromGroup(input.anthropometry, "shoulderCm"),
    gluteCircumferenceCm: optionalNumber(input.gluteCircumferenceCm),
    leftCalfCircumferenceCm: optionalNumber(input.leftCalfCircumferenceCm) ?? optionalNumberFromGroup(input.anthropometry, "leftCalfCm"),
    rightCalfCircumferenceCm: optionalNumber(input.rightCalfCircumferenceCm) ?? optionalNumberFromGroup(input.anthropometry, "rightCalfCm"),
    waistCircumferenceCm: optionalNumber(input.waistCircumferenceCm) ?? optionalNumberFromGroup(input.anthropometry, "waistCm"),
    hipCircumferenceCm: optionalNumber(input.hipCircumferenceCm) ?? optionalNumberFromGroup(input.anthropometry, "hipCm"),
    bioimpedance,
    anthropometry,
    anthropometryMeasuredAt: parseDate(input.anthropometryMeasuredAt || undefined, "Data da medição antropométrica", false),
    skinfolds,
    skinfoldsMeasuredAt: parseDate(input.skinfoldsMeasuredAt || undefined, "Data da medição de dobras", false),
    physicalTests,
    notes: input.notes?.trim() || null
  };
}

export async function createAssessment(payload: unknown, context: Context) {
  const input = assessmentSchema.parse(payload);
  await ensureStudent(input.studentId, context.organizationId);
  await ensureStudentPlanAllows(input.studentId, context.organizationId, "assessments");

  return prisma.physicalAssessment.create({
    data: buildAssessmentData(input, context),
    include: { student: { select: { id: true, fullName: true } }, professor: { select: { id: true, name: true } } }
  });
}

export async function updateAssessment(id: string, payload: unknown, context: Context) {
  const input = assessmentSchema.parse(payload);
  await ensureStudent(input.studentId, context.organizationId);
  await ensureStudentPlanAllows(input.studentId, context.organizationId, "assessments");

  return prisma.physicalAssessment.update({
    where: { id, organizationId: context.organizationId },
    data: buildAssessmentData(input, context),
    include: { student: { select: { id: true, fullName: true } }, professor: { select: { id: true, name: true } } }
  });
}
