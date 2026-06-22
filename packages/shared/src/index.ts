import { z } from "zod";

export const roles = ["ADMIN", "PROFESSOR", "ALUNO"] as const;
export const invoiceStatuses = ["PAGO", "PENDENTE", "ATRASADO", "CANCELADO"] as const;
export const studentStatuses = ["ATIVO", "INATIVO"] as const;

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
  status: z.enum(studentStatuses).default("ATIVO")
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

export type StudentInput = z.infer<typeof studentSchema>;
export type PlanInput = z.infer<typeof planSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
