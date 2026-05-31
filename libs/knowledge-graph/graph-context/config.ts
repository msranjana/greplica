export const graphContextConfig = {
  version: "claim-context-v1",
  embedding: {
    provider: "openai",
    model: "text-embedding-3-small",
    dimensions: 1536,
    batchSize: 100,
  },
  ranking: {
    semanticThreshold: 0.1,
    selectionThreshold: 0.72,
    minimumSelectedClaims: 3,
    weights: {
      semantic: 1,
      bm25: 0.45,
      exact: 0.25,
    },
    bm25: {
      k1: 1.5,
      b: 0.75,
    },
  },
} as const;

export type GraphContextConfig = typeof graphContextConfig;
