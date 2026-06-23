import { z } from "zod";

export const roles = ["ADMIN", "PROFESSOR", "ALUNO"] as const;
export const invoiceStatuses = ["PAGO", "PENDENTE", "ATRASADO", "CANCELADO"] as const;
export const studentStatuses = ["ATIVO", "INATIVO"] as const;
export const workoutDayLabels = ["A", "B", "C", "D", "E"] as const;

export type Role = (typeof roles)[number];
export type InvoiceStatus = (typeof invoiceStatuses)[number];
export type StudentStatus = (typeof studentStatuses)[number];

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const digitsOnly = (value: string) => value.replace(/\D/g, "");
const brNumber = (schema: z.ZodNumber) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;

    const normalized = value.trim().replace(",", ".");
    if (!normalized) return undefined;

    const numberValue = Number(normalized);
    return Number.isNaN(numberValue) ? undefined : numberValue;
  }, schema);

export const studentSchema = z.object({
  fullName: z.string().trim().min(3, "Informe o nome completo."),
  cpf: z
    .string()
    .trim()
    .refine((value) => digitsOnly(value).length === 11, "CPF deve conter 11 digitos."),
  birthDate: z.string().datetime().or(z.string().date()),
  phone: z
    .string()
    .trim()
    .refine((value) => digitsOnly(value).length >= 10, "Telefone deve conter DDD e numero."),
  address: z.string().trim().min(3, "Informe o endereco."),
  email: z.string().trim().email("Informe um e-mail valido."),
  photoUrl: z.string().url().optional().or(z.literal("")),
  enrollmentDate: z.string().datetime().or(z.string().date()),
  modality: z.string().trim().min(2, "Informe a modalidade."),
  notes: z.string().optional(),
  status: z.enum(studentStatuses).default("ATIVO"),
  createAccess: z.coerce.boolean().default(false)
});

export const planSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do plano."),
  value: brNumber(z.number({ required_error: "Informe um valor valido.", invalid_type_error: "Informe um valor valido." }).positive("Informe um valor maior que zero.")),
  modality: z.string().trim().min(2, "Informe a modalidade."),
  durationDays: brNumber(z.number({ required_error: "Informe a duracao do plano.", invalid_type_error: "Informe a duracao do plano." }).int("Duracao deve ser um numero inteiro.").positive("Informe a duracao do plano.")),
  dueDay: brNumber(z.number({ required_error: "Informe o dia de vencimento.", invalid_type_error: "Informe o dia de vencimento." }).int("Dia de vencimento deve ser um numero inteiro.").min(1, "Dia de vencimento minimo: 1.").max(31, "Dia de vencimento maximo: 31.")),
  isActive: z.coerce.boolean().default(true)
});

export const invoiceSchema = z.object({
  studentId: z.string().uuid(),
  planId: z.string().uuid().optional(),
  dueDate: z.string().datetime().or(z.string().date()),
  amount: brNumber(z.number({ required_error: "Informe um valor valido.", invalid_type_error: "Informe um valor valido." }).positive("Informe um valor maior que zero.")),
  status: z.enum(invoiceStatuses).default("PENDENTE")
});

export const financialSettingsSchema = z.object({
  fixedFinePercentage: brNumber(
    z.number({ required_error: "Informe a multa fixa.", invalid_type_error: "Informe a multa fixa." }).min(0, "Multa nao pode ser negativa.").max(100, "Multa maxima: 100%.")
  ),
  dailyInterestPercentage: brNumber(
    z.number({ required_error: "Informe o juros ao dia.", invalid_type_error: "Informe o juros ao dia." }).min(0, "Juros ao dia nao pode ser negativo.").max(100, "Juros ao dia maximo: 100%.")
  ),
  monthlyInterestPercentage: brNumber(
    z.number({ required_error: "Informe o juros ao mes.", invalid_type_error: "Informe o juros ao mes." }).min(0, "Juros ao mes nao pode ser negativo.").max(100, "Juros ao mes maximo: 100%.")
  )
});

export const assessmentSchema = z.object({
  studentId: z.string().uuid("Selecione um aluno."),
  professorId: z.string().uuid().optional().or(z.literal("")),
  assessedAt: z.string().datetime().or(z.string().date()),
  weightKg: brNumber(z.number({ required_error: "Informe o peso.", invalid_type_error: "Informe o peso." }).positive("Informe um peso valido.")),
  heightCm: brNumber(z.number({ required_error: "Informe a altura.", invalid_type_error: "Informe a altura." }).positive("Informe uma altura valida.")),
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
  notes: z.string().optional()
});

export const workoutExerciseSchema = z.object({
  name: z.string().trim().min(2, "Informe o exercicio."),
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

export type StudentInput = z.infer<typeof studentSchema>;
export type PlanInput = z.infer<typeof planSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type FinancialSettingsInput = z.infer<typeof financialSettingsSchema>;
export type AssessmentInput = z.infer<typeof assessmentSchema>;
export type WorkoutInput = z.infer<typeof workoutSchema>;
