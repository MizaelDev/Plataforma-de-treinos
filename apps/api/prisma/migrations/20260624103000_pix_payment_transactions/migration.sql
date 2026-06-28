CREATE TYPE "PaymentProvider" AS ENUM ('MERCADO_PAGO', 'ASAAS', 'EFI');
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'FAILED');

CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerPaymentId" TEXT,
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2) NOT NULL,
    "qrCode" TEXT,
    "qrCodeBase64" TEXT,
    "copyPasteCode" TEXT,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "rawProviderResponse" JSONB,
    "rawWebhookPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentTransaction_organizationId_status_createdAt_idx" ON "PaymentTransaction"("organizationId", "status", "createdAt");
CREATE INDEX "PaymentTransaction_invoiceId_status_idx" ON "PaymentTransaction"("invoiceId", "status");
CREATE INDEX "PaymentTransaction_provider_providerPaymentId_idx" ON "PaymentTransaction"("provider", "providerPaymentId");

ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
