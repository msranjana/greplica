export const graphContextConfig = {
  version: "graph-context-v3-graph-boost",
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
      bm25: 0.075,
      exact: 0,
    },
    bm25: {
      k1: 1.5,
      b: 0.75,
    },
    claimSupport: {
      weight: 1,
      countBoost: 0.03,
    },
    directObject: {
      weight: 0.85,
    },
    graphBoost: {
      containsParentToChild: 0.85,
      containsChildToParent: 0.85,
      aboutClaimToObject: 0,
      aboutObjectToClaim: 0,
      touchesFlowToComponent: 0,
      touchesComponentToFlow: 0,
      maxSources: 3,
    },
  },
} as const;

export type GraphContextConfig = typeof graphContextConfig;
