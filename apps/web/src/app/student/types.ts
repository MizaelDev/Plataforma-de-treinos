export type StudentSummary = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  photoUrl?: string | null;
  modality: string;
};

export type PlanSummary = {
  id: string;
  name: string;
  value: string;
  modality: string;
};

export type InvoiceSummary = {
  id: string;
  dueDate: string;
  amount: string;
  status: "PAGO" | "PENDENTE" | "ATRASADO" | "CANCELADO";
  plan?: PlanSummary | null;
  charges?: {
    total: string;
    fineAmount: string;
    interestAmount: string;
    overdueDays: number;
  };
};

export type AssessmentSummary = {
  id: string;
  assessedAt: string;
  weightKg: string;
  heightCm: string;
  bmi: string;
  bodyFatPercentage?: string | null;
  muscleMassKg?: string | null;
  abdominalCircumferenceCm?: string | null;
  armCircumferenceCm?: string | null;
  waistCircumferenceCm?: string | null;
  hipCircumferenceCm?: string | null;
  notes?: string | null;
  professor?: { id: string; name: string } | null;
};

export type ExerciseSummary = {
  id?: string;
  name: string;
  sets: number | string;
  repetitions: string;
  load?: string | null;
  restSeconds?: number | string | null;
  notes?: string | null;
  order: number | string;
};

export type WorkoutSummary = {
  id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  professor?: { id: string; name: string } | null;
  days: Array<{
    id?: string;
    label: "A" | "B" | "C" | "D" | "E";
    exercises: ExerciseSummary[];
  }>;
};
