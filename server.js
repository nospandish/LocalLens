import http from "node:http";
import { readFile, readFileSync, stat } from "node:fs";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRecommendation, defaultModel } from "./src/openai.js";

const readFileAsync = promisify(readFile);
const statAsync = promisify(stat);
const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, "public");
const port = Number(process.env.PORT || 3000);

function loadDotEnv() {
  try {
    const contents = readFileSync(path.join(here, ".env"), "utf8");
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

loadDotEnv();

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function contentType(filePath) {
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
  }[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

async function serveStatic(response, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(publicDir, `.${requested}`);
  if (!filePath.startsWith(publicDir + path.sep)) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }
  try {
    const fileStats = await statAsync(filePath);
    if (!fileStats.isFile()) throw new Error("Not a file");
    const file = await readFileAsync(filePath);
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

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (request.method === "POST" && url.pathname === "/api/recommendations") {
    let body;
    try {
      body = await readJson(request);
    } catch {
      sendJson(response, 400, { error: "Please try that request again." });
      return;
    }
    const result = await createRecommendation(body, {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || defaultModel,
      briefPath: path.join(here, "BRIEF.md"),
      errorMessage: "I couldn’t reach the AI. Add OPENAI_API_KEY to your local .env file, then restart with node server.js.",
    });
    sendJson(response, result.status, result.body);
    return;
  }
  if (request.method === "GET") {
    await serveStatic(response, url.pathname);
    return;
  }
  sendJson(response, 405, { error: "Method not allowed" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`LocalLens is running at http://localhost:${port}`);
});
