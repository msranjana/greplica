import type { Claim } from "./claim.js";
import type { Edge } from "./edge.js";
import type { Component, Flow, Source } from "./schema.js";

export interface MemoryCommitProposal {
  title: string;
  summary?: string;
  creates: {
    components?: Component[];
    flows?: Flow[];
    claims?: Claim[];
    sources?: Source[];
    edges?: Edge[];
  };
}

export type ProposalSubject =
  | { type: "component"; id: string }
  | { type: "flow"; id: string }
  | { type: "claim"; id: string }
  | { type: "edge"; id: string }
  | { type: "source"; id: string };
