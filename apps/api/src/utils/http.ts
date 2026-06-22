import type { Request } from "express";

export function requiredParam(request: Request, name: string) {
  const value = request.params[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Parametro obrigatorio ausente: ${name}`);
  }
  return value;
}
