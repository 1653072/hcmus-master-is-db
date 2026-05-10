ALTER TABLE addresses ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX idx_addresses_deleted_at ON addresses (deleted_at);
