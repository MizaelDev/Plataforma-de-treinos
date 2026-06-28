import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { isAppError } from "../utils/errors.js";

function isJsonParseError(error: unknown): error is SyntaxError & { status?: number; type?: string } {
  return error instanceof SyntaxError && typeof error === "object" && error !== null && "body" in error;
}

function isZodValidationError(error: unknown): error is ZodError {
  return error instanceof ZodError || (typeof error === "object" && error !== null && "issues" in error && Array.isArray((error as { issues?: unknown }).issues));
}

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  if (env.NODE_ENV === "development") {
    console.error(error);
  }

  if (isJsonParseError(error)) {
    response.status(400).json({ message: "JSON inválido no corpo da requisição." });
    return;
  }

  if (isAppError(error)) {
    response.status(error.statusCode).json({ message: error.message, details: error.details });
    return;
  }

  if (isZodValidationError(error)) {
    const issues = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message
    }));

    response.status(400).json({
      message: "Dados inválidos. Confira os campos do formulário.",
      issues
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : String(error.meta?.target ?? "");
      const message = target.includes("cpfHash")
        ? "Já existe um aluno cadastrado com este CPF."
        : "Já existe um registro com estes dados.";

      response.status(409).json({ message, code: error.code });
      return;
    }

    if (error.code === "P2003") {
      response.status(400).json({ message: "Registro relacionado não encontrado.", code: error.code });
      return;
    }

    if (error.code === "P2025") {
      response.status(404).json({ message: "Registro não encontrado.", code: error.code });
      return;
    }

    response.status(400).json({ message: "Não foi possível salvar os dados.", code: error.code });
    return;
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    response.status(400).json({ message: "Dados incompatíveis com o modelo do banco." });
    return;
  }

  response.status(500).json({ message: "Erro interno." });
}
