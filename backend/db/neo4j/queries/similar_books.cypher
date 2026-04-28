// Similarity scoring: 0.5 * category overlap + 0.33 * author overlap + 0.17 * publisher overlap
MATCH (source:Book {mongo_id: $mongoID, is_active: true})

OPTIONAL MATCH (source)-[:BELONGS_TO]->(cat:Category)<-[:BELONGS_TO]-(sim:Book {is_active: true})
  WHERE sim.mongo_id <> $mongoID
WITH source, sim, COUNT(cat) * 0.5 AS categoryScore

OPTIONAL MATCH (source)-[:WRITTEN_BY]->(a:Author)<-[:WRITTEN_BY]-(sim)
WITH source, sim, categoryScore, COUNT(a) * 0.33 AS authorScore

OPTIONAL MATCH (source)-[:PUBLISHED_BY]->(p:Publisher)<-[:PUBLISHED_BY]-(sim)
WITH sim, categoryScore + authorScore + COUNT(p) * 0.17 AS totalScore

WHERE sim IS NOT NULL AND totalScore > 0
RETURN sim.mongo_id AS mongo_id,
       sim.title    AS title,
       totalScore   AS score
ORDER BY score DESC
LIMIT $limit
