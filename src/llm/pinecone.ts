import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

dotenv.config();

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const INDEX_NAME = process.env.PINECONE_INDEX_NAME ?? "finsight-docs";
const INDEX_HOST = process.env.PINECONE_INDEX_HOST;

export function getIndex() {
  // Use host directly if available — more reliable on free tier
  if (INDEX_HOST) {
    return pinecone.index(INDEX_NAME, INDEX_HOST);
  }
  return pinecone.index(INDEX_NAME);
}

export async function upsertVectors(
  vectors: {
    id: string;
    values: number[];
    metadata: {
      text: string;
      ticker: string;
      source: string;
      chunkIndex: number;
    };
  }[]
): Promise<void> {
  const pineconeIndex = getIndex();
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    if (batch.length === 0) continue;
    await pineconeIndex.upsert(batch);
    console.log("Stored vectors " + (i + 1) + " to " + (i + batch.length));
  }
}

export async function searchVectors(
  queryVector: number[],
  options: { topK?: number; ticker?: string } = {}
): Promise<Array<{
  id: string;
  score: number;
  text: string;
  ticker: string;
  source: string;
  chunkIndex: number;
}>> {
  const pineconeIndex = getIndex();

  console.log("Querying Pinecone — topK:", options.topK ?? 5, "ticker filter:", options.ticker);

  const results = await pineconeIndex.query({
    vector: queryVector,
    topK: options.topK ?? 5,
    includeMetadata: true,
    filter: undefined,
  });

  console.log("Raw Pinecone results:", results.matches?.length ?? 0, "matches");

  return (results.matches ?? []).map((match) => ({
    id: match.id,
    score: match.score ?? 0,
    text: String(match.metadata?.text ?? ""),
    ticker: String(match.metadata?.ticker ?? ""),
    source: String(match.metadata?.source ?? ""),
    chunkIndex: Number(match.metadata?.chunkIndex ?? 0),
  }));
}

export async function deleteByTicker(ticker: string): Promise<void> {
  const pineconeIndex = getIndex();
  await pineconeIndex.deleteMany({ ticker });
  console.log("Deleted all vectors for " + ticker);
}

export async function getIndexStats() {
  const pineconeIndex = getIndex();
  return await pineconeIndex.describeIndexStats();
}
