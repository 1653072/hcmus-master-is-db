CREATE TABLE IF NOT EXISTS inventory (
    book_id        TEXT        NOT NULL REFERENCES books_ref(mongo_id) ON DELETE CASCADE,
    stock_quantity INTEGER     NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT inventory_pkey PRIMARY KEY (book_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_book_id ON inventory(book_id);
