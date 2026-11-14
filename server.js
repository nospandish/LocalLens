import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, "public");
const briefPath = path.join(here, "BRIEF.md");
const port = Number(process.env.PORT || 3000);
const defaultModel = "gpt-6-luna";

function loadDotEnv() {
  const envPath = path.join(here, ".env");
  try {
    const contents = requireText(envPath);
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const equals = line.indexOf("=");
      if (equals < 1) continue;
      const key = line.slice(0, equals).trim();
      let value = line.slice(equals + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // A missing .env is handled with a friendly message when the AI is used.
  }
}

function requireText(filePath) {
  // This tiny synchronous read keeps startup simple and avoids another dependency.
  return readFileSync(filePath, "utf8");
}

loadDotEnv();

function sendJson(response, status, body) {
  const text = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(text);
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
  }[extension] || "application/octet-stream";
}

async function serveStatic(request, response, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(publicDir, `.${requested}`);
  if (!filePath.startsWith(publicDir + path.sep)) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }
  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) throw new Error("Not a file");
    const file = await readFile(filePath);
    response.writeHead(200, { "Content-Type": contentType(filePath), "Cache-Control": "no-store" });
    response.end(file);
  } catch {
    sendJson(response, 404, { error: "Not found" });
  }
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 100_000) throw new Error("Request is too large");
  }
  return JSON.parse(body || "{}");
}

function extractText(data) {
  if (typeof data?.output_text === "string") return data.output_text.trim();
  return (data?.output || [])
    .flatMap((item) => item.content || [])
    .map((part) => part.text || "")
    .join(" ")
    .trim();
}

const friendlyAiError = "I couldn’t reach the AI right now. Please check the OpenAI key in .env and try again.";

async function getRecommendation(request, response) {
  let body;
  try {
    body = await readJson(request);
  } catch {
    sendJson(response, 400, { error: "Please try that request again." });
    return;
  }

  const neighborhood = typeof body.neighborhood === "string" ? body.neighborhood.trim() : "";
  const food = typeof body.food === "string" ? body.food.trim() : "";
  if (!neighborhood || !food) {
    sendJson(response, 400, { error: "Add a neighborhood and what you want to eat first." });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  if (!apiKey) {
    sendJson(response, 503, { error: friendlyAiError });
    return;
  }

  let brief;
  try {
    brief = await readFile(briefPath, "utf8");
  } catch {
    sendJson(response, 500, { error: "LocalLens is missing BRIEF.md, so its safety instructions cannot be loaded." });
    return;
  }

  const restaurants = Array.isArray(body.restaurants) ? body.restaurants.slice(0, 6) : [];
  const userMessage = [
    "When it answers, use the user's request and the clearly labeled local demo evidence below.",
    "The demo restaurant data is made up for this student prototype, not live data. Never present it as real-time or verified.",
    "Return 3–5 short sentences in plain language. Start with the best fit, then estimated demo crowd and vibe, then 1–2 reasons. Mention that the crowd/vibe information is demo data.",
    `User request: neighborhood=${neighborhood}; food=${food}; restaurant=${body.restaurant || "not specified"}; budget=${body.budget || "not specified"}; group size=${body.groupSize || "not specified"}.`,
    `Local demo evidence: ${JSON.stringify(restaurants)}`,
  ].join("\n");

  try {
    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || defaultModel,
        instructions: brief,
        input: userMessage,
      }),
    });

    if (!openAiResponse.ok) {
      console.error(`OpenAI request returned HTTP ${openAiResponse.status}`);
      sendJson(response, 502, { error: friendlyAiError });
      return;
    }

    const data = await openAiResponse.json();
    const answer = extractText(data);
    if (!answer) {
      sendJson(response, 502, { error: friendlyAiError });
      return;
    }
    sendJson(response, 200, { answer, model: process.env.OPENAI_MODEL || defaultModel });
  } catch (error) {
    console.error(`OpenAI request failed: ${error.name || "network error"}`);
    sendJson(response, 502, { error: friendlyAiError });
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (request.method === "POST" && url.pathname === "/api/recommendations") {
    await getRecommendation(request, response);
    return;
  }
  if (request.method === "GET") {
    await serveStatic(request, response, url.pathname);
    return;
  }
  sendJson(response, 405, { error: "Method not allowed" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`LocalLens is running at http://localhost:${port}`);
});
