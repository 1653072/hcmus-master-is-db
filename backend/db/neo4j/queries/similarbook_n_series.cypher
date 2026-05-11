// Recommend books for one source book.
// Priority:
// 1. Up to $seriesLimit active books in the same series, nearest by IN_SERIES.sequence_no.
// 2. Fill the remaining slots with weighted similarity:
//    0.50 * category overlap + 0.33 * author overlap + 0.17 * publisher overlap.
//
// Optimization: instead of scanning ALL Book nodes, we traverse outward from
// source along BELONGS_TO / WRITTEN_BY / PUBLISHED_BY edges, then back to
// candidate books — only books that actually share at least one attribute with
// source are ever visited.

MATCH (source:Book {mongo_id: $mongoID, is_active: true})

// ── PART 1: Series candidates ─────────────────────────────────────────────────
CALL {
  WITH source
  MATCH (source)-[sourceSeriesRel:IN_SERIES]->(:Series)<-[candidateSeriesRel:IN_SERIES]-(seriesBook:Book {is_active: true})
  WHERE seriesBook.mongo_id <> source.mongo_id
    AND sourceSeriesRel.sequence_no IS NOT NULL
    AND candidateSeriesRel.sequence_no IS NOT NULL
  WITH
    seriesBook,
    abs(candidateSeriesRel.sequence_no - sourceSeriesRel.sequence_no) AS sequenceDistance,
    CASE WHEN candidateSeriesRel.sequence_no > sourceSeriesRel.sequence_no THEN 0 ELSE 1 END AS forwardPriority,
    candidateSeriesRel.sequence_no AS candidateSequenceNo
  ORDER BY sequenceDistance ASC, forwardPriority ASC, candidateSequenceNo ASC, seriesBook.title ASC
  LIMIT $seriesLimit
  RETURN collect({
    book: seriesBook,
    score: 100.0 - toFloat(sequenceDistance),
    priority: 0
  }) AS seriesCandidates
}

WITH
  source,
  seriesCandidates,
  [item IN seriesCandidates | item.book.mongo_id] AS seriesCandidateIDs,
  ($limit - size(seriesCandidates)) AS remainingLimit

// ── PART 2: Similarity candidates (traverse, not full scan) ──────────────────
CALL {
  WITH source, seriesCandidateIDs, remainingLimit

  // Traverse outward from source along the 3 attribute edges, then back to
  // candidate books. Only books sharing at least one attribute are visited —
  // no full Book scan.
  MATCH (source)-[:BELONGS_TO|WRITTEN_BY|PUBLISHED_BY]->(shared)<-[:BELONGS_TO|WRITTEN_BY|PUBLISHED_BY]-(sim:Book {is_active: true})
  WHERE sim.mongo_id <> source.mongo_id
    AND NOT sim.mongo_id IN seriesCandidateIDs
    AND remainingLimit > 0

  // Deduplicate before scoring (a book may be reached via multiple attributes)
  WITH DISTINCT source, sim, remainingLimit

  // Score each attribute independently
  CALL {
    WITH source, sim
    OPTIONAL MATCH (source)-[:BELONGS_TO]->(cat:Category)<-[:BELONGS_TO]-(sim)
    RETURN count(DISTINCT cat) * 0.50 AS categoryScore
  }
  CALL {
    WITH source, sim
    OPTIONAL MATCH (source)-[:WRITTEN_BY]->(author:Author)<-[:WRITTEN_BY]-(sim)
    RETURN count(DISTINCT author) * 0.33 AS authorScore
  }
  CALL {
    WITH source, sim
    OPTIONAL MATCH (source)-[:PUBLISHED_BY]->(publisher:Publisher)<-[:PUBLISHED_BY]-(sim)
    RETURN count(DISTINCT publisher) * 0.17 AS publisherScore
  }

  WITH sim, categoryScore + authorScore + publisherScore AS totalScore, remainingLimit
  WHERE totalScore > 0
  ORDER BY totalScore DESC, sim.title ASC, sim.mongo_id ASC
  WITH collect({
    book: sim,
    score: totalScore,
    priority: 1
  }) AS allSimilarCandidates, remainingLimit
  RETURN allSimilarCandidates[0..remainingLimit] AS similarCandidates
}

// ── FINAL: Merge, unwind, return ──────────────────────────────────────────────
WITH seriesCandidates + similarCandidates AS candidates
UNWIND candidates AS item
WITH item.book AS book, item.score AS score, item.priority AS priority
RETURN
  book.mongo_id AS mongo_id,
  book.title    AS title,
  score         AS score
ORDER BY priority ASC, score DESC, title ASC, mongo_id ASC
LIMIT $limit
