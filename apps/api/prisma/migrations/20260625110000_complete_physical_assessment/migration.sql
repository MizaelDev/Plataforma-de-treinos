ALTER TABLE "PhysicalAssessment"
ADD COLUMN "startDate" TIMESTAMP(3),
ADD COLUMN "trainingGoals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "bioimpedance" JSONB,
ADD COLUMN "anthropometry" JSONB,
ADD COLUMN "anthropometryMeasuredAt" TIMESTAMP(3),
ADD COLUMN "skinfolds" JSONB,
ADD COLUMN "skinfoldsMeasuredAt" TIMESTAMP(3),
ADD COLUMN "physicalTests" JSONB;
