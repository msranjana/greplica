import type { GraphContextConfig } from "./config.js";
import type { ScoreEntry } from "./bm25.js";
import type { ContextDocument } from "./documents.js";
import type { ContextSignals } from "./types.js";

export interface SemanticScoreEntry extends ScoreEntry {}

export interface RankedContextDocument {
  document: ContextDocument;
  score: number;
  signals: ContextSignals;
}

export function rankContextDocuments(
  documents: ContextDocument[],
  semantic: SemanticScoreEntry[],
  bm25: ScoreEntry[],
  exact: ScoreEntry[],
  config: GraphContextConfig,
): RankedContextDocument[] {
  const semanticById = indexScores(semantic);
  const bm25ById = indexScores(bm25);
  const exactById = indexScores(exact);

  const ranked = documents
    .map((document) => {
      const semanticScore = semanticById.get(document.key);
      const bm25Score = bm25ById.get(document.key);
      const exactScore = exactById.get(document.key);
      const semanticValue = semanticScore?.score ?? 0;

      if (semanticValue < config.ranking.semanticThreshold) return undefined;

      const weighted =
        semanticValue * config.ranking.weights.semantic +
        (bm25Score?.score ?? 0) * config.ranking.weights.bm25 +
        (exactScore?.score ?? 0) * config.ranking.weights.exact;
      const divisor =
        config.ranking.weights.semantic +
        config.ranking.weights.bm25 +
        config.ranking.weights.exact;

      return {
        document,
        score: weighted / divisor,
        signals: {
          semantic_score: semanticValue,
          semantic_rank: semanticScore?.rank ?? null,
          bm25_score: bm25Score?.score ?? 0,
          bm25_rank: bm25Score?.rank ?? null,
          exact_score: exactScore?.score ?? 0,
          exact_rank: exactScore?.rank ?? null,
          graph_score: 0,
          graph_sources: [] as ContextSignals["graph_sources"],
        },
      };
    })
    .filter((candidate): candidate is RankedContextDocument => candidate !== undefined)
    .sort((a, b) => b.score - a.score || a.document.key.localeCompare(b.document.key));

  const maxScore = ranked[0]?.score ?? 1;
  return ranked.map((candidate) => ({
    ...candidate,
    score: maxScore === 0 ? 0 : candidate.score / maxScore,
  }));
}

export function selectRankedDocuments(
  ranked: RankedContextDocument[],
  config: GraphContextConfig,
  options: { minimumSelected?: number } = {},
): RankedContextDocument[] {
  return ranked.filter(
    (document, index) =>
      index < (options.minimumSelected ?? 0) ||
      document.score >= config.ranking.selectionThreshold,
  );
}

export function roundScore(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function indexScores(scores: ScoreEntry[]): Map<string, ScoreEntry> {
  return new Map(scores.map((score) => [score.id, score]));
}
