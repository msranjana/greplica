import type { GraphScopeId, MemoryCommitId } from "./schema.js";

export interface MemoryCommit {
  id: MemoryCommitId;
  scope_id: GraphScopeId;
  parent_memory_commit_id?: MemoryCommitId;
  git_commit_sha?: string;
  title: string;
  summary?: string;
  created_at: string;
}
