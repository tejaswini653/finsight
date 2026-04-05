import { fetchFiling } from "./fetcher";
import { chunkBySection } from "./chunker";
import { embedAndStore } from "./embedder";

// This is the script you run once to ingest a company's filings.
// Usage: npx tsx src/ingestion/run.ts

async function ingest(ticker: string) {
  console.log(`\nStarting ingestion for ${ticker}`);
  console.log("=".repeat(40));

  // Step 1 — fetch the 10-K from SEC EDGAR
  const filing = await fetchFiling(ticker);
  console.log(`Company: ${filing.companyName}`);
  console.log(`Filed: ${filing.filedDate}`);
  console.log(`Text length: ${(filing.text.length / 1000).toFixed(0)}k chars`);

  // Step 2 — chunk the document
  const chunks = chunkBySection(filing.text, {
    chunkSize: 500,
    overlap: 50,
  });
  console.log(`Created ${chunks.length} chunks`);

  // Step 3 — embed and store in Pinecone
  await embedAndStore(chunks, {
    ticker: filing.ticker,
    source: `${filing.filingType} ${filing.filedDate}`,
  });

  console.log(`\nIngestion complete for ${ticker}`);
}

// Ingest multiple companies
async function main() {
  const tickers = ["AAPL", "AXP"]; // Apple + American Express

  for (const ticker of tickers) {
    await ingest(ticker);
    // Small delay between companies to respect rate limits
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("\nAll ingestion complete. Ready to query.");
}

main().catch(console.error);
