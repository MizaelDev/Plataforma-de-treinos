import { Router } from "express";
import { requireAuth, requireRoles } from "../middlewares/auth.js";
import { auditLog } from "../services/audit.service.js";
import { createEnrollment } from "../services/enrollments.service.js";
import { asyncRoute } from "../utils/async-route.js";
import { perfMeasure } from "../utils/performance.js";

export const enrollmentsRouter = Router();

enrollmentsRouter.use(requireAuth);
enrollmentsRouter.use(requireRoles("ADMIN", "PROFESSOR"));

enrollmentsRouter.post(
  "/",
  asyncRoute(async (request, response) => {
    const enrollment = await perfMeasure(request, "enrollment.create", () => createEnrollment(request.body, {
      organizationId: request.user!.organizationId,
      actorUserId: request.user!.id
    }));

    await perfMeasure(request, "audit", () => Promise.all([
      auditLog({
        organizationId: request.user!.organizationId,
        actorUserId: request.user!.id,
        action: "ENROLL_STUDENT",
        entity: "Student",
        entityId: enrollment.student.id
      }),
      auditLog({
        organizationId: request.user!.organizationId,
        actorUserId: request.user!.id,
        action: "LINK_PLAN",
        entity: "StudentPlan",
        entityId: enrollment.studentPlan.id,
        metadata: { studentId: enrollment.student.id, planId: enrollment.studentPlan.planId }
      }),
      auditLog({
        organizationId: request.user!.organizationId,
        actorUserId: request.user!.id,
        action: enrollment.invoice.status === "PAGO" ? "CREATE_PAID_INVOICE" : "CREATE_INVOICE",
        entity: "Invoice",
        entityId: enrollment.invoice.id,
        metadata: { studentId: enrollment.student.id, planId: enrollment.invoice.planId }
      })
    ]));

    response.status(201).json({ enrollment });
  })
);
