import { readFile } from "node:fs/promises";
import { getKey, toKeygenErrorBody } from "./keygen.js";

export const defaultModel = "gpt-6-luna";
export const friendlyAiError = "I couldn’t reach the AI right now.";

function errorBody(message, fix) {
  return { error: { message, fix } };
}

function extractText(data) {
  if (typeof data?.output_text === "string") return data.output_text.trim();
  return (data?.output || [])
    .flatMap((item) => item.content || [])
    .map((part) => part.text || "")
    .join(" ")
    .trim();
}

export async function createRecommendation(body, {
  model = defaultModel,
  briefPath,
  errorMessage = friendlyAiError,
}) {
  const neighborhood = typeof body?.neighborhood === "string" ? body.neighborhood.trim() : "";
  const food = typeof body?.food === "string" ? body.food.trim() : "";
  if (!neighborhood || !food) {
    return {
      status: 400,
      body: errorBody("Add a neighborhood and what you want to eat first.", "Fill in both fields, then try again."),
    };
  }

  let brief;
  try {
    brief = await readFile(briefPath, "utf8");
  } catch {
    return {
      status: 500,
      body: errorBody(
        "LocalLens is missing BRIEF.md, so its safety instructions cannot be loaded.",
        "Restore BRIEF.md, then restart or redeploy LocalLens.",
      ),
    };
  }

  const restaurants = Array.isArray(body.restaurants) ? body.restaurants.slice(0, 6) : [];
  const isLivePlaces = Boolean(body.source && body.source !== "Demo sample data");
  const sourceName = body.source || "local demo";
  const userMessage = [
    `When it answers, use the user's request and the clearly labeled ${sourceName} evidence below.`,
    isLivePlaces
      ? `${sourceName} data was fetched at ${body.fetchedAt || "an unknown time"}. Use only the fields provided. If crowd, wait time, hours, or reviews are missing, say that information is unavailable and never invent it.`
      : "The demo restaurant data is made up for this student prototype, not live data. Never present it as real-time or verified.",
    `Return 3–5 short sentences in plain language. Start with the best fit, then the available crowd/opening information and vibe, then 1–2 reasons. Mention whether the information is live place data or demo data.`,
    `User request: neighborhood=${neighborhood}; food=${food}; restaurant=${body.restaurant || "not specified"}; budget=${body.budget || "not specified"}; group size=${body.groupSize || "not specified"}.`,
    `Local demo evidence: ${JSON.stringify(restaurants)}`,
  ].join("\n");

  async function askOpenAi(apiKey) {
    return fetch("https://api.openai.com/v1/responses", {
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
  }

  try {
    let apiKey = await getKey();
    let openAiResponse = await askOpenAi(apiKey);

    // Refresh once for a stale or invalid key. This bounded retry cannot loop.
    if (openAiResponse.status === 401 || openAiResponse.status === 403) {
      apiKey = await getKey({ forceRefresh: true });
      openAiResponse = await askOpenAi(apiKey);
    }

    if (!openAiResponse.ok) {
      return {
        status: 502,
        body: errorBody(errorMessage, "Check the MindDo key service and OpenAI access, then try again."),
      };
    }

    const data = await openAiResponse.json();
    const answer = extractText(data);
    if (!answer) {
      return {
        status: 502,
        body: errorBody(errorMessage, "The AI returned no answer. Try the request again once."),
      };
    }
    return { status: 200, body: { answer, model } };
  } catch (error) {
    if (error?.name === "KeygenError") {
      return { status: error.status || 503, body: toKeygenErrorBody(error) };
    }
    return {
      status: 502,
      body: errorBody(errorMessage, "Check the MindDo key service and your internet connection, then try again."),
    };
  }
}
