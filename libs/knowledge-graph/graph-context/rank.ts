import type { Claim } from "../claim.js";
import type { GraphContextConfig } from "./config.js";
import type { ScoreEntry } from "./bm25.js";
import type { ClaimContextResult, ClaimSignals } from "./types.js";
import type { ClaimContextDocument } from "./claim-text.js";

export interface SemanticScoreEntry extends ScoreEntry {}

export interface RankedClaim {
  claim: Claim;
  score: number;
  signals: ClaimSignals;
  about: Array<{ type: "component" | "flow"; id: string }>;
}

export function rankClaims(
  documents: ClaimContextDocument[],
  semantic: SemanticScoreEntry[],
  bm25: ScoreEntry[],
  exact: ScoreEntry[],
  config: GraphContextConfig,
): RankedClaim[] {
  const semanticById = indexScores(semantic);
  const bm25ById = indexScores(bm25);
  const exactById = indexScores(exact);

  const ranked = documents
    .map((document) => {
      const semanticScore = semanticById.get(document.claim.id);
      const bm25Score = bm25ById.get(document.claim.id);
      const exactScore = exactById.get(document.claim.id);
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
        claim: document.claim,
        about: document.about,
        score: weighted / divisor,
        signals: {
          semantic_score: semanticValue,
          semantic_rank: semanticScore?.rank ?? null,
          bm25_score: bm25Score?.score ?? 0,
          bm25_rank: bm25Score?.rank ?? null,
          exact_score: exactScore?.score ?? 0,
          exact_rank: exactScore?.rank ?? null,
        },
      };
    })
    .filter((candidate): candidate is RankedClaim => candidate !== undefined)
    .sort((a, b) => b.score - a.score || a.claim.id.localeCompare(b.claim.id));

  const maxScore = ranked[0]?.score ?? 1;
  return ranked.map((candidate) => ({
    ...candidate,
    score: candidate.score / maxScore,
  }));
}

export function selectClaims(ranked: RankedClaim[], config: GraphContextConfig): ClaimContextResult[] {
  return ranked
    .filter(
      (claim, index) =>
        index < config.ranking.minimumSelectedClaims ||
        claim.score >= config.ranking.selectionThreshold,
    )
    .map((claim, index) => ({
      rank: index + 1,
      score: round(claim.score),
      signals: {
        semantic_score: round(claim.signals.semantic_score),
        semantic_rank: claim.signals.semantic_rank,
        bm25_score: round(claim.signals.bm25_score),
        bm25_rank: claim.signals.bm25_rank,
        exact_score: round(claim.signals.exact_score),
        exact_rank: claim.signals.exact_rank,
      },
      object: claim.claim,
      about: claim.about,
    }));
}

function indexScores(scores: ScoreEntry[]): Map<string, ScoreEntry> {
  return new Map(scores.map((score) => [score.id, score]));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
