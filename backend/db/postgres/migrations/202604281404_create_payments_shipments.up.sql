CREATE TABLE IF NOT EXISTS payments (
    id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     UUID           NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    method       VARCHAR(50)    NOT NULL,
    status       VARCHAR(30)    NOT NULL DEFAULT 'pending',
    amount       NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    provider_ref TEXT,
    paid_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);

CREATE TABLE IF NOT EXISTS shipments (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status       VARCHAR(30) NOT NULL DEFAULT 'pending',
    carrier      TEXT,
    tracking_no  TEXT,
    shipped_at   TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON shipments(order_id);
