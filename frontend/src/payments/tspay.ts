import { createHmac, timingSafeEqual } from "crypto";

import type { PaymentProvider } from "@/payments/provider";
import {
  type CreatePaymentSessionInput,
  type CreatePaymentSessionResult,
  PaymentProviderError,
  PaymentReplayError,
  PaymentSignatureError,
  type VerifiedWebhookEvent,
  type VerifyWebhookInput,
} from "@/payments/types";

interface TSPayProviderConfig {
  baseUrl: string;
  createSessionPath: string;
  merchantId: string;
  apiKey: string;
  webhookSecret: string;
  webhookToleranceSeconds: number;
  requestTimeoutMs: number;
}

type SignatureHeaderParts = {
  timestamp: number;
  signature: string;
};

function safeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function safeDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function parseSignatureHeader(header: string | null): SignatureHeaderParts {
  if (!header || header.trim().length === 0) {
    throw new PaymentSignatureError("Missing TSPay signature header.");
  }

  const parts = header.split(",").map((part) => part.trim());
  const parsed = new Map<string, string>();

  for (const part of parts) {
    const [key, value] = part.split("=", 2).map((entry) => entry?.trim());
    if (key && value) {
      parsed.set(key.toLowerCase(), value);
    }
  }

  const rawTimestamp =
    parsed.get("t") ?? parsed.get("ts") ?? parsed.get("timestamp");
  const signature =
    parsed.get("v1") ?? parsed.get("sig") ?? parsed.get("signature");

  if (!rawTimestamp || !signature) {
    throw new PaymentSignatureError("Invalid TSPay signature header format.");
  }

  const timestamp = Number.parseInt(rawTimestamp, 10);
  if (!Number.isFinite(timestamp)) {
    throw new PaymentSignatureError("Invalid TSPay signature timestamp.");
  }

  return {
    timestamp,
    signature,
  };
}

function signaturesMatch(expected: string, provided: string): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export class TSPayProvider implements PaymentProvider {
  public readonly providerName = "tspay" as const;
  private readonly config: TSPayProviderConfig;

  constructor(config?: Partial<TSPayProviderConfig>) {
    this.config = {
      baseUrl:
        config?.baseUrl ??
        process.env.TSPAY_API_BASE_URL?.trim() ??
        "https://api.tspay.example",
      createSessionPath:
        config?.createSessionPath ??
        process.env.TSPAY_CREATE_SESSION_PATH?.trim() ??
        "/v1/merchant/checkout/sessions",
      merchantId:
        config?.merchantId ?? process.env.TSPAY_MERCHANT_ID?.trim() ?? "",
      apiKey: config?.apiKey ?? process.env.TSPAY_API_KEY?.trim() ?? "",
      webhookSecret:
        config?.webhookSecret ?? process.env.TSPAY_WEBHOOK_SECRET?.trim() ?? "",
      webhookToleranceSeconds:
        config?.webhookToleranceSeconds ??
        Number.parseInt(
          process.env.TSPAY_WEBHOOK_TOLERANCE_SECONDS?.trim() ?? "300",
          10
        ),
      requestTimeoutMs:
        config?.requestTimeoutMs ??
        Number.parseInt(
          process.env.TSPAY_REQUEST_TIMEOUT_MS?.trim() ?? "12000",
          10
        ),
    };
  }

  public async createSession(
    payload: CreatePaymentSessionInput
  ): Promise<CreatePaymentSessionResult> {
    if (!this.config.apiKey || !this.config.merchantId || !this.config.baseUrl) {
      throw new PaymentProviderError("TSPay merchant credentials are missing.");
    }

    const requestBody = {
      merchant_id: this.config.merchantId,
      amount: payload.amountCents,
      currency: payload.currency.toUpperCase(),
      customer: {
        email: payload.email,
        external_user_id: payload.userId,
      },
      success_url: payload.successUrl,
      cancel_url: payload.cancelUrl,
      metadata: payload.metadata ?? {},
      idempotency_key: payload.idempotencyKey,
    };

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.requestTimeoutMs
    );

    try {
      const response = await fetch(
        `${this.config.baseUrl}${this.config.createSessionPath}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
            "X-Merchant-Id": this.config.merchantId,
            "Idempotency-Key": payload.idempotencyKey,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
          cache: "no-store",
        }
      );

      const responseText = await response.text();
      let responseBody: unknown = {};

      if (responseText.trim().length > 0) {
        try {
          responseBody = JSON.parse(responseText);
        } catch {
          responseBody = { raw: responseText };
        }
      }

      if (!response.ok) {
        throw new PaymentProviderError(
          `TSPay create-session failed with status ${response.status}.`
        );
      }

      const body = asRecord(responseBody);
      const sessionId =
        asString(body.session_id) ??
        asString(body.checkout_session_id) ??
        asString(body.id);
      const checkoutUrl = asString(body.checkout_url) ?? asString(body.url);

      if (!sessionId || !checkoutUrl) {
        throw new PaymentProviderError(
          "TSPay create-session response is missing required fields."
        );
      }

      return {
        provider: this.providerName,
        sessionId,
        checkoutUrl,
        rawPayload: body,
      };
    } catch (error) {
      if (error instanceof PaymentProviderError) {
        throw error;
      }
      throw new PaymentProviderError("Failed to create TSPay checkout session.");
    } finally {
      clearTimeout(timeout);
    }
  }

  public verifyWebhook(payload: VerifyWebhookInput): VerifiedWebhookEvent {
    const { signatureHeader, rawBody } = payload;

    if (!this.config.webhookSecret) {
      throw new PaymentSignatureError("TSPay webhook secret is not configured.");
    }

    const parsedSignature = parseSignatureHeader(signatureHeader);
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (
      Math.abs(nowSeconds - parsedSignature.timestamp) >
      this.config.webhookToleranceSeconds
    ) {
      throw new PaymentReplayError("Webhook timestamp outside tolerance window.");
    }

    const signedPayload = Buffer.concat([
      Buffer.from(`${parsedSignature.timestamp}.`, "utf8"),
      rawBody,
    ]);
    const expectedSignature = createHmac("sha256", this.config.webhookSecret)
      .update(signedPayload)
      .digest("hex");

    if (!signaturesMatch(expectedSignature, parsedSignature.signature)) {
      throw new PaymentSignatureError("TSPay webhook signature mismatch.");
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw new PaymentProviderError("Invalid TSPay webhook payload.");
    }

    const root = asRecord(decoded);
    const data = asRecord(root.data);
    const rootMetadata = asRecord(root.metadata);
    const dataMetadata = asRecord(data.metadata);
    const metadata = {
      ...rootMetadata,
      ...dataMetadata,
    };

    const providerEventId = asString(root.event_id) ?? asString(root.id);
    const eventType = asString(root.type) ?? asString(root.event_type);
    if (!providerEventId || !eventType) {
      throw new PaymentProviderError(
        "Webhook payload missing event identifier or type."
      );
    }

    const status = asString(data.status) ?? asString(root.status);
    const sessionId =
      asString(data.session_id) ?? asString(data.checkout_session_id);
    const paymentId = asString(data.payment_id) ?? asString(data.id);
    const userId =
      asString(metadata.user_id) ??
      asString(data.user_id) ??
      asString(root.user_id);
    const amountCents =
      safeNumber(data.amount_cents) ??
      safeNumber(data.amount) ??
      safeNumber(root.amount_cents) ??
      safeNumber(root.amount);
    const currency =
      asString(data.currency)?.toUpperCase() ??
      asString(root.currency)?.toUpperCase();

    const occurredAt =
      safeDate(root.created_at) ??
      new Date(parsedSignature.timestamp * 1000);

    const normalizedType = eventType.toLowerCase();
    const normalizedStatus = (status ?? "").toLowerCase();

    const successTypes = new Set([
      "payment.succeeded",
      "checkout.session.completed",
    ]);
    const failureTypes = new Set([
      "payment.failed",
      "checkout.session.failed",
      "checkout.session.canceled",
    ]);
    const successStatuses = new Set([
      "success",
      "succeeded",
      "completed",
      "paid",
    ]);
    const failureStatuses = new Set([
      "failed",
      "declined",
      "canceled",
      "cancelled",
      "expired",
    ]);

    const isSuccess =
      successTypes.has(normalizedType) &&
      (normalizedStatus.length === 0 ||
        successStatuses.has(normalizedStatus));
    const isFailure =
      failureTypes.has(normalizedType) || failureStatuses.has(normalizedStatus);

    return {
      provider: this.providerName,
      providerEventId,
      eventType,
      occurredAt,
      sessionId,
      paymentId,
      userId,
      status,
      amountCents:
        typeof amountCents === "number" ? Math.trunc(amountCents) : null,
      currency: currency ?? null,
      metadata,
      rawPayload: root,
      isSuccess,
      isFailure,
    };
  }
}
