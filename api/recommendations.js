import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRecommendation, defaultModel } from "../src/openai.js";

const here = path.dirname(fileURLToPath(import.meta.url));

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body;
  try {
    body = request.body || {};
  } catch {
    response.status(400).json({ error: "Please try that request again." });
    return;
  }

  const result = await createRecommendation(body, {
    model: process.env.OPENAI_MODEL || defaultModel,
    briefPath: path.join(here, "..", "BRIEF.md"),
    errorMessage: "I couldn’t reach the AI right now.",
  });
  if (result.body?.error?.fix) console.error(`LocalLens fix: ${result.body.error.fix}`);
  response.status(result.status).json(result.body);
}
