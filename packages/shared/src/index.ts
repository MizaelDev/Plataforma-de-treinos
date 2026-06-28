import { z } from "zod";

export const roles = ["ADMIN", "PROFESSOR", "ALUNO"] as const;
export const invoiceStatuses = ["PAGO", "PENDENTE", "ATRASADO", "CANCELADO"] as const;
export const studentStatuses = ["ATIVO", "INATIVO"] as const;
export const planModalities = ["MUSCULAÇÃO", "LUTA", "MOBILIDADE", "FUNCIONAL", "ALONGAMENTO", "PERSONAL", "CONDICIONAMENTO"] as const;
export const workoutDayLabels = ["A", "B", "C", "D", "E"] as const;
export const exerciseMediaTypes = ["IMAGE", "GIF", "VIDEO", "EXTERNAL_URL"] as const;
export const exerciseDifficultyLevels = ["INICIANTE", "INTERMEDIARIO", "AVANCADO"] as const;
export const exerciseModalities = ["Musculação", "Mobilidade", "Alongamento", "Funcional", "Muay Thai", "Karatê", "Condicionamento físico"] as const;
export const exerciseCategories = [
  "Força",
  "Core",
  "Cardio",
  "Mobilidade de quadril",
  "Mobilidade torácica",
  "Mobilidade de ombro",
  "Mobilidade de tornozelo",
  "Mobilidade de coluna",
  "Alongamento dinâmico",
  "Alongamento estático",
  "Funcional com peso corporal",
  "Funcional com acessórios",
  "Técnica",
  "Condicionamento"
] as const;
export const enrollmentModalities = ["Musculação", "Mobilidade", "Muay Thai", "Karatê", "Funcional", "Personal Trainer", "Condicionamento físico"] as const;
export const trainingGoals = ["Hipertrofia", "Fortalecimento", "Definição", "Saúde/Bem-estar", "Emagrecimento", "Preparação física"] as const;

export type Role = (typeof roles)[number];
export type InvoiceStatus = (typeof invoiceStatuses)[number];
export type StudentStatus = (typeof studentStatuses)[number];
export type PlanModality = (typeof planModalities)[number];
export type ExerciseMediaType = (typeof exerciseMediaTypes)[number];
export type ExerciseDifficultyLevel = (typeof exerciseDifficultyLevels)[number];
export type ExerciseModality = (typeof exerciseModalities)[number];
export type EnrollmentModality = (typeof enrollmentModalities)[number];
export type TrainingGoal = (typeof trainingGoals)[number];

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido.")
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(32, "Token inválido."),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres.")
});

const digitsOnly = (value: string) => value.replace(/\D/g, "");
function isValidCpf(value: string) {
  const cpf = digitsOnly(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calculateDigit = (base: string, factor: number) => {
    const total = base.split("").reduce((sum, digit) => {
      const result = sum + Number(digit) * factor;
      factor -= 1;
      return result;
    }, 0);
    const rest = (total * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const firstDigit = calculateDigit(cpf.slice(0, 9), 10);
  const secondDigit = calculateDigit(cpf.slice(0, 10), 11);
  return firstDigit === Number(cpf[9]) && secondDigit === Number(cpf[10]);
}
const normalizeText = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
export function normalizePlanModality(value: string) {
  const normalized = normalizeText(value);
  if (normalized === "MUSCULACAO") return "MUSCULAÇÃO";
  if (normalized === "LUTA") return "LUTA";
  if (normalized === "MOBILIDADE") return "MOBILIDADE";
  if (normalized === "FUNCIONAL") return "FUNCIONAL";
  if (normalized === "ALONGAMENTO") return "ALONGAMENTO";
  if (normalized === "PERSONAL" || normalized === "PERSONAL TRAINER") return "PERSONAL";
  if (normalized === "CONDICIONAMENTO" || normalized === "CONDICIONAMENTO FISICO") return "CONDICIONAMENTO";
  return value.trim();
}

export function defaultPlanAccessForModality(modality: string) {
  const normalized = normalizePlanModality(modality);
  return {
    allowAssessments: normalized === "MUSCULAÇÃO" || normalized === "FUNCIONAL",
    allowWorkouts: normalized === "MUSCULAÇÃO" || normalized === "MOBILIDADE" || normalized === "FUNCIONAL"
  };
}

const brNumber = (schema: z.ZodNumber) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;

    const normalized = value.trim().replace(",", ".");
    if (!normalized) return undefined;

    const numberValue = Number(normalized);
    return Number.isNaN(numberValue) ? undefined : numberValue;
  }, schema);

const optionalAssessmentNumber = brNumber(z.number().min(0)).optional().or(z.literal(""));
const optionalAssessmentObject = z.record(optionalAssessmentNumber).optional().default({});
const optionalDateString = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "string" && !value.trim()) return undefined;
    return value;
  },
  z.string().datetime().or(z.string().date()).optional()
);

export const studentSchema = z.object({
  fullName: z.string().trim().min(3, "Informe o nome completo."),
  cpf: z
    .string()
    .trim()
    .refine(isValidCpf, "Informe um CPF válido."),
  birthDate: z.string().datetime().or(z.string().date()),
  phone: z
    .string()
    .trim()
    .refine((value) => digitsOnly(value).length >= 10, "Telefone deve conter DDD e número."),
  address: z.string().trim().min(3, "Informe o endereço."),
  email: z.string().trim().email("Informe um e-mail válido."),
  photoUrl: z.string().url().optional().or(z.literal("")),
  enrollmentDate: z.string().datetime().or(z.string().date()),
  modality: z.string().trim().min(2, "Informe a modalidade."),
  notes: z.string().optional(),
  status: z.enum(studentStatuses).default("ATIVO"),
  createAccess: z.coerce.boolean().default(false)
});

export const planSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do plano."),
  value: brNumber(z.number({ required_error: "Informe um valor válido.", invalid_type_error: "Informe um valor válido." }).positive("Informe um valor maior que zero.")),
  modality: z.preprocess(
    (value) => (typeof value === "string" ? normalizePlanModality(value) : value),
    z.string({ required_error: "Informe o tipo do plano." }).trim().min(2, "Informe o tipo do plano.").max(80, "Tipo do plano deve ter no máximo 80 caracteres.")
  ),
  durationDays: brNumber(z.number({ required_error: "Informe a duração do plano.", invalid_type_error: "Informe a duração do plano." }).int("Duração deve ser um número inteiro.").positive("Informe a duração do plano.")),
  dueDay: brNumber(z.number({ required_error: "Informe o dia de vencimento.", invalid_type_error: "Informe o dia de vencimento." }).int("Dia de vencimento deve ser um número inteiro.").min(1, "Dia de vencimento mínimo: 1.").max(31, "Dia de vencimento máximo: 31.")),
  allowAssessments: z.coerce.boolean().optional(),
  allowWorkouts: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().default(true)
});

export const invoiceSchema = z.object({
  studentId: z.string().uuid(),
  planId: z.string().uuid().optional(),
  dueDate: z.string().datetime().or(z.string().date()),
  amount: brNumber(z.number({ required_error: "Informe um valor válido.", invalid_type_error: "Informe um valor válido." }).positive("Informe um valor maior que zero.")),
  status: z.enum(invoiceStatuses).default("PENDENTE")
});

export const studentPlanChangeSchema = z.object({
  planId: z.string().uuid("Selecione um plano."),
  startDate: z.string().datetime().or(z.string().date()).optional(),
  createInitialInvoice: z.coerce.boolean().default(true),
  dueDate: z.string().datetime().or(z.string().date()).optional(),
  amount: brNumber(z.number({ invalid_type_error: "Informe um valor válido." }).positive("Informe um valor maior que zero.")).optional().or(z.literal(""))
});

export const financialSettingsSchema = z.object({
  fixedFinePercentage: brNumber(
    z.number({ required_error: "Informe a multa fixa.", invalid_type_error: "Informe a multa fixa." }).min(0, "Multa não pode ser negativa.").max(100, "Multa maxima: 100%.")
  ),
  dailyInterestPercentage: brNumber(
    z.number({ required_error: "Informe o juros ao dia.", invalid_type_error: "Informe o juros ao dia." }).min(0, "Juros ao dia não pode ser negativo.").max(100, "Juros ao dia máximo: 100%.")
  ),
  monthlyInterestPercentage: brNumber(
    z.number({ required_error: "Informe o juros ao mês.", invalid_type_error: "Informe o juros ao mês." }).min(0, "Juros ao mês não pode ser negativo.").max(100, "Juros ao mês máximo: 100%.")
  )
});

export const assessmentSchema = z.object({
  studentId: z.string().uuid("Selecione um aluno."),
  professorId: z.string().uuid().optional().or(z.literal("")),
  assessedAt: z.string().datetime().or(z.string().date()),
  startDate: optionalDateString,
  trainingGoals: z.array(z.enum(trainingGoals)).default([]),
  weightKg: brNumber(z.number({ required_error: "Informe o peso.", invalid_type_error: "Informe o peso." }).positive("Informe um peso válido.")),
  heightCm: brNumber(z.number({ required_error: "Informe a altura.", invalid_type_error: "Informe a altura." }).positive("Informe uma altura válida.")),
  bodyFatPercentage: brNumber(z.number().min(0).max(100)).optional().or(z.literal("")),
  muscleMassKg: brNumber(z.number().positive()).optional().or(z.literal("")),
  abdominalCircumferenceCm: brNumber(z.number().positive()).optional().or(z.literal("")),
  armCircumferenceCm: brNumber(z.number().positive()).optional().or(z.literal("")),
  leftArmCircumferenceCm: brNumber(z.number().positive()).optional().or(z.literal("")),
  rightArmCircumferenceCm: brNumber(z.number().positive()).optional().or(z.literal("")),
  leftLegCircumferenceCm: brNumber(z.number().positive()).optional().or(z.literal("")),
  rightLegCircumferenceCm: brNumber(z.number().positive()).optional().or(z.literal("")),
  chestCircumferenceCm: brNumber(z.number().positive()).optional().or(z.literal("")),
  shoulderCircumferenceCm: brNumber(z.number().positive()).optional().or(z.literal("")),
  gluteCircumferenceCm: brNumber(z.number().positive()).optional().or(z.literal("")),
  leftCalfCircumferenceCm: brNumber(z.number().positive()).optional().or(z.literal("")),
  rightCalfCircumferenceCm: brNumber(z.number().positive()).optional().or(z.literal("")),
  waistCircumferenceCm: brNumber(z.number().positive()).optional().or(z.literal("")),
  hipCircumferenceCm: brNumber(z.number().positive()).optional().or(z.literal("")),
  bioimpedance: optionalAssessmentObject,
  anthropometry: optionalAssessmentObject,
  anthropometryMeasuredAt: optionalDateString,
  skinfolds: optionalAssessmentObject,
  skinfoldsMeasuredAt: optionalDateString,
  physicalTests: optionalAssessmentObject,
  notes: z.string().optional()
});

export const workoutExerciseSchema = z.object({
  libraryExerciseId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2, "Informe o exercício."),
  sets: brNumber(z.number({ required_error: "Informe as series.", invalid_type_error: "Informe as series." }).int().positive()),
  repetitions: z.string().trim().min(1, "Informe as repeticoes."),
  load: z.string().optional(),
  restSeconds: brNumber(z.number().int().positive()).optional().or(z.literal("")),
  notes: z.string().optional(),
  order: brNumber(z.number().int().min(0)).default(0)
});

export const workoutDaySchema = z.object({
  label: z.enum(workoutDayLabels),
  exercises: z.array(workoutExerciseSchema).default([])
});

export const workoutSchema = z.object({
  studentId: z.string().uuid("Selecione um aluno."),
  professorId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2, "Informe o nome da ficha."),
  goal: z.string().trim().min(2, "Informe o objetivo do treino."),
  startDate: z.string().datetime().or(z.string().date()),
  endDate: z.string().datetime().or(z.string().date()).optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
  days: z.array(workoutDaySchema).default([])
});

function isValidMediaReference(value: string) {
  if (!value.trim()) return false;
  if (value.startsWith("data:")) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isHttpMediaReference(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const mediaReferenceSchema = z.string().trim().refine(isValidMediaReference, "Informe um arquivo ou uma URL válida.");
const optionalMediaReferenceSchema = z.string().trim().refine((value) => !value || isValidMediaReference(value), "Informe um arquivo ou uma URL válida.").optional().or(z.literal(""));

export const exerciseLibrarySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do exercício."),
  category: z.string().trim().min(2, "Informe a categoria."),
  modality: z.enum(exerciseModalities, { required_error: "Informe a modalidade." }),
  muscleGroup: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().optional().or(z.literal("")),
  executionInstructions: z.string().trim().optional().or(z.literal("")),
  commonMistakes: z.string().trim().optional().or(z.literal("")),
  difficultyLevel: z.enum(exerciseDifficultyLevels, { required_error: "Informe a dificuldade." }),
  mediaType: z.enum(exerciseMediaTypes, { required_error: "Informe o tipo da mídia." }),
  mediaUrl: mediaReferenceSchema,
  thumbnailUrl: optionalMediaReferenceSchema,
  isActive: z.coerce.boolean().default(true)
}).superRefine((value, context) => {
  if (value.mediaType === "EXTERNAL_URL" && !isHttpMediaReference(value.mediaUrl)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["mediaUrl"],
      message: "Para link externo, informe uma URL iniciando com http ou https."
    });
  }
});

export const enrollmentSchema = z.object({
  student: z.object({
    fullName: z.string().trim().min(3, "Informe o nome completo."),
    cpf: z
      .string()
      .trim()
      .refine(isValidCpf, "Informe um CPF válido."),
    birthDate: z.string().datetime().or(z.string().date()),
    phone: z
      .string()
      .trim()
      .refine((value) => digitsOnly(value).length >= 10, "Telefone deve conter DDD e número."),
    address: z.string().trim().min(3, "Informe o endereço."),
    email: z.string().trim().email("Informe um e-mail válido."),
    photoUrl: z.string().url().optional().or(z.literal("")),
    notes: z.string().optional(),
    createAccess: z.coerce.boolean().default(false)
  }),
  modalities: z.array(z.enum(enrollmentModalities)).min(1, "Selecione ao menos uma modalidade."),
  planId: z.string().uuid("Selecione um plano."),
  enrollmentDate: z.string().datetime().or(z.string().date()),
  invoice: z.object({
    dueDate: z.string().datetime().or(z.string().date()),
    amount: brNumber(z.number({ required_error: "Informe um valor válido.", invalid_type_error: "Informe um valor válido." }).positive("Informe um valor maior que zero.")),
    status: z.enum(["PENDENTE", "PAGO"]).default("PENDENTE"),
    paymentMode: z.enum(["PENDENTE", "PAGO_MANUAL", "PIX_MERCADO_PAGO"]).default("PENDENTE"),
    paidAt: z.string().datetime().or(z.string().date()).optional().or(z.literal(""))
  })
});

export type StudentInput = z.infer<typeof studentSchema>;
export type PlanInput = z.infer<typeof planSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type StudentPlanChangeInput = z.infer<typeof studentPlanChangeSchema>;
export type FinancialSettingsInput = z.infer<typeof financialSettingsSchema>;
export type AssessmentInput = z.infer<typeof assessmentSchema>;
export type WorkoutInput = z.infer<typeof workoutSchema>;
export type ExerciseLibraryInput = z.infer<typeof exerciseLibrarySchema>;
export type EnrollmentInput = z.infer<typeof enrollmentSchema>;
