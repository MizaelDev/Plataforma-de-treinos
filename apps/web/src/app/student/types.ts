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
  dueDay?: number;
  allowAssessments?: boolean;
  allowWorkouts?: boolean;
};

export type InvoiceSummary = {
  id: string;
  dueDate: string;
  paidAt?: string | null;
  amount: string;
  totalPaid?: string | number;
  status: "PAGO" | "PENDENTE" | "ATRASADO" | "CANCELADO";
  plan?: PlanSummary | null;
  charges?: {
    total: string;
    fineAmount: string;
    interestAmount: string;
    overdueDays: number;
  };
  paymentTransactions?: PaymentTransactionSummary[];
};

export type PaymentTransactionSummary = {
  id: string;
  provider: "MOCK" | "MERCADO_PAGO" | "ASAAS" | "EFI";
  providerPaymentId?: string | null;
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED" | "FAILED";
  amount: string;
  qrCode?: string | null;
  qrCodeBase64?: string | null;
  copyPasteCode?: string | null;
  expiresAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
};

export type AssessmentSummary = {
  id: string;
  assessedAt: string;
  startDate?: string | null;
  trainingGoals?: string[];
  weightKg: string;
  heightCm: string;
  bmi: string;
  bodyFatPercentage?: string | null;
  muscleMassKg?: string | null;
  abdominalCircumferenceCm?: string | null;
  armCircumferenceCm?: string | null;
  leftArmCircumferenceCm?: string | null;
  rightArmCircumferenceCm?: string | null;
  leftLegCircumferenceCm?: string | null;
  rightLegCircumferenceCm?: string | null;
  chestCircumferenceCm?: string | null;
  shoulderCircumferenceCm?: string | null;
  gluteCircumferenceCm?: string | null;
  leftCalfCircumferenceCm?: string | null;
  rightCalfCircumferenceCm?: string | null;
  waistCircumferenceCm?: string | null;
  hipCircumferenceCm?: string | null;
  bioimpedance?: Record<string, string | number | null> | null;
  anthropometry?: Record<string, string | number | null> | null;
  anthropometryMeasuredAt?: string | null;
  skinfolds?: Record<string, string | number | null> | null;
  skinfoldsMeasuredAt?: string | null;
  physicalTests?: Record<string, string | number | null> | null;
  notes?: string | null;
  professor?: { id: string; name: string } | null;
};

export type ExerciseSummary = {
  id?: string;
  libraryExerciseId?: string | null;
  name: string;
  sets: number | string;
  repetitions: string;
  load?: string | null;
  restSeconds?: number | string | null;
  notes?: string | null;
  order: number | string;
  libraryExercise?: {
    id: string;
    name: string;
    modality?: string | null;
    category?: string | null;
    muscleGroup?: string | null;
    difficultyLevel?: string | null;
    description?: string | null;
    executionInstructions?: string | null;
    commonMistakes?: string | null;
    mediaType: "IMAGE" | "GIF" | "VIDEO" | "EXTERNAL_URL";
    mediaUrl: string;
    thumbnailUrl?: string | null;
  } | null;
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
