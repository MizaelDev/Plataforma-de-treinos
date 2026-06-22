import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { hashCpf, normalizeCpf } from "../src/utils/cpf.js";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("123456", 10);

  const organization = await prisma.organization.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Academia MVP"
    }
  });

  await prisma.financialSettings.upsert({
    where: { organizationId: organization.id },
    update: {},
    create: {
      organizationId: organization.id,
      fixedFinePercentage: 2,
      dailyInterestPercentage: 0.033,
      monthlyInterestPercentage: 1
    }
  });

  await prisma.user.upsert({
    where: { email: "admin@academia.test" },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Administrador",
      email: "admin@academia.test",
      passwordHash,
      role: "ADMIN"
    }
  });

  await prisma.user.upsert({
    where: { email: "professor@academia.test" },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Professor",
      email: "professor@academia.test",
      passwordHash,
      role: "PROFESSOR"
    }
  });

  const studentUser = await prisma.user.upsert({
    where: { email: "aluno@academia.test" },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Aluno Demo",
      email: "aluno@academia.test",
      passwordHash,
      role: "ALUNO"
    }
  });

  const plan = await prisma.plan.create({
    data: {
      organizationId: organization.id,
      name: "Musculacao Mensal",
      value: 149.9,
      modality: "Musculacao",
      durationDays: 30,
      dueDay: 10,
      isActive: true
    }
  });

  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      organizationId: organization.id,
      userId: studentUser.id,
      fullName: "Aluno Demo",
      cpf: normalizeCpf("123.456.789-09"),
      cpfHash: hashCpf("123.456.789-09"),
      birthDate: new Date("1995-02-15"),
      phone: "(11) 99999-9999",
      address: "Rua Exemplo, 100",
      email: "aluno@academia.test",
      photoUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600",
      enrollmentDate: new Date(),
      modality: "Musculacao",
      notes: "Aluno criado pelo seed.",
      status: "ATIVO"
    }
  });

  await prisma.studentPlan.create({
    data: {
      studentId: student.id,
      planId: plan.id,
      startDate: new Date(),
      isActive: true
    }
  });

  await prisma.invoice.createMany({
    data: [
      {
        organizationId: organization.id,
        studentId: student.id,
        planId: plan.id,
        dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 10),
        amount: 149.9,
        status: "PENDENTE"
      },
      {
        organizationId: organization.id,
        studentId: student.id,
        planId: plan.id,
        dueDate: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 10),
        amount: 149.9,
        status: "PAGO",
        paidAt: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 9),
        totalPaid: 149.9
      }
    ]
  });

  console.log("Seed concluido. Logins: admin@academia.test / professor@academia.test / aluno@academia.test, senha 123456");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
