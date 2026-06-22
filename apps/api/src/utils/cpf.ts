import crypto from "node:crypto";
import { env } from "../config/env.js";

export function normalizeCpf(cpf: string) {
  return cpf.replace(/\D/g, "");
}

export function hashCpf(cpf: string) {
  return crypto.createHmac("sha256", env.CPF_HASH_SECRET).update(normalizeCpf(cpf)).digest("hex");
}
