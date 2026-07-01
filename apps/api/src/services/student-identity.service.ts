import { prisma } from "./prisma.js";

type ReleaseDeletedStudentIdentityInput = {
  organizationId: string;
  cpfHash?: string;
  email?: string;
};

export async function releaseDeletedStudentIdentity(input: ReleaseDeletedStudentIdentityInput) {
  const email = input.email?.trim().toLowerCase();
  const identityFilters = [
    input.cpfHash ? { cpfHash: input.cpfHash } : null,
    email ? { email } : null,
    email ? { user: { email } } : null
  ].filter(Boolean) as Array<{ cpfHash: string } | { email: string } | { user: { email: string } }>;

  if (identityFilters.length === 0) return;

  const students = await prisma.student.findMany({
    where: {
      organizationId: input.organizationId,
      deletedAt: { not: null },
      OR: identityFilters
    },
    select: {
      id: true,
      cpfHash: true,
      user: { select: { id: true } }
    }
  });

  for (const student of students) {
    const archivedEmail = `deleted+${student.id}@deleted.local`;
    await prisma.$transaction([
      prisma.student.update({
        where: { id: student.id },
        data: {
          cpf: `deleted-${student.id}`,
          cpfHash: `deleted:${student.id}:${student.cpfHash}`,
          email: archivedEmail,
          status: "INATIVO"
        }
      }),
      ...(student.user
        ? [
            prisma.user.update({
              where: { id: student.user.id },
              data: {
                email: archivedEmail,
                isActive: false
              }
            })
          ]
        : [])
    ]);
  }
}
