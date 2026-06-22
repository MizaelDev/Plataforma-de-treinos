import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export async function auditLog(input: {
  organizationId: string;
  actorUserId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined
    }
  });
}
