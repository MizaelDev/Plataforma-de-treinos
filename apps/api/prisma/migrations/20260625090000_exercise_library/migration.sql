CREATE TYPE "ExerciseMediaType" AS ENUM ('IMAGE', 'GIF', 'VIDEO', 'EXTERNAL_URL');

CREATE TABLE "ExerciseLibrary" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "modality" TEXT NOT NULL,
  "muscleGroup" TEXT,
  "description" TEXT,
  "executionInstructions" TEXT,
  "commonMistakes" TEXT,
  "difficultyLevel" TEXT NOT NULL,
  "mediaType" "ExerciseMediaType" NOT NULL,
  "mediaUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "ExerciseLibrary_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ExerciseLibrary"
ADD CONSTRAINT "ExerciseLibrary_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ExerciseLibrary_organizationId_isActive_deletedAt_idx"
ON "ExerciseLibrary"("organizationId", "isActive", "deletedAt");

CREATE INDEX "ExerciseLibrary_organizationId_modality_category_idx"
ON "ExerciseLibrary"("organizationId", "modality", "category");

ALTER TABLE "Exercise"
ADD COLUMN "libraryExerciseId" TEXT;

ALTER TABLE "Exercise"
ADD CONSTRAINT "Exercise_libraryExerciseId_fkey"
FOREIGN KEY ("libraryExerciseId") REFERENCES "ExerciseLibrary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Exercise_libraryExerciseId_idx"
ON "Exercise"("libraryExerciseId");
