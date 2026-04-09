# FinSight — Financial Document Intelligence

> Ask natural language questions about real SEC 10-K filings. Get grounded, cited answers in under 5 seconds.

**Live demo:** https://finsight-e3n7.onrender.com

## What it does

FinSight is a production-grade RAG (Retrieval-Augmented Generation) system that ingests real SEC EDGAR filings and answers questions with full source citations, confidence scoring, and audit logging.

Built to demonstrate senior AI engineering patterns — not just "does it answer" but correctness, auditability, and failure recovery. The same patterns regulated industries like fintech actually require.

## Demo

Ask "What were Apple's main risk factors in 2025?" and get a cited, grounded answer streamed back in real time — sourced directly from the actual 10-K filing, with a full audit trail.

## Architecture
User question
↓
Embed question → OpenAI text-embedding-3-large (1536 dims)
↓
Semantic search → Pinecone vector database
↓
Guardrail check → confidence scoring, out-of-scope detection
↓
Generate answer → GPT-4o with citation prompt
↓
Audit log → JSONL file with full trace
↓
Stream response → Server-Sent Events to frontend

## Features

- **Semantic search** — finds relevant sections by meaning not keywords
- **Hallucination guardrails** — refuses to answer when retrieval confidence is low
- **Full audit trail** — every query logged with ID, sources, latency, and confidence
- **Streaming responses** — answers stream token by token via SSE
- **Financial domain** — Apple, Microsoft, American Express, Tesla 10-K filings
- **Production patterns** — provider abstraction, error handling, cost controls

## Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript / Node.js |
| LLM | OpenAI GPT-4o |
| Embeddings | OpenAI text-embedding-3-large |
| Vector DB | Pinecone |
| Backend | Express.js |
| Data source | SEC EDGAR public API (free) |
| Deploy | Render |

## Quick start

```bash
# Clone and install
git clone https://github.com/t53/finsight.git
cd finsight
npm install

# Set up environment
cp .env.example .env
# Add your OPENAI_API_KEY and PINECONE_API_KEY to .env

# Ingest a company's 10-K filing
npm run ingest

# Start the server
npm run dev

# Open http://localhost:3000
```

## Environment variables
OPENAI_API_KEY        # OpenAI API key
PINECONE_API_KEY      # Pinecone API key
PINECONE_ENVIRONMENT  # e.g. us-east-1
PINECONE_INDEX_NAME   # e.g. finsight-docs
PINECONE_INDEX_HOST   # from Pinecone dashboard
PORT                  # default 3000

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/query` | RAG query — returns answer + citations |
| POST | `/api/query/stream` | Streaming query via SSE |
| POST | `/api/ingest` | Ingest a company 10-K by ticker |
| GET | `/api/documents` | List ingested documents |
| GET | `/api/audit` | Recent audit log entries |

## Example

```bash
curl -X POST https://finsight-e3n7.onrender.com/api/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What were Apple main risk factors in 2025?", "ticker": "AAPL"}'
```

Response:
```json
{
  "answer": "Apple's main risk factors in 2025 included supply chain concentration, foreign exchange exposure, and increasing competition [Source 1, Source 3]...",
  "confidence": "medium",
  "sources": [{ "ticker": "AAPL", "source": "10-K 2025-10-31", "score": 0.73 }],
  "auditId": "c3ce27b0-ff79-4812-ae87-3c742ccdd3d8",
  "latencyMs": 2341
}
```

## Supported tickers

AAPL · MSFT · AXP · TSLA · GOOGL · AMZN · META · NVDA · JPM · BAC

## Why auditability matters

In financial services, every AI decision must be traceable. FinSight logs every query as a JSONL audit entry — input, output, confidence score, sources, latency, and model version. If something goes wrong, you can reconstruct exactly what the AI said and why.