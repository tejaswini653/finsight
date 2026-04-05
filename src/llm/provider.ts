import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

// This is the single place in the entire project that knows about OpenAI.
// Every other file imports from here — never from openai directly.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ── LLM — for generating answers ──────────────────────────────────────────

export async function chat(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: options?.model ?? "gpt-4o",
    temperature: options?.temperature ?? 0.2,
    max_tokens: options?.maxTokens ?? 1500,
    messages,
  });

  return response.choices[0].message.content ?? "";
}

// ── Embeddings — for converting text into vectors ─────────────────────────

export async function embed(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: text,
    dimensions: 1536, 
  });

  return response.data[0].embedding;
}

// ── Batch embed — for embedding many chunks at once during ingestion ───────

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: texts,
    dimensions: 1536, 
  });

  return response.data.map((d) => d.embedding);
}