import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { authRouter } from "./routes/auth.routes.js";
import { studentsRouter } from "./routes/students.routes.js";
import { plansRouter } from "./routes/plans.routes.js";
import { invoicesRouter } from "./routes/invoices.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { assessmentsRouter } from "./routes/assessments.routes.js";
import { workoutsRouter } from "./routes/workouts.routes.js";
import { exercisesRouter } from "./routes/exercises.routes.js";
import { enrollmentsRouter } from "./routes/enrollments.routes.js";
import { settingsRouter } from "./routes/settings.routes.js";
import { studentAreaRouter } from "./routes/student.routes.js";
import { auditRouter } from "./routes/audit.routes.js";
import { paymentsRouter } from "./routes/payments.routes.js";
import { paymentWebhooksRouter } from "./routes/payment-webhooks.routes.js";
import { devPaymentsRouter } from "./routes/dev-payments.routes.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()) }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/dashboard", dashboardRouter);
app.use("/students", studentsRouter);
app.use("/plans", plansRouter);
app.use("/invoices", invoicesRouter);
app.use("/assessments", assessmentsRouter);
app.use("/workouts", workoutsRouter);
app.use("/exercises", exercisesRouter);
app.use("/enrollments", enrollmentsRouter);
app.use("/settings", settingsRouter);
app.use("/student", studentAreaRouter);
app.use("/audit-logs", auditRouter);
app.use("/payments", paymentsRouter);
app.use("/dev", devPaymentsRouter);
app.use("/webhooks", paymentWebhooksRouter);

app.use(errorHandler);
