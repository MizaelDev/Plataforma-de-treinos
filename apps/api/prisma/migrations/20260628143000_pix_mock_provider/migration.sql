ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'MOCK';

CREATE TYPE "InvoicePaymentMethod" AS ENUM ('MANUAL', 'PIX_MOCK', 'PIX_MERCADO_PAGO');

ALTER TABLE "Invoice"
ADD COLUMN "paymentMethod" "InvoicePaymentMethod",
ADD COLUMN "externalPaymentId" TEXT;
