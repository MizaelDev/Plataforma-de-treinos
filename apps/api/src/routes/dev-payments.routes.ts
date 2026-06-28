import { Router } from "express";
import { requireAuth, requireRoles } from "../middlewares/auth.js";
import { mockConfirmPayment } from "../services/payments.service.js";
import { asyncRoute } from "../utils/async-route.js";
import { requiredParam } from "../utils/http.js";

export const devPaymentsRouter = Router();

devPaymentsRouter.use(requireAuth);

devPaymentsRouter.post(
  "/payments/:id/approve",
  requireRoles("ADMIN", "PROFESSOR", "ALUNO"),
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    const transaction = await mockConfirmPayment(id, {
      userId: request.user!.id,
      role: request.user!.role,
      organizationId: request.user!.organizationId,
      studentId: request.user!.studentId
    });

    response.json({ transaction });
  })
);
