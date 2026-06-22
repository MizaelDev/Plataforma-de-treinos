CREATE TYPE "Role" AS ENUM ('ADMIN', 'PROFESSOR', 'ALUNO');
CREATE TYPE "StudentStatus" AS ENUM ('ATIVO', 'INATIVO');
CREATE TYPE "InvoiceStatus" AS ENUM ('PAGO', 'PENDENTE', 'ATRASADO', 'CANCELADO');

CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "cpfHash" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "photoUrl" TEXT,
    "enrollmentDate" TIMESTAMP(3) NOT NULL,
    "modality" TEXT NOT NULL,
    "notes" TEXT,
    "status" "StudentStatus" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "modality" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentPlan" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "planId" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "amount" DECIMAL(10,2) NOT NULL,
    "fineAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "interestAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDENTE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fixedFinePercentage" DECIMAL(5,2) NOT NULL DEFAULT 2,
    "dailyInterestPercentage" DECIMAL(7,4) NOT NULL DEFAULT 0.033,
    "monthlyInterestPercentage" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_organizationId_role_idx" ON "User"("organizationId", "role");
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");
CREATE UNIQUE INDEX "Student_organizationId_cpfHash_key" ON "Student"("organizationId", "cpfHash");
CREATE INDEX "Student_organizationId_status_idx" ON "Student"("organizationId", "status");
CREATE INDEX "Student_organizationId_email_idx" ON "Student"("organizationId", "email");
CREATE INDEX "Plan_organizationId_isActive_idx" ON "Plan"("organizationId", "isActive");
CREATE INDEX "StudentPlan_studentId_isActive_idx" ON "StudentPlan"("studentId", "isActive");
CREATE INDEX "Invoice_organizationId_status_dueDate_idx" ON "Invoice"("organizationId", "status", "dueDate");
CREATE INDEX "Invoice_studentId_dueDate_idx" ON "Invoice"("studentId", "dueDate");
CREATE UNIQUE INDEX "FinancialSettings_organizationId_key" ON "FinancialSettings"("organizationId");
CREATE INDEX "AuditLog_organizationId_entity_createdAt_idx" ON "AuditLog"("organizationId", "entity", "createdAt");

ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentPlan" ADD CONSTRAINT "StudentPlan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentPlan" ADD CONSTRAINT "StudentPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialSettings" ADD CONSTRAINT "FinancialSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
