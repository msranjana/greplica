import type { MemoryCommitProposal } from "./proposal.js";
import { validateProposal, type ProposalValidationResult } from "./validate-proposal.js";
import type { Claim } from "./claim.js";
import type { Edge } from "./edge.js";
import type { Component, Flow, Source } from "./schema.js";
import { defaultDatabasePath, openDatabase } from "../storage/sqlite/db.js";
import type { SqliteRepository } from "../storage/sqlite/repository.js";
import { SqliteRepository as SqliteKnowledgeGraphRepository } from "../storage/sqlite/repository.js";

export interface RepoRef {
  remote_url: string;
  repo_name: string;
  default_branch: string;
}

export interface InitRepoResult {
  repo_id: string;
  main_scope_id: string;
  working_scope_id: string;
  database_path: string;
  created: boolean;
}

export interface GraphReadResult {
  components: Component[];
  flows: Flow[];
  claims: Claim[];
  sources: Source[];
  edges: Edge[];
}

export interface GraphSearchResult {
  type: string;
  id: string;
  label: string;
  text: string;
}

export interface ApplyProposalResult {
  memory_commit_id: string;
  scope_id: string;
  created: {
    components: number;
    flows: number;
    claims: number;
    sources: number;
    edges: number;
  };
}

export class KnowledgeGraphService {
  constructor(private readonly repository: SqliteRepository) {}

  initRepo(input: RepoRef): InitRepoResult {
    const { repo, created } = this.repository.upsertRepo(input);
    const main = this.repository.ensureScope({
      repo_id: repo.id,
      kind: "main",
      name: input.default_branch,
      ref: input.default_branch,
    });
    const working = this.repository.ensureScope({
      repo_id: repo.id,
      kind: "working",
      name: "working",
      parent_scope_id: main.id,
      ref: "working",
    });

    return {
      repo_id: repo.id,
      main_scope_id: main.id,
      working_scope_id: working.id,
      database_path: defaultDatabasePath(),
      created,
    };
  }

  readGraph(input: RepoRef): GraphReadResult {
    const repo = this.repository.requireRepo(input.remote_url);
    return this.repository.readGraphView(repo.id);
  }

  searchGraph(input: RepoRef, query: string): GraphSearchResult[] {
    const repo = this.repository.requireRepo(input.remote_url);
    return this.repository.searchGraphView(repo.id, query);
  }

  validateProposal(input: RepoRef, proposal: unknown): ProposalValidationResult {
    this.ensureInitialized(input);
    return validateProposal(proposal, this.repository);
  }

  applyProposal(input: RepoRef, proposal: MemoryCommitProposal): ApplyProposalResult {
    const validation = this.validateProposal(input, proposal);
    if (!validation.valid) {
      throw new Error(`Proposal is invalid:\n${validation.errors.map((error) => `- ${error}`).join("\n")}`);
    }

    const repo = this.repository.requireRepo(input.remote_url);
    const working = this.repository.requireWorkingScope(repo.id);
    const memoryCommit = this.repository.createMemoryCommit({
      scope_id: working.id,
      title: proposal.title,
      summary: proposal.summary,
    });

    this.repository.createProposalRecords(working.id, memoryCommit.id, proposal);

    return {
      memory_commit_id: memoryCommit.id,
      scope_id: working.id,
      created: {
        components: proposal.creates.components?.length ?? 0,
        flows: proposal.creates.flows?.length ?? 0,
        claims: proposal.creates.claims?.length ?? 0,
        sources: proposal.creates.sources?.length ?? 0,
        edges: proposal.creates.edges?.length ?? 0,
      },
    };
  }

  private ensureInitialized(input: RepoRef): void {
    this.repository.requireRepo(input.remote_url);
  }
}

export function createLocalKnowledgeGraphService(): KnowledgeGraphService {
  return new KnowledgeGraphService(new SqliteKnowledgeGraphRepository(openDatabase()));
}
