import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Every query, every agent step, every tool call gets logged here.
// This is what "auditability" means in a regulated environment.
// If something goes wrong, you can trace exactly what happened and why.

export interface AuditEntry {
  id: string;
  timestamp: string;
  type: "query" | "tool_call" | "agent_step" | "ingestion" | "error";
  input: unknown;
  output: unknown;
  metadata: {
    model?: string;
    tokensUsed?: number;
    latencyMs?: number;
    confidence?: number;
    sources?: string[];
    error?: string;
  };
}

const LOG_DIR = path.join(process.cwd(), "evals", "results");

// Make sure the log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function createAuditEntry(
  type: AuditEntry["type"],
  input: unknown,
  output: unknown,
  metadata: AuditEntry["metadata"] = {}
): AuditEntry {
  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    type,
    input,
    output,
    metadata,
  };
}

export function logEntry(entry: AuditEntry): void {
  const date = new Date().toISOString().split("T")[0]; // e.g. 2024-01-15
  const logFile = path.join(LOG_DIR, `audit-${date}.jsonl`);

  // JSONL format — one JSON object per line
  // Easy to query, easy to read, easy to stream
  const line = JSON.stringify(entry) + "\n";
  fs.appendFileSync(logFile, line, "utf8");
}

export function log(
  type: AuditEntry["type"],
  input: unknown,
  output: unknown,
  metadata: AuditEntry["metadata"] = {}
): AuditEntry {
  const entry = createAuditEntry(type, input, output, metadata);
  logEntry(entry);
  return entry;
}

export function getLogPath(): string {
  const date = new Date().toISOString().split("T")[0];
  return path.join(LOG_DIR, `audit-${date}.jsonl`);
}