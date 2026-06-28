import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  CPF_HASH_SECRET: z.string().min(16),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  STORAGE_PROVIDER: z.string().default("local"),
  STORAGE_BUCKET: z.string().default("students"),
  PAYMENT_PROVIDER: z.enum(["mock", "mercado_pago"]).default("mock"),
  PIX_PROVIDER: z.enum(["MERCADO_PAGO", "ASAAS", "EFI"]).default("MERCADO_PAGO"),
  PIX_PROVIDER_MODE: z.enum(["mock", "sandbox", "production"]).default("mock"),
  PIX_PAYMENT_EXPIRES_MINUTES: z.coerce.number().int().positive().default(30),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),
  MERCADO_PAGO_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  MERCADO_PAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADO_PAGO_WEBHOOK_SECRET: z.string().optional(),
  PUBLIC_APP_URL: z.string().url().optional(),
  API_BASE_URL: z.string().url().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  ASAAS_API_KEY: z.string().optional(),
  EFI_CLIENT_ID: z.string().optional(),
  EFI_CLIENT_SECRET: z.string().optional()
}).superRefine((value, context) => {
  if (value.NODE_ENV !== "production") return;

  const weakSecretParts = ["troque", "change-me", "dev-secret", "secret"];
  const validateProductionSecret = (field: "JWT_SECRET" | "CPF_HASH_SECRET" | "PAYMENT_WEBHOOK_SECRET", secret?: string) => {
    if (!secret || secret.length < 32 || weakSecretParts.some((part) => secret.toLowerCase().includes(part))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `${field} precisa ser um segredo forte em produção.`
      });
    }
  };

  validateProductionSecret("JWT_SECRET", value.JWT_SECRET);
  validateProductionSecret("CPF_HASH_SECRET", value.CPF_HASH_SECRET);
  validateProductionSecret("PAYMENT_WEBHOOK_SECRET", value.PAYMENT_WEBHOOK_SECRET);

  if (value.PAYMENT_PROVIDER === "mercado_pago" && !value.MERCADO_PAGO_ACCESS_TOKEN) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["MERCADO_PAGO_ACCESS_TOKEN"],
      message: "MERCADO_PAGO_ACCESS_TOKEN é obrigatório quando PAYMENT_PROVIDER=mercado_pago."
    });
  }

  if (value.CORS_ORIGIN.includes("localhost")) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["CORS_ORIGIN"],
      message: "CORS_ORIGIN não deve usar localhost em produção."
    });
  }
});

export const env = envSchema.parse(process.env);
