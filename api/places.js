import { searchRestaurants } from "../src/places.js";

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
  const result = await searchRestaurants(body, {
    apiKey: process.env.GOOGLE_PLACES_API_KEY,
    provider: process.env.PLACES_PROVIDER || "openstreetmap",
    errorMessage: "I couldn’t find real restaurant data right now. Try again in a moment.",
  });
  response.status(result.status).json(result.body);
}
