import { fetchFiling } from "./fetcher";

async function test() {
  console.log("Testing SEC EDGAR fetcher...");
  const filing = await fetchFiling("AAPL");
  console.log("Company:", filing.companyName);
  console.log("Filed:", filing.filedDate);
  console.log("Text length:", (filing.text.length / 1000).toFixed(0) + "k chars");
  console.log("First 300 chars:", filing.text.slice(0, 300));
}

test().catch(console.error);
