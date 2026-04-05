import { RetrievedChunk } from "../retrieval/retriever";

export interface GuardrailResult {
  safe: boolean;
  reason?: string;
  confidence: "high" | "medium" | "low" | "none";
}

// Checks whether we have enough reliable context to answer
// This is the "correctness and safety" feature Amex cares about
export function checkGuardrails(
  query: string,
  chunks: RetrievedChunk[]
): GuardrailResult {
  // No chunks at all — nothing relevant in the database
  if (chunks.length === 0) {
    return {
      safe: false,
      reason: "No relevant information found in the ingested documents for this query.",
      confidence: "none",
    };
  }

  // Top chunk score too low — retrieval found something but it's weak
  const topScore = chunks[0].score;
  if (topScore < 0.5) {
    return {
      safe: false,
      reason: `Retrieved context has low relevance (score: ${topScore.toFixed(2)}). Cannot answer reliably.`,
      confidence: "low",
    };
  }

  // Query asks for something outside our document scope
  const outOfScopePatterns = [
    /current stock price/i,
    /today'?s? price/i,
    /real.?time/i,
    /right now/i,
    /latest news/i,
    /breaking/i,
  ];

  for (const pattern of outOfScopePatterns) {
    if (pattern.test(query)) {
      return {
        safe: false,
        reason: "This query requires real-time data not available in SEC filings.",
        confidence: "none",
      };
    }
  }

  // Good confidence
  if (topScore >= 0.75) {
    return { safe: true, confidence: "high" };
  }

  // Medium confidence — answer but flag it
  return { safe: true, confidence: "medium" };
}
