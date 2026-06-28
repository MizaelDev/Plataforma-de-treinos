import type { PaymentProvider } from "@prisma/client";
import { env } from "../config/env.js";

export type PixChargeInput = {
  transactionId: string;
  invoiceId: string;
  amount: number;
  payerName: string;
  payerEmail: string;
  expiresAt: Date;
};

export type PixChargeResult = {
  providerPaymentId: string;
  qrCode: string;
  qrCodeBase64: string;
  copyPasteCode: string;
  expiresAt: Date;
  rawProviderResponse: Record<string, unknown>;
};

export type PixPaymentStatusResult = {
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED" | "FAILED";
  paidAt?: Date | null;
  amount?: number | null;
  rawProviderResponse: Record<string, unknown>;
};

export type PixProviderClient = {
  provider: PaymentProvider;
  createPixCharge(input: PixChargeInput): Promise<PixChargeResult>;
  getPaymentStatus?(providerPaymentId: string): Promise<PixPaymentStatusResult>;
};

function svgToBase64(svg: string) {
  return Buffer.from(svg).toString("base64");
}

function buildMockQrSvg(copyPasteCode: string) {
  const escapedCode = copyPasteCode.replace(/[<>&"]/g, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" fill="#fff"/><rect x="20" y="20" width="56" height="56" fill="#111827"/><rect x="164" y="20" width="56" height="56" fill="#111827"/><rect x="20" y="164" width="56" height="56" fill="#111827"/><rect x="92" y="92" width="18" height="18" fill="#111827"/><rect x="128" y="92" width="18" height="18" fill="#111827"/><rect x="92" y="128" width="18" height="18" fill="#111827"/><rect x="128" y="128" width="18" height="18" fill="#111827"/><rect x="164" y="128" width="18" height="18" fill="#111827"/><rect x="128" y="164" width="18" height="18" fill="#111827"/><text x="120" y="232" text-anchor="middle" font-family="Arial" font-size="9" fill="#374151">${escapedCode.slice(0, 30)}</text></svg>`;
}

function normalizeMercadoPagoStatus(status?: string, statusDetail?: string): PixPaymentStatusResult["status"] {
  if (status === "approved") return "PAID";
  if (status === "cancelled") return "CANCELLED";
  if (status === "rejected") return "FAILED";
  if (status === "refunded" || status === "charged_back") return "CANCELLED";
  if (statusDetail === "expired") return "EXPIRED";
  return "PENDING";
}

function mercadoPagoNotificationUrl() {
  const baseUrl = env.API_BASE_URL ?? env.PUBLIC_APP_URL;
  return baseUrl ? `${baseUrl.replace(/\/$/, "")}/webhooks/mercadopago` : undefined;
}

function fallbackPayerEmail(email: string) {
  return email.includes("@") ? email : "aluno@pagamento.local";
}

class MockPixProvider implements PixProviderClient {
  provider: PaymentProvider;

  constructor(provider: PaymentProvider) {
    this.provider = provider;
  }

  async createPixCharge(input: PixChargeInput): Promise<PixChargeResult> {
    const providerPaymentId = `mock_${input.transactionId}`;
    const copyPasteCode = `00020126580014br.gov.bcb.pix0136${input.transactionId}520400005303986540${input.amount.toFixed(2)}5802BR5925${input.payerName.slice(0, 25)}6009SAO PAULO62070503***6304MOCK`;
    const svg = buildMockQrSvg(copyPasteCode);

    return {
      providerPaymentId,
      qrCode: copyPasteCode,
      qrCodeBase64: svgToBase64(svg),
      copyPasteCode,
      expiresAt: input.expiresAt,
      rawProviderResponse: {
        mode: "mock",
        provider: this.provider,
        providerPaymentId,
        invoiceId: input.invoiceId
      }
    };
  }
}

class MercadoPagoPixProvider extends MockPixProvider {
  async createPixCharge(input: PixChargeInput): Promise<PixChargeResult> {
    if (env.PIX_PROVIDER_MODE === "mock" || !env.MERCADO_PAGO_ACCESS_TOKEN) {
      return super.createPixCharge(input);
    }

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.MERCADO_PAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": input.transactionId
      },
      body: JSON.stringify({
        transaction_amount: input.amount,
        description: `Mensalidade ${input.invoiceId}`,
        payment_method_id: "pix",
        external_reference: input.transactionId,
        notification_url: mercadoPagoNotificationUrl(),
        date_of_expiration: input.expiresAt.toISOString(),
        payer: {
          email: fallbackPayerEmail(input.payerEmail),
          first_name: input.payerName.split(" ")[0] ?? input.payerName
        }
      })
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error("Não foi possível gerar o Pix no Mercado Pago.");
    }

    const transactionData = ((payload.point_of_interaction as Record<string, unknown> | undefined)?.transaction_data ?? {}) as Record<string, unknown>;
    const providerPaymentId = String(payload.id ?? "");
    const qrCode = String(transactionData.qr_code ?? "");
    const qrCodeBase64 = String(transactionData.qr_code_base64 ?? "");

    if (!providerPaymentId || !qrCode) {
      throw new Error("Mercado Pago não retornou os dados do QR Code Pix.");
    }

    return {
      providerPaymentId,
      qrCode,
      qrCodeBase64,
      copyPasteCode: qrCode,
      expiresAt: input.expiresAt,
      rawProviderResponse: payload
    };
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PixPaymentStatusResult> {
    if (env.PIX_PROVIDER_MODE === "mock" || !env.MERCADO_PAGO_ACCESS_TOKEN || providerPaymentId.startsWith("mock_")) {
      return {
        status: "PENDING",
        rawProviderResponse: { mode: "mock", providerPaymentId }
      };
    }

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(providerPaymentId)}`, {
      headers: { Authorization: `Bearer ${env.MERCADO_PAGO_ACCESS_TOKEN}` }
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error("Não foi possível consultar o pagamento no Mercado Pago.");
    }

    const status = String(payload.status ?? "");
    const statusDetail = String(payload.status_detail ?? "");

    return {
      status: normalizeMercadoPagoStatus(status, statusDetail),
      paidAt: payload.date_approved ? new Date(String(payload.date_approved)) : null,
      amount: typeof payload.transaction_amount === "number" ? payload.transaction_amount : null,
      rawProviderResponse: payload
    };
  }
}

export function getPixProvider(): PixProviderClient {
  const provider = env.PIX_PROVIDER;

  if (provider === "MERCADO_PAGO") {
    return new MercadoPagoPixProvider(provider);
  }

  return new MockPixProvider(provider);
}
