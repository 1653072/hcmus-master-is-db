MATCH (b:Book {is_active: true})-[r:IN_SERIES]->(s:Series {name: $seriesName})
RETURN b.mongo_id     AS mongo_id,
       b.title        AS title,
       r.sequence_no  AS volume_order
ORDER BY r.sequence_no ASC
