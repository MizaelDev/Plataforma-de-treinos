import { Router } from "express";
import { requireAuth, requireRoles } from "../middlewares/auth.js";
import { prisma } from "../services/prisma.js";
import { asyncRoute } from "../utils/async-route.js";

export const auditRouter = Router();

auditRouter.use(requireAuth);
auditRouter.use(requireRoles("ADMIN"));

auditRouter.get(
  "/",
  asyncRoute(async (request, response) => {
    const logs = await prisma.auditLog.findMany({
      where: { organizationId: request.user!.organizationId },
      include: { actor: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    response.json({ logs });
  })
);
