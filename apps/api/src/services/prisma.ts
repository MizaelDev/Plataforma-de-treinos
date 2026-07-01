import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

export const prisma = new PrismaClient({
  log: env.ENABLE_PERFORMANCE_LOGS
    ? [
        { emit: "event", level: "query" },
        { emit: "stdout", level: "error" },
        { emit: "stdout", level: "warn" }
      ]
    : env.NODE_ENV === "development"
      ? ["error", "warn"]
      : ["error"]
});

if (env.ENABLE_PERFORMANCE_LOGS) {
  prisma.$on("query", (event) => {
    const query = event.query.replace(/\s+/g, " ").slice(0, 180);
    console.log(`[perf:prisma] ${event.duration}ms ${query}`);
  });
}
