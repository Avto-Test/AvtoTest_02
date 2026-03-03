import type {
  CreatePaymentSessionInput,
  CreatePaymentSessionResult,
  PaymentProviderName,
  VerifiedWebhookEvent,
  VerifyWebhookInput,
} from "@/payments/types";

export interface PaymentProvider {
  readonly providerName: PaymentProviderName;

  createSession(
    payload: CreatePaymentSessionInput
  ): Promise<CreatePaymentSessionResult>;

  verifyWebhook(payload: VerifyWebhookInput): VerifiedWebhookEvent;
}
