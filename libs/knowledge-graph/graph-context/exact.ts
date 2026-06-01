import type { ScoreEntry } from "./bm25.js";
import type { ContextDocument } from "./documents.js";

export function scoreExact(query: string, documents: ContextDocument[]): ScoreEntry[] {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length === 0) return [];

  const queryTerms = normalizedQuery.split(/\s+/).filter((term) => term.length > 1);
  const scored = documents
    .map((document) => {
      const text = normalize(document.text);
      const id = normalize(document.id);
      let score = 0;

      if (id === normalizedQuery) score += 4;
      else if (id.includes(normalizedQuery) || normalizedQuery.includes(id)) score += 2;
      if (text.includes(normalizedQuery)) score += 3;

      for (const term of queryTerms) {
        if (term.includes(".") || term.includes("/") || term.includes("_") || term.length >= 8) {
          if (text.includes(term)) score += 1;
        }
      }

      return { id: document.key, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  const maxScore = scored[0]?.score ?? 1;
  return scored.map((entry, index) => ({
    id: entry.id,
    score: entry.score / maxScore,
    rank: index + 1,
  }));
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}
