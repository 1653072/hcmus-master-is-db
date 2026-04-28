CREATE TABLE IF NOT EXISTS persistent_cart_items (
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id    TEXT        NOT NULL REFERENCES books_ref(mongo_id) ON DELETE CASCADE,
    quantity   INTEGER     NOT NULL DEFAULT 1 CHECK (quantity > 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT persistent_cart_items_pkey PRIMARY KEY (user_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_pci_user_id ON persistent_cart_items(user_id);
