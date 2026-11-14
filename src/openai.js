import { readFile } from "node:fs/promises";

export const defaultModel = "gpt-6-luna";
export const friendlyAiError = "I couldn’t reach the AI right now. Please check the OpenAI key in .env and try again.";

function extractText(data) {
  if (typeof data?.output_text === "string") return data.output_text.trim();
  return (data?.output || [])
    .flatMap((item) => item.content || [])
    .map((part) => part.text || "")
    .join(" ")
    .trim();
}

export async function createRecommendation(body, { apiKey, model = defaultModel, briefPath }) {
  const neighborhood = typeof body?.neighborhood === "string" ? body.neighborhood.trim() : "";
  const food = typeof body?.food === "string" ? body.food.trim() : "";
  if (!neighborhood || !food) {
    return { status: 400, body: { error: "Add a neighborhood and what you want to eat first." } };
  }

  if (!apiKey) {
    return { status: 503, body: { error: friendlyAiError } };
  }

  let brief;
  try {
    brief = await readFile(briefPath, "utf8");
  } catch {
    return { status: 500, body: { error: "LocalLens is missing BRIEF.md, so its safety instructions cannot be loaded." } };
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
        model,
        instructions: brief,
        input: userMessage,
      }),
    });

    if (!openAiResponse.ok) {
      return { status: 502, body: { error: friendlyAiError } };
    }

    const data = await openAiResponse.json();
    const answer = extractText(data);
    if (!answer) return { status: 502, body: { error: friendlyAiError } };
    return { status: 200, body: { answer, model } };
  } catch {
    return { status: 502, body: { error: friendlyAiError } };
  }
}
