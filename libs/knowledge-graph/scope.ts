import type { GraphScopeId, MembershipSubjectType, MemoryCommitId } from "./schema.js";

export type GraphScopeKind = "main" | "working" | "branch" | "session" | "source";

export interface GraphScope {
  id: GraphScopeId;
  kind: GraphScopeKind;
  name: string;
  parent_scope_id?: GraphScopeId;
  ref?: string;
  created_at: string;
}

export interface GraphMembership {
  scope_id: GraphScopeId;
  subject_type: MembershipSubjectType;
  subject_id: string;
  memory_commit_id: MemoryCommitId;
}
