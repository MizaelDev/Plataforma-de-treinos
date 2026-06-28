import { createHmac, timingSafeEqual } from "crypto";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { getPixProvider } from "../services/payment-provider.js";
import { confirmPaymentTransaction } from "../services/payments.service.js";
import { asyncRoute } from "../utils/async-route.js";
import { requiredParam } from "../utils/http.js";

export const paymentWebhooksRouter = Router();

const webhookSchema = z.object({
  transactionId: z.string().uuid().optional(),
  providerPaymentId: z.string().optional(),
  status: z.enum(["PENDING", "PAID", "EXPIRED", "CANCELLED", "FAILED"]).default("PAID")
});

function parseMercadoPagoSignature(header?: string) {
  return Object.fromEntries(
    (header ?? "")
      .split(",")
      .map((part) => part.trim().split("="))
      .filter(([key, value]) => key && value)
  ) as { ts?: string; v1?: string };
}

function extractMercadoPagoPaymentId(body: unknown, query: Record<string, unknown>) {
  const payload = body as Record<string, unknown>;
  const data = payload.data as Record<string, unknown> | undefined;
  const queryData = query["data.id"];
  return String(data?.id ?? payload.id ?? queryData ?? query.id ?? "");
}

function validateMercadoPagoSignature(requestId: string | undefined, signatureHeader: string | undefined, paymentId: string) {
  const secret = env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) return true;

  const signature = parseMercadoPagoSignature(signatureHeader);
  if (!signature.ts || !signature.v1 || !requestId || !paymentId) return false;

  const manifest = `id:${paymentId};request-id:${requestId};ts:${signature.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const received = signature.v1;
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");

  return (
    expected.length === received.length &&
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

paymentWebhooksRouter.post(
  "/mercadopago",
  asyncRoute(async (request, response) => {
    const providerPaymentId = extractMercadoPagoPaymentId(request.body, request.query);

    if (
      !validateMercadoPagoSignature(
        request.header("x-request-id"),
        request.header("x-signature"),
        providerPaymentId
      )
    ) {
      response.status(401).json({ message: "Webhook não autorizado." });
      return;
    }

    if (!providerPaymentId) {
      response.status(200).json({ received: true, ignored: true });
      return;
    }

    const provider = getPixProvider();
    const statusResult = provider.getPaymentStatus
      ? await provider.getPaymentStatus(providerPaymentId)
      : { status: "PENDING" as const, rawProviderResponse: request.body as Record<string, unknown> };

    const transaction = await confirmPaymentTransaction({
      provider: "MERCADO_PAGO",
      providerPaymentId,
      status: statusResult.status,
      paidAt: statusResult.paidAt ?? undefined,
      paidAmount: statusResult.amount ?? undefined,
      rawWebhookPayload: {
        notification: request.body,
        providerStatus: statusResult.rawProviderResponse
      }
    });

    response.json({ received: true, transactionId: transaction.id });
  })
);

paymentWebhooksRouter.post(
  "/payments/:provider",
  asyncRoute(async (request, response) => {
    if (env.PAYMENT_WEBHOOK_SECRET) {
      const signature = request.header("x-payment-webhook-secret");
      if (signature !== env.PAYMENT_WEBHOOK_SECRET) {
        response.status(401).json({ message: "Webhook não autorizado." });
        return;
      }
    }

    const provider = requiredParam(request, "provider");
    const data = webhookSchema.parse(request.body);

    if (!data.transactionId && !data.providerPaymentId) {
      response.status(400).json({ message: "Informe transactionId ou providerPaymentId." });
      return;
    }

    const transaction = await confirmPaymentTransaction({
      provider,
      transactionId: data.transactionId,
      providerPaymentId: data.providerPaymentId,
      status: data.status,
      rawWebhookPayload: request.body
    });

    response.json({ received: true, transaction });
  })
);
