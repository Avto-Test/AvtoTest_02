CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id
    ON analytics_events (user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name
    ON analytics_events (event_name);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
    ON analytics_events (created_at DESC);