ALTER TYPE "ExerciseMediaType" ADD VALUE IF NOT EXISTS 'EMBED';

CREATE TYPE "MediaProvider" AS ENUM ('YOUTUBE', 'VIMEO', 'BUNNY', 'SUPABASE', 'R2', 'EXTERNAL', 'NONE');

ALTER TABLE "ExerciseLibrary"
ALTER COLUMN "mediaUrl" DROP NOT NULL,
ADD COLUMN "videoProvider" "MediaProvider" NOT NULL DEFAULT 'NONE',
ADD COLUMN "durationSeconds" INTEGER,
ADD COLUMN "fileSize" INTEGER,
ADD COLUMN "mimeType" TEXT;

CREATE INDEX "ExerciseLibrary_organizationId_videoProvider_idx" ON "ExerciseLibrary"("organizationId", "videoProvider");

CREATE TABLE "Course" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseLesson" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "videoUrl" TEXT,
  "thumbnailUrl" TEXT,
  "videoProvider" "MediaProvider" NOT NULL DEFAULT 'NONE',
  "durationSeconds" INTEGER,
  "isPreview" BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "CourseLesson_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Course_organizationId_isActive_deletedAt_idx" ON "Course"("organizationId", "isActive", "deletedAt");
CREATE INDEX "CourseLesson_courseId_order_idx" ON "CourseLesson"("courseId", "order");

ALTER TABLE "Course" ADD CONSTRAINT "Course_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseLesson" ADD CONSTRAINT "CourseLesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
