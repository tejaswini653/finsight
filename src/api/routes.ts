import { Router, Request, Response } from "express";
import { generateAnswer } from "../generation/generator";
import { getIndexStats } from "../llm/pinecone";
import { fetchFiling } from "../ingestion/fetcher";
import { chunkBySection } from "../ingestion/chunker";
import { embedAndStore } from "../ingestion/embedder";
import { log } from "../audit/logger";
import fs from "fs";
import path from "path";

const router = Router();

// ── Health check ───────────────────────────────────────────────────────────
router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Query — main RAG endpoint ──────────────────────────────────────────────
router.post("/query", async (req: Request, res: Response) => {
  try {
    const { question, ticker } = req.body;

    if (!question || typeof question !== "string") {
      res.status(400).json({ error: "question is required" });
      return;
    }

    const result = await generateAnswer(question, { ticker });
    res.json(result);
  } catch (err: any) {
    console.error("Query error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Query with streaming ───────────────────────────────────────────────────
router.post("/query/stream", async (req: Request, res: Response) => {
  try {
    const { question, ticker } = req.body;

    if (!question) {
      res.status(400).json({ error: "question is required" });
      return;
    }

    // Set up Server-Sent Events
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // For now use the regular generator and stream the result
    // In a full implementation you would use OpenAI's streaming API
    res.write("data: " + JSON.stringify({ type: "start" }) + "\n\n");

    const result = await generateAnswer(question, { ticker });

    // Stream the answer word by word for demo effect
    const words = result.answer.split(" ");
    for (const word of words) {
      res.write("data: " + JSON.stringify({ type: "token", content: word + " " }) + "\n\n");
      await new Promise((r) => setTimeout(r, 30));
    }

    res.write("data: " + JSON.stringify({
      type: "done",
      confidence: result.confidence,
      sources: result.sources,
      auditId: result.auditId,
      latencyMs: result.latencyMs,
    }) + "\n\n");

    res.end();
  } catch (err: any) {
    res.write("data: " + JSON.stringify({ type: "error", message: err.message }) + "\n\n");
    res.end();
  }
});

// ── Ingest a company ───────────────────────────────────────────────────────
router.post("/ingest", async (req: Request, res: Response) => {
  try {
    const { ticker } = req.body;
    if (!ticker) {
      res.status(400).json({ error: "ticker is required" });
      return;
    }

    const filing = await fetchFiling(ticker.toUpperCase());
    const chunks = chunkBySection(filing.text, { chunkSize: 500, overlap: 50 });
    await embedAndStore(chunks, {
      ticker: filing.ticker,
      source: `${filing.filingType} ${filing.filedDate}`,
    });

    res.json({
      success: true,
      ticker: filing.ticker,
      company: filing.companyName,
      chunks: chunks.length,
      filedDate: filing.filedDate,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── List ingested documents ────────────────────────────────────────────────
router.get("/documents", async (_req: Request, res: Response) => {
  try {
    const stats = await getIndexStats();
    res.json({
      totalVectors: stats.totalRecordCount ?? 0,
      namespaces: stats.namespaces ?? {},
      dimension: stats.dimension,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get audit log ──────────────────────────────────────────────────────────
router.get("/audit", (_req: Request, res: Response) => {
  try {
    const date = new Date().toISOString().split("T")[0];
    const logFile = path.join(process.cwd(), "evals", "results", `audit-${date}.jsonl`);

    if (!fs.existsSync(logFile)) {
      res.json({ entries: [] });
      return;
    }

    const lines = fs.readFileSync(logFile, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));

    res.json({ entries: lines.slice(-50) }); // last 50 entries
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
