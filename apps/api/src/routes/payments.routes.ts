import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRoles } from "../middlewares/auth.js";
import { createPixPayment, getPaymentStatus, mockConfirmPayment } from "../services/payments.service.js";
import { asyncRoute } from "../utils/async-route.js";
import { requiredParam } from "../utils/http.js";

export const paymentsRouter = Router();

paymentsRouter.use(requireAuth);

const pixPaymentSchema = z.object({
  invoiceId: z.string().uuid("Informe uma mensalidade válida.")
});

paymentsRouter.post(
  "/pix",
  requireRoles("ADMIN", "PROFESSOR", "ALUNO"),
  asyncRoute(async (request, response) => {
    const data = pixPaymentSchema.parse(request.body);
    const transaction = await createPixPayment(data.invoiceId, {
      userId: request.user!.id,
      role: request.user!.role,
      organizationId: request.user!.organizationId,
      studentId: request.user!.studentId
    });

    response.status(201).json({ transaction });
  })
);

paymentsRouter.get(
  "/:id/status",
  requireRoles("ADMIN", "PROFESSOR", "ALUNO"),
  asyncRoute(async (request, response) => {
    const id = requiredParam(request, "id");
    const transaction = await getPaymentStatus(id, {
      userId: request.user!.id,
      role: request.user!.role,
      organizationId: request.user!.organizationId,
      studentId: request.user!.studentId
    });

    response.json({ transaction });
  })
);

paymentsRouter.post(
  "/:id/mock-confirm",
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
