import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@academia/shared";
import { env } from "../config/env.js";

type TokenPayload = {
  sub: string;
  role: Role;
  organizationId: string;
  studentId?: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
        organizationId: string;
        studentId?: string;
      };
    }
  }
}

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "8h" });
}

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  const header = request.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    response.status(401).json({ message: "Token ausente." });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    request.user = {
      id: decoded.sub,
      role: decoded.role,
      organizationId: decoded.organizationId,
      studentId: decoded.studentId
    };
    next();
  } catch {
    response.status(401).json({ message: "Token invalido ou expirado." });
  }
}

export function requireRoles(...roles: Role[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.user || !roles.includes(request.user.role)) {
      response.status(403).json({ message: "Permissao insuficiente." });
      return;
    }
    next();
  };
}
