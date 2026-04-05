import { embed } from "../llm/provider";
import { searchVectors } from "../llm/pinecone";
import { log } from "../audit/logger";

export interface RetrievedChunk {
  id: string;
  text: string;
  ticker: string;
  source: string;
  score: number;
  chunkIndex: number;
}

export interface RetrievalOptions {
  topK?: number;
  ticker?: string;
  minScore?: number; // chunks below this score are filtered out
}

export async function retrieve(
  query: string,
  options: RetrievalOptions = {}
): Promise<RetrievedChunk[]> {
  const startTime = Date.now();
  const minScore = options.minScore ?? 0.2;

  // Step 1 — embed the user's question into a vector
  const queryVector = await embed(query);

  // Step 2 — search Pinecone for the most similar chunks
  const results = await searchVectors(queryVector, {
    topK: options.topK ?? 8,
    ticker: options.ticker,
  });

  // Step 3 — filter out low confidence results
  // If a chunk scores below minScore it's probably irrelevant
  const filtered = results.filter((r) => r.score >= minScore);

  const latencyMs = Date.now() - startTime;

  // Step 4 — audit log every retrieval
  log(
    "tool_call",
    { query, ticker: options.ticker, topK: options.topK },
    { chunkCount: filtered.length, topScore: filtered[0]?.score },
    { latencyMs }
  );

  console.log(
    `Retrieved ${filtered.length} chunks for "${query}" in ${latencyMs}ms`
  );
  if (filtered.length > 0) {
    console.log(`Top score: ${filtered[0].score.toFixed(3)}`);
  }

  return filtered;
}

// Formats retrieved chunks into a context string for the LLM prompt
// Each chunk is labeled with its source so the LLM can cite it
export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No relevant information found in the documents.";
  }

  return chunks
    .map(
      (chunk, i) =>
        `[Source ${i + 1}: ${chunk.ticker} ${chunk.source}]\n${chunk.text}`
    )
    .join("\n\n---\n\n");
}

// Returns true if retrieval confidence is high enough to trust the answer
export function isHighConfidence(chunks: RetrievedChunk[]): boolean {
  if (chunks.length === 0) return false;
  // High confidence = top chunk scores above 0.75
  return chunks[0].score >= 0.75;
}
