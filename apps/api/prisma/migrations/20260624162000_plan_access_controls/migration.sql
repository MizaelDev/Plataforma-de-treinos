ALTER TABLE "Plan"
ADD COLUMN "allowAssessments" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "allowWorkouts" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Plan"
SET "allowAssessments" = false,
    "allowWorkouts" = false
WHERE upper("modality") = 'LUTA';

UPDATE "Plan"
SET "allowAssessments" = true,
    "allowWorkouts" = true
WHERE upper("modality") IN ('MUSCULAÇÃO', 'MUSCULACAO', 'FUNCIONAL');

UPDATE "Plan"
SET "allowAssessments" = false,
    "allowWorkouts" = true
WHERE upper("modality") = 'MOBILIDADE';
