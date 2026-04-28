CREATE TABLE IF NOT EXISTS addresses (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_name  TEXT        NOT NULL,
    phone          TEXT        NOT NULL,
    address_line   TEXT        NOT NULL,
    ward           TEXT,
    district       TEXT,
    city           TEXT        NOT NULL,
    is_default     BOOLEAN     NOT NULL DEFAULT false,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_default  ON addresses(user_id, is_default);
