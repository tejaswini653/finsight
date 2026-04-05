import { embedBatch } from "../llm/provider";
import { upsertVectors } from "../llm/pinecone";
import { log } from "../audit/logger";
import { Chunk } from "./chunker";
import { v4 as uuidv4 } from "uuid";

export interface EmbedAndStoreOptions {
  ticker: string;
  source: string;
}

export async function embedAndStore(
  chunks: Chunk[],
  options: EmbedAndStoreOptions
): Promise<void> {
  const startTime = Date.now();

  const validChunks = chunks.filter((c) => c.text.trim().length > 20);
  console.log(`Embedding ${validChunks.length} valid chunks for ${options.ticker}...`);

  const batchSize = 20;

  for (let i = 0; i < validChunks.length; i += batchSize) {
    const batch = validChunks.slice(i, i + batchSize);
    if (batch.length === 0) continue;

    const texts = batch.map((c) => c.text);
    const vectors = await embedBatch(texts);

    if (!vectors || vectors.length === 0) {
      console.warn("embedBatch returned empty vectors for batch at index", i);
      continue;
    }

    const pineconeVectors = batch.map((chunk, j) => ({
      id: uuidv4(),
      values: vectors[j],
      metadata: {
        text: chunk.text,
        ticker: options.ticker,
        source: options.source,
        chunkIndex: chunk.chunkIndex,
      },
    }));

    if (pineconeVectors.length === 0) {
      console.warn("pineconeVectors is empty at batch index", i);
      continue;
    }

    await upsertVectors(pineconeVectors);

    console.log(
      `Progress: ${Math.min(i + batchSize, validChunks.length)}/${validChunks.length} chunks embedded`
    );
  }

  const latencyMs = Date.now() - startTime;

  log(
    "ingestion",
    { ticker: options.ticker, source: options.source, chunkCount: validChunks.length },
    { status: "success" },
    { latencyMs }
  );

  console.log(`Done. ${validChunks.length} chunks stored for ${options.ticker} in ${latencyMs}ms`);
}
