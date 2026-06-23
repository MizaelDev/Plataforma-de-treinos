import { assessmentSchema, type AssessmentInput } from "@academia/shared";
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

function calculateBmi(weightKg: number, heightCm: number) {
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(2));
}

async function ensureStudent(studentId: string, organizationId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, organizationId, deletedAt: null },
    select: { id: true }
  });

  if (!student) throw new AppError(404, "Aluno nao encontrado.");
}

function buildAssessmentData(input: AssessmentInput, context: Context) {
  if (!context.organizationId) throw new AppError(401, "Sessao invalida. Faca login novamente.");

  return {
    organizationId: context.organizationId,
    studentId: input.studentId,
    professorId: input.professorId || context.actorUserId,
    assessedAt: parseDate(input.assessedAt, "Data da avaliacao")!,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    bmi: calculateBmi(input.weightKg, input.heightCm),
    bodyFatPercentage: optionalNumber(input.bodyFatPercentage),
    muscleMassKg: optionalNumber(input.muscleMassKg),
    abdominalCircumferenceCm: optionalNumber(input.abdominalCircumferenceCm),
    armCircumferenceCm: optionalNumber(input.armCircumferenceCm),
    leftArmCircumferenceCm: optionalNumber(input.leftArmCircumferenceCm),
    rightArmCircumferenceCm: optionalNumber(input.rightArmCircumferenceCm),
    leftLegCircumferenceCm: optionalNumber(input.leftLegCircumferenceCm),
    rightLegCircumferenceCm: optionalNumber(input.rightLegCircumferenceCm),
    chestCircumferenceCm: optionalNumber(input.chestCircumferenceCm),
    shoulderCircumferenceCm: optionalNumber(input.shoulderCircumferenceCm),
    gluteCircumferenceCm: optionalNumber(input.gluteCircumferenceCm),
    leftCalfCircumferenceCm: optionalNumber(input.leftCalfCircumferenceCm),
    rightCalfCircumferenceCm: optionalNumber(input.rightCalfCircumferenceCm),
    waistCircumferenceCm: optionalNumber(input.waistCircumferenceCm),
    hipCircumferenceCm: optionalNumber(input.hipCircumferenceCm),
    notes: input.notes?.trim() || null
  };
}

export async function createAssessment(payload: unknown, context: Context) {
  const input = assessmentSchema.parse(payload);
  await ensureStudent(input.studentId, context.organizationId);

  return prisma.physicalAssessment.create({
    data: buildAssessmentData(input, context),
    include: { student: { select: { id: true, fullName: true } }, professor: { select: { id: true, name: true } } }
  });
}

export async function updateAssessment(id: string, payload: unknown, context: Context) {
  const input = assessmentSchema.parse(payload);
  await ensureStudent(input.studentId, context.organizationId);

  return prisma.physicalAssessment.update({
    where: { id, organizationId: context.organizationId },
    data: buildAssessmentData(input, context),
    include: { student: { select: { id: true, fullName: true } }, professor: { select: { id: true, name: true } } }
  });
}
