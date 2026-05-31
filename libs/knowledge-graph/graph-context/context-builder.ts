import type { GraphReadResult } from "../service.js";
import type { SqliteRepository } from "../../storage/sqlite/repository.js";
import { graphContextConfig, type GraphContextConfig } from "./config.js";
import { buildClaimContextDocuments, type ClaimContextDocument } from "./claim-text.js";
import { OpenAIEmbedder } from "./openai-embedder.js";
import { float32ArrayToBuffer, bufferToFloat32Array, cosineSimilarity } from "./vector.js";
import { scoreBm25 } from "./bm25.js";
import { scoreExact } from "./exact.js";
import { rankClaims, selectClaims, type SemanticScoreEntry } from "./rank.js";
import { deriveComponents, deriveFlows } from "./derive.js";
import type { EmbeddingStatus, GraphContextResult } from "./types.js";

export interface BuildGraphContextOptions {
  warnOnCreatedEmbeddings?: boolean;
  config?: GraphContextConfig;
}

interface ExistingEmbedding {
  claimId: string;
  vector: Float32Array;
}

export class GraphContextBuilder {
  constructor(private readonly repository: SqliteRepository) {}

  async build(repoId: string, graph: GraphReadResult, query: string, options: BuildGraphContextOptions = {}): Promise<GraphContextResult> {
    const config = options.config ?? graphContextConfig;
    const documents = buildClaimContextDocuments(graph);
    const embedder = new OpenAIEmbedder(config.embedding);
    const embeddingStatus = await this.ensureClaimEmbeddings(repoId, documents, embedder, config);
    if (options.warnOnCreatedEmbeddings && embeddingStatus.created > 0) {
      console.warn(`graph context created ${embeddingStatus.created} missing claim embedding(s); proposal apply should normally pre-create them.`);
    }

    const queryEmbedding = await embedder.embed(query);
    const semantic = this.scoreSemantic(repoId, queryEmbedding, config);
    const bm25 = scoreBm25(query, documents, config);
    const exact = scoreExact(query, documents);
    const rankedClaims = rankClaims(documents, semantic, bm25, exact, config);
    const selectedClaims = selectClaims(rankedClaims, config);

    return {
      query,
      search_config_version: config.version,
      embedding_status: embeddingStatus,
      claims: selectedClaims,
      components: deriveComponents(graph, selectedClaims),
      flows: deriveFlows(graph, selectedClaims),
    };
  }

  async ensureForGraph(repoId: string, graph: GraphReadResult, config: GraphContextConfig = graphContextConfig): Promise<EmbeddingStatus> {
    const documents = buildClaimContextDocuments(graph);
    const embedder = new OpenAIEmbedder(config.embedding);
    return this.ensureClaimEmbeddings(repoId, documents, embedder, config);
  }

  private async ensureClaimEmbeddings(
    repoId: string,
    documents: ClaimContextDocument[],
    embedder: OpenAIEmbedder,
    config: GraphContextConfig,
  ): Promise<EmbeddingStatus> {
    const existing = new Set(
      this.repository
        .listClaimEmbeddings({
          repo_id: repoId,
          provider: config.embedding.provider,
          model: config.embedding.model,
          dimensions: config.embedding.dimensions,
        })
        .map((record) => record.claim_id),
    );
    const missing = documents.filter((document) => !existing.has(document.claim.id));
    const vectors = await embedder.embedBatch(missing.map((document) => document.text));

    this.repository.insertClaimEmbeddings(
      missing.map((document, index) => ({
        repo_id: repoId,
        claim_id: document.claim.id,
        provider: config.embedding.provider,
        model: config.embedding.model,
        dimensions: config.embedding.dimensions,
        embedding: float32ArrayToBuffer(vectors[index] ?? []),
      })),
    );

    return {
      checked_claims: documents.length,
      created: missing.length,
      reused: documents.length - missing.length,
    };
  }

  private scoreSemantic(repoId: string, queryEmbedding: number[], config: GraphContextConfig): SemanticScoreEntry[] {
    const embeddings = this.loadEmbeddings(repoId, config);
    const scored = embeddings
      .map((embedding) => ({
        id: embedding.claimId,
        score: cosineSimilarity(queryEmbedding, embedding.vector),
      }))
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    const maxScore = scored[0]?.score ?? 1;

    return scored.map((entry, index) => ({
      id: entry.id,
      score: maxScore === 0 ? 0 : entry.score / maxScore,
      rank: index + 1,
    }));
  }

  private loadEmbeddings(repoId: string, config: GraphContextConfig): ExistingEmbedding[] {
    return this.repository
      .listClaimEmbeddings({
        repo_id: repoId,
        provider: config.embedding.provider,
        model: config.embedding.model,
        dimensions: config.embedding.dimensions,
      })
      .map((record) => ({
        claimId: record.claim_id,
        vector: bufferToFloat32Array(record.embedding),
      }));
  }
}
