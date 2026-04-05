import { embed } from "./llm/provider";
import { searchVectors } from "./llm/pinecone";

async function test() {
  console.log("Embedding query...");
  const vector = await embed("What were the main risk factors?");
  console.log("Vector length:", vector.length);

  console.log("Searching Pinecone without filter...");
  const results = await searchVectors(vector, { topK: 5 });
  console.log("Results:", results.length);

  if (results.length > 0) {
    console.log("Top score:", results[0].score);
    console.log("Top text:", results[0].text.slice(0, 150));
    console.log("Ticker:", results[0].ticker);
  } else {
    console.log("ZERO results returned from Pinecone");
  }
}

test().catch(console.error);
