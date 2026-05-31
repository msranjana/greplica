import type { GraphReadResult } from "../service.js";
import type { Claim } from "../claim.js";

export interface ClaimContextDocument {
  claim: Claim;
  text: string;
  about: Array<{ type: "component" | "flow"; id: string }>;
}

export function buildClaimContextDocuments(graph: GraphReadResult): ClaimContextDocument[] {
  const components = new Map(graph.components.map((component) => [component.id, component]));
  const flows = new Map(graph.flows.map((flow) => [flow.id, flow]));
  const aboutByClaim = new Map<string, Array<{ type: "component" | "flow"; id: string }>>();

  for (const edge of graph.edges) {
    if (edge.kind !== "about" || edge.from_type !== "claim") continue;
    if (edge.to_type !== "component" && edge.to_type !== "flow") continue;
    const existing = aboutByClaim.get(edge.from_id) ?? [];
    existing.push({ type: edge.to_type, id: edge.to_id });
    aboutByClaim.set(edge.from_id, existing);
  }

  return graph.claims.map((claim) => {
    const about = aboutByClaim.get(claim.id) ?? [];
    return {
      claim,
      about,
      text: [
        `claim id: ${claim.id}`,
        `kind: ${claim.kind}`,
        `truth: ${claim.truth}`,
        `intent: ${claim.intent}`,
        `text: ${claim.text}`,
        ...about.flatMap((target) => {
          if (target.type === "component") {
            const component = components.get(target.id);
            return [
              `about component id: ${target.id}`,
              component ? `about component name: ${component.name}` : "",
              component?.code_anchor ? `about component code anchor: ${component.code_anchor}` : "",
            ];
          }
          const flow = flows.get(target.id);
          return [
            `about flow id: ${target.id}`,
            flow ? `about flow name: ${flow.name}` : "",
          ];
        }),
      ]
        .filter((part) => part.length > 0)
        .join("\n"),
    };
  });
}
