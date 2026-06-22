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
  STORAGE_BUCKET: z.string().default("students")
});

export const env = envSchema.parse(process.env);
