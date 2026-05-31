import type { Claim } from "../claim.js";
import type { Component, Flow } from "../schema.js";

export interface EmbeddingStatus {
  checked_claims: number;
  created: number;
  reused: number;
}

export interface ClaimSignals {
  semantic_score: number;
  semantic_rank: number | null;
  bm25_score: number;
  bm25_rank: number | null;
  exact_score: number;
  exact_rank: number | null;
}

export interface ClaimContextResult {
  rank: number;
  score: number;
  signals: ClaimSignals;
  object: Claim;
  about: Array<{ type: "component" | "flow"; id: string }>;
}

export interface DerivedComponentContext {
  object: Component;
  score: number;
  matched_claim_ids: string[];
}

export interface DerivedFlowContext {
  object: Flow;
  score: number;
  matched_claim_ids: string[];
}

export interface GraphContextResult {
  query: string;
  search_config_version: string;
  embedding_status: EmbeddingStatus;
  claims: ClaimContextResult[];
  components: DerivedComponentContext[];
  flows: DerivedFlowContext[];
}
