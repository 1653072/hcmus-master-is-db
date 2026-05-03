// ── Node uniqueness constraints ───────────────────────────────────────────────
CREATE CONSTRAINT book_mongo_id_unique IF NOT EXISTS FOR (b:Book) REQUIRE b.mongo_id IS UNIQUE;
CREATE CONSTRAINT author_name_unique   IF NOT EXISTS FOR (a:Author) REQUIRE a.name IS UNIQUE;
CREATE CONSTRAINT publisher_name_unique IF NOT EXISTS FOR (p:Publisher) REQUIRE p.name IS UNIQUE;
CREATE CONSTRAINT series_name_unique    IF NOT EXISTS FOR (s:Series) REQUIRE s.name IS UNIQUE;
CREATE CONSTRAINT tag_name_unique       IF NOT EXISTS FOR (t:Tag) REQUIRE t.name IS UNIQUE;
CREATE CONSTRAINT category_id_unique    IF NOT EXISTS FOR (c:Category) REQUIRE c.categoryId IS UNIQUE;

// ── Additional property indexes ───────────────────────────────────────────────
CREATE INDEX book_title_index  IF NOT EXISTS FOR (b:Book) ON (b.title);
CREATE INDEX book_active_index IF NOT EXISTS FOR (b:Book) ON (b.is_active);
CREATE INDEX book_status_index IF NOT EXISTS FOR (b:Book) ON (b.status);
