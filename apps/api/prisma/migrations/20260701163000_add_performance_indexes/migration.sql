-- Indexes for common tenant-scoped list, dashboard and student-area queries.
CREATE INDEX IF NOT EXISTS "Student_organizationId_deletedAt_createdAt_idx" ON "Student"("organizationId", "deletedAt", "createdAt");
CREATE INDEX IF NOT EXISTS "Student_organizationId_modality_idx" ON "Student"("organizationId", "modality");

CREATE INDEX IF NOT EXISTS "Invoice_organizationId_studentId_status_dueDate_idx" ON "Invoice"("organizationId", "studentId", "status", "dueDate");
CREATE INDEX IF NOT EXISTS "Invoice_organizationId_paidAt_idx" ON "Invoice"("organizationId", "paidAt");
CREATE INDEX IF NOT EXISTS "Invoice_organizationId_createdAt_idx" ON "Invoice"("organizationId", "createdAt");

CREATE INDEX IF NOT EXISTS "PhysicalAssessment_studentId_deletedAt_assessedAt_idx" ON "PhysicalAssessment"("studentId", "deletedAt", "assessedAt");
CREATE INDEX IF NOT EXISTS "PhysicalAssessment_organizationId_assessedAt_idx" ON "PhysicalAssessment"("organizationId", "assessedAt");

CREATE INDEX IF NOT EXISTS "WorkoutPlan_studentId_deletedAt_createdAt_idx" ON "WorkoutPlan"("studentId", "deletedAt", "createdAt");
CREATE INDEX IF NOT EXISTS "WorkoutPlan_organizationId_createdAt_idx" ON "WorkoutPlan"("organizationId", "createdAt");

CREATE INDEX IF NOT EXISTS "ExerciseLibrary_organizationId_deletedAt_name_idx" ON "ExerciseLibrary"("organizationId", "deletedAt", "name");
CREATE INDEX IF NOT EXISTS "Course_organizationId_deletedAt_title_idx" ON "Course"("organizationId", "deletedAt", "title");
