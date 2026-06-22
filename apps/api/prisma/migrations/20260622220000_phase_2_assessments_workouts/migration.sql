CREATE TYPE "WorkoutDayLabel" AS ENUM ('A', 'B', 'C', 'D', 'E');

CREATE TABLE "PhysicalAssessment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "professorId" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL,
    "weightKg" DECIMAL(6,2) NOT NULL,
    "heightCm" DECIMAL(6,2) NOT NULL,
    "bmi" DECIMAL(5,2) NOT NULL,
    "bodyFatPercentage" DECIMAL(5,2),
    "muscleMassKg" DECIMAL(6,2),
    "abdominalCircumferenceCm" DECIMAL(6,2),
    "armCircumferenceCm" DECIMAL(6,2),
    "waistCircumferenceCm" DECIMAL(6,2),
    "hipCircumferenceCm" DECIMAL(6,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PhysicalAssessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkoutPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "professorId" TEXT,
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WorkoutPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkoutDay" (
    "id" TEXT NOT NULL,
    "workoutPlanId" TEXT NOT NULL,
    "label" "WorkoutDayLabel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutDay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "workoutDayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sets" INTEGER NOT NULL,
    "repetitions" TEXT NOT NULL,
    "load" TEXT,
    "restSeconds" INTEGER,
    "notes" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PhysicalAssessment_organizationId_studentId_assessedAt_idx" ON "PhysicalAssessment"("organizationId", "studentId", "assessedAt");
CREATE INDEX "PhysicalAssessment_organizationId_deletedAt_idx" ON "PhysicalAssessment"("organizationId", "deletedAt");
CREATE INDEX "WorkoutPlan_organizationId_studentId_isActive_idx" ON "WorkoutPlan"("organizationId", "studentId", "isActive");
CREATE INDEX "WorkoutPlan_organizationId_deletedAt_idx" ON "WorkoutPlan"("organizationId", "deletedAt");
CREATE UNIQUE INDEX "WorkoutDay_workoutPlanId_label_key" ON "WorkoutDay"("workoutPlanId", "label");

ALTER TABLE "PhysicalAssessment" ADD CONSTRAINT "PhysicalAssessment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysicalAssessment" ADD CONSTRAINT "PhysicalAssessment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysicalAssessment" ADD CONSTRAINT "PhysicalAssessment_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkoutPlan" ADD CONSTRAINT "WorkoutPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutPlan" ADD CONSTRAINT "WorkoutPlan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutPlan" ADD CONSTRAINT "WorkoutPlan_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkoutDay" ADD CONSTRAINT "WorkoutDay_workoutPlanId_fkey" FOREIGN KEY ("workoutPlanId") REFERENCES "WorkoutPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_workoutDayId_fkey" FOREIGN KEY ("workoutDayId") REFERENCES "WorkoutDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
