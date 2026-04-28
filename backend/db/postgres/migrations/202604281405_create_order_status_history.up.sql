CREATE TABLE IF NOT EXISTS order_status_history (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    old_status          VARCHAR(20),
    new_status          VARCHAR(20) NOT NULL,
    changed_by_admin_id UUID        REFERENCES users(id) ON DELETE SET NULL,
    note                TEXT,
    changed_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_osh_order_id   ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_osh_changed_at ON order_status_history(changed_at DESC);
