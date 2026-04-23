-- AUTOTEST payment lifecycle schema
-- Run once in production before enabling TSPay callbacks.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    provider TEXT NOT NULL DEFAULT 'tspay',
    provider_event_id TEXT NULL,
    provider_session_id TEXT NULL,
    provider_payment_id TEXT NULL,
    event_type TEXT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    amount_cents INTEGER NULL,
    currency TEXT NULL,
    idempotency_key TEXT NULL,
    signature TEXT NULL,
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_event_id_unique
    ON payments (provider_event_id)
    WHERE provider_event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_key_unique
    ON payments (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_user_id
    ON payments (user_id);

CREATE INDEX IF NOT EXISTS idx_payments_provider_session_id
    ON payments (provider_session_id);

CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id
    ON payments (provider_payment_id);

CREATE INDEX IF NOT EXISTS idx_payments_status_created_at
    ON payments (status, created_at DESC);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'inactive',
    provider TEXT NOT NULL DEFAULT 'tspay',
    provider_subscription_id TEXT NULL,
    starts_at TIMESTAMPTZ NULL,
    expires_at TIMESTAMPTZ NULL,
    canceled_at TIMESTAMPTZ NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'inactive',
    ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'tspay',
    ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT NULL,
    ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_provider_subscription_id_unique
    ON subscriptions (provider_subscription_id)
    WHERE provider_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status_expires
    ON subscriptions (user_id, status, expires_at DESC);
