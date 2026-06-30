import { Prisma, type PaymentProvider, type PaymentTransactionStatus } from "@prisma/client";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";
import { auditLog } from "./audit.service.js";
import { calculateInvoiceCharges } from "./finance.service.js";
import { getPixProvider, type PixPaymentStatusResult } from "./payment-provider.js";
import { prisma } from "./prisma.js";

type ActorContext = {
  userId?: string;
  role?: string;
  organizationId: string;
  studentId?: string;
};

export const safePaymentTransactionSelect = {
  id: true,
  provider: true,
  providerPaymentId: true,
  status: true,
  amount: true,
  qrCode: true,
  qrCodeBase64: true,
  copyPasteCode: true,
  expiresAt: true,
  paidAt: true,
  createdAt: true
} as const;

function addMinutes(date: Date, minutes: number) {
  const nextDate = new Date(date);
  nextDate.setMinutes(nextDate.getMinutes() + minutes);
  return nextDate;
}

function toNumber(value: Prisma.Decimal | number | string) {
  return Number(value);
}

function providerFromParam(provider: string): PaymentProvider {
  const normalized = provider.trim().toUpperCase().replace("-", "_");
  const providerName = normalized === "MERCADOPAGO" ? "MERCADO_PAGO" : normalized;
  if (providerName !== "MOCK" && providerName !== "MERCADO_PAGO" && providerName !== "ASAAS" && providerName !== "EFI") {
    throw new AppError(400, "Provedor de pagamento inválido.");
  }
  return providerName;
}

function invoicePaymentMethodForProvider(provider: PaymentProvider) {
  if (provider === "MOCK") return "PIX_MOCK";
  if (provider === "MERCADO_PAGO") return "PIX_MERCADO_PAGO";
  return undefined;
}

async function updateTransactionFromProvider(transactionId: string, statusResult: PixPaymentStatusResult) {
  if (statusResult.status === "PAID") {
    return confirmPaymentTransaction({
      provider: "MERCADO_PAGO",
      transactionId,
      status: "PAID",
      paidAt: statusResult.paidAt ?? undefined,
      paidAmount: statusResult.amount ?? undefined,
      rawWebhookPayload: statusResult.rawProviderResponse
    });
  }

  return prisma.paymentTransaction.update({
    where: { id: transactionId },
    data: {
      status: statusResult.status,
      rawProviderResponse: statusResult.rawProviderResponse as Prisma.InputJsonValue
    },
    select: { ...safePaymentTransactionSelect, invoice: { select: { id: true, status: true, paidAt: true } } }
  });
}

export async function createPixPayment(invoiceId: string, context: ActorContext) {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      organizationId: context.organizationId,
      ...(context.role === "ALUNO" ? { studentId: context.studentId } : {})
    },
    include: {
      student: { select: { id: true, fullName: true, email: true } },
      paymentTransactions: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  if (!invoice) {
    throw new AppError(404, "Mensalidade não encontrada para este usuário.");
  }

  if (invoice.status === "PAGO") {
    throw new AppError(400, "Esta mensalidade já está paga.");
  }

  if (invoice.status === "CANCELADO") {
    throw new AppError(400, "Não é possível pagar uma mensalidade cancelada.");
  }

  const pendingTransaction = invoice.paymentTransactions[0];
  if (pendingTransaction && (!pendingTransaction.expiresAt || pendingTransaction.expiresAt > new Date())) {
    return prisma.paymentTransaction.findUniqueOrThrow({
      where: { id: pendingTransaction.id },
      select: safePaymentTransactionSelect
    });
  }

  if (pendingTransaction?.expiresAt && pendingTransaction.expiresAt <= new Date()) {
    await prisma.paymentTransaction.update({
      where: { id: pendingTransaction.id },
      data: { status: "EXPIRED" }
    });
  }

  const charges = await calculateInvoiceCharges(context.organizationId, invoice.dueDate, invoice.amount);
  const provider = getPixProvider();
  const expiresAt = addMinutes(new Date(), env.PIX_PAYMENT_EXPIRES_MINUTES);

  const transaction = await prisma.paymentTransaction.create({
    data: {
      organizationId: context.organizationId,
      invoiceId: invoice.id,
      studentId: invoice.studentId,
      provider: provider.provider,
      status: "PENDING",
      amount: charges.total,
      expiresAt
    }
  });

  let charge;
  try {
    charge = await provider.createPixCharge({
      transactionId: transaction.id,
      invoiceId: invoice.id,
      amount: toNumber(charges.total),
      payerName: invoice.student.fullName,
      payerEmail: invoice.student.email,
      expiresAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar Pix.";
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: "FAILED",
        rawProviderResponse: {
          message
        }
      }
    });
    if (message.includes("MERCADO_PAGO_ACCESS_TOKEN")) {
      throw new AppError(502, "Mercado Pago não está configurado. Informe MERCADO_PAGO_ACCESS_TOKEN no ambiente da API.");
    }
    throw new AppError(502, "Não foi possível gerar o Pix agora. Tente novamente em instantes.");
  }

  const updatedTransaction = await prisma.paymentTransaction.update({
    where: { id: transaction.id },
    data: {
      providerPaymentId: charge.providerPaymentId,
      qrCode: charge.qrCode,
      qrCodeBase64: charge.qrCodeBase64,
      copyPasteCode: charge.copyPasteCode,
      expiresAt: charge.expiresAt,
      rawProviderResponse: charge.rawProviderResponse as Prisma.InputJsonValue
    }
  });

  await auditLog({
    organizationId: context.organizationId,
    actorUserId: context.userId,
    action: "CREATE_PIX_PAYMENT",
    entity: "PaymentTransaction",
    entityId: updatedTransaction.id,
    metadata: { invoiceId: invoice.id, provider: updatedTransaction.provider }
  });

  return prisma.paymentTransaction.findUniqueOrThrow({
    where: { id: updatedTransaction.id },
    select: safePaymentTransactionSelect
  });
}

export async function getPaymentStatus(transactionId: string, context: ActorContext) {
  const transaction = await prisma.paymentTransaction.findFirst({
    where: {
      id: transactionId,
      organizationId: context.organizationId,
      ...(context.role === "ALUNO" ? { studentId: context.studentId } : {})
    },
    select: { ...safePaymentTransactionSelect, invoice: { select: { id: true, status: true, paidAt: true } } }
  });

  if (!transaction) {
    throw new AppError(404, "Pagamento não encontrado.");
  }

  if (transaction.status === "PENDING" && transaction.expiresAt && transaction.expiresAt < new Date()) {
    return prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { status: "EXPIRED" },
      select: { ...safePaymentTransactionSelect, invoice: { select: { id: true, status: true, paidAt: true } } }
    });
  }

  if (transaction.status === "PENDING" && transaction.providerPaymentId) {
    const provider = getPixProvider();
    if (provider.getPaymentStatus) {
      try {
        return await updateTransactionFromProvider(transaction.id, await provider.getPaymentStatus(transaction.providerPaymentId));
      } catch {
        return transaction;
      }
    }
  }

  return transaction;
}

export async function mockConfirmPayment(transactionId: string, context: ActorContext) {
  if (env.NODE_ENV === "production" || env.PAYMENT_PROVIDER !== "mock") {
    throw new AppError(403, "Confirmação mock disponível apenas em desenvolvimento.");
  }

  const transaction = await prisma.paymentTransaction.findFirst({
    where: {
      id: transactionId,
      organizationId: context.organizationId,
      ...(context.role === "ALUNO" ? { studentId: context.studentId } : {})
    },
    select: { id: true, provider: true }
  });

  if (!transaction) {
    throw new AppError(404, "Pagamento não encontrado.");
  }

  const paidTransaction = await confirmPaymentTransaction({
    provider: transaction.provider,
    transactionId: transaction.id,
    status: "PAID",
    rawWebhookPayload: {
      mode: "mock",
      confirmedByUserId: context.userId,
      confirmedAt: new Date().toISOString()
    }
  });

  return prisma.paymentTransaction.findUniqueOrThrow({
    where: { id: paidTransaction.id },
    select: safePaymentTransactionSelect
  });
}

export async function confirmPaymentTransaction(input: {
  provider: string;
  providerPaymentId?: string;
  transactionId?: string;
  status: PaymentTransactionStatus;
  paidAt?: Date;
  paidAmount?: number;
  rawWebhookPayload: unknown;
}) {
  const provider = providerFromParam(input.provider);
  const transaction = await prisma.paymentTransaction.findFirst({
    where: {
      provider,
      ...(input.transactionId ? { id: input.transactionId } : {}),
      ...(input.providerPaymentId ? { providerPaymentId: input.providerPaymentId } : {})
    }
  });

  if (!transaction) {
    throw new AppError(404, "Transação de pagamento não encontrada.");
  }

  if (transaction.status === "PAID") {
    return transaction;
  }

  if (input.status !== "PAID") {
    return prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: input.status,
        rawWebhookPayload: input.rawWebhookPayload as Prisma.InputJsonValue
      }
    });
  }

  const paidAt = input.paidAt ?? new Date();
  const totalPaid = input.paidAmount ?? transaction.amount;
  const paymentMethod = invoicePaymentMethodForProvider(provider);
  const paidTransaction = await prisma.$transaction(async (tx) => {
    const paidTransaction = await tx.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: "PAID",
        paidAt,
        rawWebhookPayload: input.rawWebhookPayload as Prisma.InputJsonValue
      }
    });

    const invoice = await tx.invoice.findFirst({
      where: { id: transaction.invoiceId, organizationId: transaction.organizationId }
    });

    if (invoice && invoice.status !== "PAGO") {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "PAGO",
          paidAt,
          totalPaid,
          ...(paymentMethod ? { paymentMethod } : {}),
          externalPaymentId: transaction.providerPaymentId,
          fineAmount: 0,
          interestAmount: 0
        }
      });
    }

    return paidTransaction;
  });

  await auditLog({
    organizationId: paidTransaction.organizationId,
    action: "PIX_PAYMENT_CONFIRMED",
    entity: "PaymentTransaction",
    entityId: paidTransaction.id,
    metadata: { invoiceId: paidTransaction.invoiceId, provider: paidTransaction.provider }
  });

  return paidTransaction;
}
