import { Router } from "express";
import { financialSettingsSchema } from "@academia/shared";
import { requireAuth, requireRoles } from "../middlewares/auth.js";
import { auditLog } from "../services/audit.service.js";
import { prisma } from "../services/prisma.js";
import { asyncRoute } from "../utils/async-route.js";

export const settingsRouter = Router();

settingsRouter.use(requireAuth);
settingsRouter.use(requireRoles("ADMIN"));

settingsRouter.get(
  "/financial",
  asyncRoute(async (request, response) => {
    const settings = await prisma.financialSettings.upsert({
      where: { organizationId: request.user!.organizationId },
      update: {},
      create: { organizationId: request.user!.organizationId }
    });

    response.json({ settings });
  })
);

settingsRouter.put(
  "/financial",
  asyncRoute(async (request, response) => {
    const data = financialSettingsSchema.parse(request.body);
    const settings = await prisma.financialSettings.upsert({
      where: { organizationId: request.user!.organizationId },
      update: {
        fixedFinePercentage: data.fixedFinePercentage,
        dailyInterestPercentage: data.dailyInterestPercentage,
        monthlyInterestPercentage: data.monthlyInterestPercentage
      },
      create: {
        organizationId: request.user!.organizationId,
        fixedFinePercentage: data.fixedFinePercentage,
        dailyInterestPercentage: data.dailyInterestPercentage,
        monthlyInterestPercentage: data.monthlyInterestPercentage
      }
    });

    await auditLog({
      organizationId: request.user!.organizationId,
      actorUserId: request.user!.id,
      action: "UPDATE",
      entity: "FinancialSettings",
      entityId: settings.id
    });

    response.json({ settings });
  })
);
