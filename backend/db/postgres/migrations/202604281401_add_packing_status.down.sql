ALTER TABLE orders
    DROP COLUMN IF EXISTS address_id,
    DROP COLUMN IF EXISTS note;

-- PostgreSQL does not support removing enum values directly.
-- The enum value 'packing' will remain but be unused.
