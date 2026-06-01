import type { Claim } from "../claim.js";
import type { GraphReadResult } from "../service.js";
import type { Component, Flow } from "../schema.js";

export type ContextDocumentType = "claim" | "component" | "flow";

export type ContextDocumentObject = Claim | Component | Flow;

export interface ContextDocument {
  key: string;
  type: ContextDocumentType;
  id: string;
  text: string;
  object: ContextDocumentObject;
  about: Array<{ type: "component" | "flow"; id: string }>;
}

export function buildClaimDocuments(graph: GraphReadResult): ContextDocument[] {
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

  return graph.claims.map((claim) => ({
    key: contextDocumentKey("claim", claim.id),
    type: "claim",
    id: claim.id,
    object: claim,
    about: aboutByClaim.get(claim.id) ?? [],
    text: claimText(claim, aboutByClaim.get(claim.id) ?? [], components, flows),
  }));
}

export function buildComponentDocuments(graph: GraphReadResult): ContextDocument[] {
  return graph.components.map((component) => ({
    key: contextDocumentKey("component", component.id),
    type: "component",
    id: component.id,
    object: component,
    about: [],
    text: [
      `component id: ${component.id}`,
      `component name: ${component.name}`,
      component.code_anchor ? `component code anchor: ${component.code_anchor}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  }));
}

export function buildFlowDocuments(graph: GraphReadResult): ContextDocument[] {
  return graph.flows.map((flow) => ({
    key: contextDocumentKey("flow", flow.id),
    type: "flow",
    id: flow.id,
    object: flow,
    about: [],
    text: [
      `flow id: ${flow.id}`,
      `flow name: ${flow.name}`,
    ].join("\n"),
  }));
}

export function contextDocumentKey(type: ContextDocumentType, id: string): string {
  return `${type}:${id}`;
}

function claimText(
  claim: Claim,
  about: Array<{ type: "component" | "flow"; id: string }>,
  components: Map<string, Component>,
  flows: Map<string, Flow>,
): string {
  return [
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
    .join("\n");
}
