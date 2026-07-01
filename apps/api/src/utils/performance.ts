import { performance } from "node:perf_hooks";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

type PerformanceMark = {
  label: string;
  ms: number;
};

declare global {
  namespace Express {
    interface Request {
      performanceLog?: {
        startedAt: number;
        marks: PerformanceMark[];
      };
    }
  }
}

export function performanceMiddleware(request: Request, response: Response, next: NextFunction) {
  if (!env.ENABLE_PERFORMANCE_LOGS) {
    next();
    return;
  }

  request.performanceLog = {
    startedAt: performance.now(),
    marks: []
  };

  response.on("finish", () => {
    const totalMs = performance.now() - request.performanceLog!.startedAt;
    const marks = request.performanceLog!.marks.map((mark) => `${mark.label}=${mark.ms.toFixed(1)}ms`).join(" ");
    console.log(`[perf] ${request.method} ${request.originalUrl} status=${response.statusCode} total=${totalMs.toFixed(1)}ms ${marks}`);
  });

  next();
}

export function perfMark(request: Request | undefined, label: string, startedAt: number) {
  if (!env.ENABLE_PERFORMANCE_LOGS || !request?.performanceLog) return;
  request.performanceLog.marks.push({ label, ms: performance.now() - startedAt });
}

export async function perfMeasure<T>(request: Request | undefined, label: string, action: () => Promise<T>) {
  const startedAt = performance.now();
  try {
    return await action();
  } finally {
    perfMark(request, label, startedAt);
  }
}
