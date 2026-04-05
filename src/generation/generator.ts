import { chat } from "../llm/provider";
import { retrieve, formatChunksForPrompt } from "../retrieval/retriever";
import { checkGuardrails } from "./guardrails";
import { log } from "../audit/logger";

export interface GenerationResult {
  answer: string;
  confidence: "high" | "medium" | "low" | "none";
  sources: Array<{ ticker: string; source: string; score: number }>;
  auditId: string;
  latencyMs: number;
  safe: boolean;
}

export async function generateAnswer(
  query: string,
  options: { ticker?: string } = {}
): Promise<GenerationResult> {
  const startTime = Date.now();

  // Step 1 — retrieve relevant chunks
  const chunks = await retrieve(query, {
    topK: 6,
    ticker: options.ticker,
    minScore: 0.2,
  });

  // Step 2 — run guardrails
  const guardrail = checkGuardrails(query, chunks);

  if (!guardrail.safe) {
    const auditEntry = log(
      "query",
      { query, ticker: options.ticker },
      { blocked: true, reason: guardrail.reason },
      { confidence: 0, latencyMs: Date.now() - startTime }
    );

    return {
      answer: `I cannot reliably answer this question. ${guardrail.reason}`,
      confidence: guardrail.confidence,
      sources: [],
      auditId: auditEntry.id,
      latencyMs: Date.now() - startTime,
      safe: false,
    };
  }

  // Step 3 — build prompt with retrieved context
  const context = formatChunksForPrompt(chunks);

  const systemPrompt = `You are FinSight, a financial document analysis assistant.
You answer questions based ONLY on the provided SEC filing excerpts.
You NEVER make up information or use knowledge outside the provided context.
You ALWAYS cite which source you are drawing from using [Source N] notation.
If the context does not contain enough information to answer confidently, say so clearly.
Be precise and factual. This is financial information that people may rely on.`;

  const userPrompt = `Context from SEC filings:
${context}

Question: ${query}

Instructions:
- Answer based only on the context above
- Cite sources using [Source N] notation
- If information is incomplete, say so
- Be concise and factual`;

  // Step 4 — generate answer
  const answer = await chat(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.1, maxTokens: 1000 }
  );

  const latencyMs = Date.now() - startTime;

  // Step 5 — audit log the full interaction
  const auditEntry = log(
    "query",
    { query, ticker: options.ticker },
    { answer, chunkCount: chunks.length },
    {
      confidence: chunks[0]?.score,
      latencyMs,
      sources: chunks.map((c) => c.source),
    }
  );

  const sources = chunks.map((c) => ({
    ticker: c.ticker,
    source: c.source,
    score: c.score,
  }));

  return {
    answer,
    confidence: guardrail.confidence,
    sources,
    auditId: auditEntry.id,
    latencyMs,
    safe: true,
  };
}
