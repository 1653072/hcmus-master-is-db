DROP CONSTRAINT book_mongo_id_unique IF EXISTS;
DROP CONSTRAINT author_name_unique IF EXISTS;
DROP CONSTRAINT publisher_name_unique IF EXISTS;
DROP CONSTRAINT series_name_unique IF EXISTS;
DROP CONSTRAINT tag_name_unique IF EXISTS;
DROP CONSTRAINT category_id_unique IF EXISTS;

DROP INDEX book_title_index IF EXISTS;
DROP INDEX book_active_index IF EXISTS;
DROP INDEX book_status_index IF EXISTS;
