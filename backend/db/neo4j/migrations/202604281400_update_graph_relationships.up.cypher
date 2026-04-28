// ── V2 node constraints ──────────────────────────────────────────────────────
CREATE CONSTRAINT user_id_unique     IF NOT EXISTS FOR (u:User)     REQUIRE u.userId     IS UNIQUE;
CREATE CONSTRAINT tag_id_unique      IF NOT EXISTS FOR (t:Tag)      REQUIRE t.tagId      IS UNIQUE;
CREATE CONSTRAINT category_id_unique IF NOT EXISTS FOR (c:Category) REQUIRE c.categoryId IS UNIQUE;

// Additional index for filtering active books quickly
CREATE INDEX book_status_idx IF NOT EXISTS FOR (b:Book) ON (b.status);

// ── New relationship types (documentation; existing data may use old names) ──
// (Book)-[:WRITTEN_BY]->(Author)
// (Book)-[:BELONGS_TO]->(Category)
// (Book)-[:PUBLISHED_BY]->(Publisher)
// (Book)-[:HAS_TAG]->(Tag)
// (Book)-[:IN_SERIES {sequenceNo}]->(Series)
// (User)-[:VIEWED {viewedAt}]->(Book)
// (User)-[:PURCHASED {purchasedAt, orderId, quantity}]->(Book)
// (Book)-[:SIMILAR_TO {score, computedAt}]->(Book)
