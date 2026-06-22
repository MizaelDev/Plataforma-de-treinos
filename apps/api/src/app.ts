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

app.use(errorHandler);
