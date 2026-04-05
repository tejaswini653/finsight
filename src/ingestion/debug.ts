import axios from "axios";

async function debug() {
  const res = await axios.get(
    "https://www.sec.gov/Archives/edgar/data/320193/000032019325000079/aapl-20250927.htm",
    {
      headers: { "User-Agent": "FinSight Research Tool admin@finsight.dev" },
      responseType: "text",
      timeout: 60000,
    }
  );

  const html: string = res.data;
  console.log("Total length:", html.length);
  console.log("Has <ix: tags:", html.includes("<ix:"));
  console.log("Has <body:", html.includes("<body"));
  console.log("Has newlines:", html.includes("\n"));
  console.log("First 500 chars of raw HTML:\n", html.slice(0, 500));
  console.log("\nMiddle 500 chars:\n", html.slice(Math.floor(html.length / 2), Math.floor(html.length / 2) + 500));
}

debug().catch(console.error);
