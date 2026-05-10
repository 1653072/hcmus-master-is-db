-- Enable the pgcrypto extension so gen_random_uuid() is available on PostgreSQL < 13.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ───────────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE order_status AS ENUM (
    'pending',
    'confirmed',
    'packing',
    'shipping',
    'completed',
    'cancelled'
);

-- ── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL    NOT NULL,
    alias_id      UUID         NOT NULL DEFAULT gen_random_uuid(),
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    phone         VARCHAR(20),
    password_hash TEXT         NOT NULL,
    role          user_role    NOT NULL DEFAULT 'user',
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    default_addr  TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT users_pkey        PRIMARY KEY (id),
    CONSTRAINT users_alias_unique UNIQUE      (alias_id),
    CONSTRAINT users_email_unique UNIQUE      (email)
);

CREATE INDEX idx_users_alias    ON users (alias_id);
CREATE INDEX idx_users_email    ON users (email);
CREATE INDEX idx_users_role     ON users (role);
CREATE INDEX idx_users_active   ON users (is_active);

-- ── Addresses ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS addresses (
    id             BIGSERIAL   NOT NULL,
    alias_id       UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id        BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_name  TEXT        NOT NULL,
    phone          TEXT        NOT NULL,
    address_line   TEXT        NOT NULL,
    ward           TEXT,
    district       TEXT,
    city           TEXT        NOT NULL,
    is_default     BOOLEAN     NOT NULL DEFAULT false,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT addresses_pkey        PRIMARY KEY (id),
    CONSTRAINT addresses_alias_unique UNIQUE      (alias_id)
);

CREATE INDEX IF NOT EXISTS idx_addresses_alias    ON addresses(alias_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id  ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_default  ON addresses(user_id, is_default);

-- ── Books Reference ──────────────────────────────────────────────────────────
-- Bridge table: maps MongoDB book ObjectIDs into PostgreSQL so that
-- inventory and cart_items can reference them via a FK.
-- The mongo_id TEXT is the primary key (matching BookRef.MongoID in Go).
-- No alias_id is needed here since books are addressed by their MongoDB ObjectID.
CREATE TABLE IF NOT EXISTS books_ref (
    mongo_id  TEXT    NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT books_ref_pkey PRIMARY KEY (mongo_id)
);

CREATE INDEX idx_books_ref_is_active ON books_ref (is_active);

-- ── Inventory ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
    book_id        TEXT        NOT NULL REFERENCES books_ref(mongo_id) ON DELETE CASCADE,
    stock_quantity INTEGER     NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT inventory_pkey PRIMARY KEY (book_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_book_id ON inventory(book_id);

-- ── Orders ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id               BIGSERIAL      NOT NULL,
    alias_id         UUID           NOT NULL DEFAULT gen_random_uuid(),
    user_id          BIGINT         NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    status           order_status   NOT NULL DEFAULT 'pending',
    total_amount     NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
    address_id       BIGINT         REFERENCES addresses(id) ON DELETE SET NULL,
    note             TEXT,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT orders_pkey        PRIMARY KEY (id),
    CONSTRAINT orders_alias_unique UNIQUE      (alias_id)
);

CREATE INDEX idx_orders_alias     ON orders (alias_id);
CREATE INDEX idx_orders_user_id   ON orders (user_id);
CREATE INDEX idx_orders_status    ON orders (status);
CREATE INDEX idx_orders_created   ON orders (created_at DESC);

-- ── Order Items ──────────────────────────────────────────────────────────────
-- Columns map exactly to the Go domain.OrderItem struct fields.
-- "name" matches the Go field Name (GORM default snake_case column name).
CREATE TABLE IF NOT EXISTS order_items (
    id            BIGSERIAL      NOT NULL,
    order_id      BIGINT         NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    mongo_book_id TEXT           NOT NULL,
    name          TEXT           NOT NULL,
    quantity      INTEGER        NOT NULL CHECK (quantity > 0),
    unit_price    NUMERIC(12, 2) NOT NULL CHECK (unit_price > 0),

    CONSTRAINT order_items_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_order_items_order_id ON order_items (order_id);

-- ── Order Status History ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_status_histories (
    id                       BIGSERIAL   NOT NULL,
    alias_id                 UUID        NOT NULL DEFAULT gen_random_uuid(),
    order_id                 BIGINT      NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    old_status               VARCHAR(20),
    new_status               VARCHAR(20) NOT NULL,
    changed_by_admin_alias_id UUID,
    note                     TEXT,
    changed_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT osh_pkey        PRIMARY KEY (id),
    CONSTRAINT osh_alias_unique UNIQUE      (alias_id)
);

CREATE INDEX IF NOT EXISTS idx_osh_alias      ON order_status_histories(alias_id);
CREATE INDEX IF NOT EXISTS idx_osh_order_id   ON order_status_histories(order_id);
CREATE INDEX IF NOT EXISTS idx_osh_changed_at ON order_status_histories(changed_at DESC);

-- ── Carts ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carts (
    id         BIGSERIAL   NOT NULL,
    user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT carts_pkey         PRIMARY KEY (id),
    CONSTRAINT carts_user_unique  UNIQUE      (user_id)
);

CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);

-- ── Cart Items ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_items (
    cart_id    BIGINT      NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    book_id    TEXT        NOT NULL REFERENCES books_ref(mongo_id) ON DELETE CASCADE,
    quantity   INTEGER     NOT NULL DEFAULT 1 CHECK (quantity > 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT cart_items_pkey PRIMARY KEY (cart_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);

-- ── Payments ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id           BIGSERIAL      NOT NULL,
    alias_id     UUID           NOT NULL DEFAULT gen_random_uuid(),
    order_id     BIGINT         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    method       VARCHAR(50)    NOT NULL,
    status       VARCHAR(30)    NOT NULL DEFAULT 'pending',
    amount       NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    provider_ref TEXT,
    paid_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),

    CONSTRAINT payments_pkey        PRIMARY KEY (id),
    CONSTRAINT payments_alias_unique UNIQUE      (alias_id)
);

CREATE INDEX IF NOT EXISTS idx_payments_alias    ON payments(alias_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status   ON payments(status);

-- ── Shipments ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipments (
    id           BIGSERIAL   NOT NULL,
    alias_id     UUID        NOT NULL DEFAULT gen_random_uuid(),
    order_id     BIGINT      NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status       VARCHAR(30) NOT NULL DEFAULT 'pending',
    carrier      TEXT,
    tracking_no  TEXT,
    shipped_at   TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT shipments_pkey        PRIMARY KEY (id),
    CONSTRAINT shipments_alias_unique UNIQUE      (alias_id)
);

CREATE INDEX IF NOT EXISTS idx_shipments_alias    ON shipments(alias_id);
CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_no);
CREATE INDEX IF NOT EXISTS idx_shipments_status   ON shipments(status);
