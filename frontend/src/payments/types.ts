export type PaymentProviderName = "tspay";

export interface CreatePaymentSessionInput {
  userId: string;
  email: string;
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentSessionResult {
  provider: PaymentProviderName;
  sessionId: string;
  checkoutUrl: string;
  rawPayload: Record<string, unknown>;
}

export interface VerifyWebhookInput {
  rawBody: Buffer;
  signatureHeader: string | null;
}

export interface VerifiedWebhookEvent {
  provider: PaymentProviderName;
  providerEventId: string;
  eventType: string;
  occurredAt: Date;
  sessionId: string | null;
  paymentId: string | null;
  userId: string | null;
  status: string | null;
  amountCents: number | null;
  currency: string | null;
  metadata: Record<string, unknown>;
  rawPayload: Record<string, unknown>;
  isSuccess: boolean;
  isFailure: boolean;
}

export class PaymentProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentProviderError";
  }
}

export class PaymentSignatureError extends PaymentProviderError {
  constructor(message: string) {
    super(message);
    this.name = "PaymentSignatureError";
  }
}

export class PaymentReplayError extends PaymentSignatureError {
  constructor(message: string) {
    super(message);
    this.name = "PaymentReplayError";
  }
}
