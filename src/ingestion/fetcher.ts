import axios from "axios";

const UA = "FinSight Research Tool admin@finsight.dev";

const TICKER_TO_CIK: Record<string, string> = {
  AAPL: "320193",
  MSFT: "789019",
  TSLA: "1318605",
  GOOGL: "1652044",
  AMZN: "1018724",
  META: "1326801",
  NVDA: "1045810",
  JPM: "19617",
  BAC: "70858",
  AXP: "4846",
};

export interface FilingResult {
  ticker: string;
  companyName: string;
  filingType: string;
  filedDate: string;
  text: string;
}

export async function fetchFiling(
  ticker: string,
  filingType: string = "10-K"
): Promise<FilingResult> {
  const cik = TICKER_TO_CIK[ticker.toUpperCase()];
  if (!cik) {
    throw new Error(
      `Ticker ${ticker} not supported. Available: ${Object.keys(TICKER_TO_CIK).join(", ")}`
    );
  }

  const paddedCik = cik.padStart(10, "0");
  console.log(`Fetching ${filingType} for ${ticker}...`);

  // Step 1 — get filing history
  const submissionsRes = await axios.get(
    `https://data.sec.gov/submissions/CIK${paddedCik}.json`,
    { headers: { "User-Agent": UA } }
  );
  const submissions = submissionsRes.data;
  const companyName: string = submissions.name;
  const filings = submissions.filings.recent;

  // Step 2 — find most recent filing
  const idx: number = filings.form.findIndex((f: string) => f === filingType);
  if (idx === -1) throw new Error(`No ${filingType} found for ${ticker}`);

  const accessionDashes: string = filings.accessionNumber[idx];
  const accessionClean = accessionDashes.replace(/-/g, "");
  const filedDate: string = filings.filingDate[idx];
  const primaryDoc: string = filings.primaryDocument[idx];

  console.log(`Found ${filingType} filed on ${filedDate}`);

  // Step 3 — download the primary document
  const docUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/${primaryDoc}`;
  console.log(`Downloading: ${docUrl}`);

  const docRes = await axios.get(docUrl, {
    headers: { "User-Agent": UA },
    responseType: "text",
    timeout: 120000,
  });

  console.log(`Raw size: ${(docRes.data.length / 1000).toFixed(0)}k chars`);

  // Step 4 — extract readable text from iXBRL HTML
  const text = extractReadableText(docRes.data);

  console.log(`Extracted: ${(text.length / 1000).toFixed(0)}k chars`);
  console.log(`Sample: ${text.slice(0, 300)}`);

  return { ticker: ticker.toUpperCase(), companyName, filingType, filedDate, text };
}

function extractReadableText(html: string): string {
    let text = html;
  
    // Remove script and style blocks entirely
    text = text.replace(/<script[\s\S]*?<\/script>/gi, " ");
    text = text.replace(/<style[\s\S]*?<\/style>/gi, " ");
  
    // Strip iXBRL wrapper tags but keep their inner text
    text = text.replace(/<\/?ix:[^>]*>/gi, "");
    text = text.replace(/<\/?xbrli:[^>]*>/gi, "");
  
    // Strip all remaining HTML tags
    text = text.replace(/<[^>]+>/g, " ");
  
    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, " ")
      .replace(/&#160;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#[0-9]+;/g, " ")
      .replace(/&[a-z]+;/gi, " ");
  
    // Collapse whitespace
    text = text.replace(/\s+/g, " ").trim();
  
    // Skip past the XBRL metadata blob at the top
    // Real readable content starts after the last URL-heavy section
    // Strategy: find "UNITED STATES" or "SECURITIES AND EXCHANGE" which
    // always appears near the top of every SEC filing
    const markers = [
      "UNITED STATES",
      "SECURITIES AND EXCHANGE COMMISSION",
      "Washington, D.C.",
      "Annual Report",
      "ANNUAL REPORT",
    ];
  
    let startPos = 0;
    for (const marker of markers) {
      const pos = text.indexOf(marker);
      if (pos > 0 && pos < 50000) {
        startPos = pos;
        console.log(`Found readable content start at position ${pos} using marker: "${marker}"`);
        break;
      }
    }
  
    text = text.slice(startPos);
  
    // Cap at 500k chars
    if (text.length > 500000) {
      console.log(`Trimming from ${(text.length / 1000).toFixed(0)}k to 500k chars`);
      text = text.slice(0, 500000);
    }
  
    return text;
  }
