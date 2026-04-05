import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import routes from "./api/routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve the frontend demo
app.use(express.static(path.join(process.cwd(), "frontend")));

// API routes
app.use("/api", routes);

// Serve frontend for all non-API routes
app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "frontend", "index.html"));
});

app.listen(PORT, () => {
  console.log(`FinSight running on http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/health`);
});

export default app;
