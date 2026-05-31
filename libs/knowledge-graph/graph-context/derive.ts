import type { GraphReadResult } from "../service.js";
import type { ClaimContextResult, DerivedComponentContext, DerivedFlowContext } from "./types.js";

export function deriveComponents(graph: GraphReadResult, claims: ClaimContextResult[]): DerivedComponentContext[] {
  const byId = new Map(graph.components.map((component) => [component.id, component]));
  const matches = collectMatches(claims, "component");

  return [...matches.entries()]
    .map(([id, matchedClaims]) => {
      const object = byId.get(id);
      if (!object) return undefined;
      return {
        object,
        score: maxClaimScore(claims, matchedClaims),
        matched_claim_ids: matchedClaims,
      };
    })
    .filter((component): component is DerivedComponentContext => component !== undefined)
    .sort(compareDerived);
}

export function deriveFlows(graph: GraphReadResult, claims: ClaimContextResult[]): DerivedFlowContext[] {
  const byId = new Map(graph.flows.map((flow) => [flow.id, flow]));
  const matches = collectMatches(claims, "flow");

  return [...matches.entries()]
    .map(([id, matchedClaims]) => {
      const object = byId.get(id);
      if (!object) return undefined;
      return {
        object,
        score: maxClaimScore(claims, matchedClaims),
        matched_claim_ids: matchedClaims,
      };
    })
    .filter((flow): flow is DerivedFlowContext => flow !== undefined)
    .sort(compareDerived);
}

function collectMatches(claims: ClaimContextResult[], type: "component" | "flow"): Map<string, string[]> {
  const matches = new Map<string, string[]>();
  for (const claim of claims) {
    for (const target of claim.about) {
      if (target.type !== type) continue;
      const existing = matches.get(target.id) ?? [];
      existing.push(claim.object.id);
      matches.set(target.id, existing);
    }
  }
  return matches;
}

function maxClaimScore(claims: ClaimContextResult[], matchedClaimIds: string[]): number {
  const ids = new Set(matchedClaimIds);
  return Math.max(0, ...claims.filter((claim) => ids.has(claim.object.id)).map((claim) => claim.score));
}

function compareDerived(
  a: { object: { id: string }; score: number; matched_claim_ids: string[] },
  b: { object: { id: string }; score: number; matched_claim_ids: string[] },
): number {
  return (
    b.score - a.score ||
    b.matched_claim_ids.length - a.matched_claim_ids.length ||
    a.object.id.localeCompare(b.object.id)
  );
}
