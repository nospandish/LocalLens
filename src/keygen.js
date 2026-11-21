let cachedKey = null;
let cachedExpiresAt = 0;

export class KeygenError extends Error {
  constructor(message, fix, status = 503) {
    super(message);
    this.name = "KeygenError";
    this.fix = fix;
    this.status = status;
  }
}

function lookupUrl() {
  const baseUrl = process.env.KEYGEN_URL?.trim();
  if (!baseUrl || baseUrl === "paste-here") {
    throw new KeygenError(
      "The AI key service is not configured.",
      "Add your KEYGEN_URL and KEYGEN_TOKEN to the server's .env file, then restart LocalLens.",
    );
  }
  return `${baseUrl.replace(/\/+$/, "")}/api/lookup-key`;
}

export async function getKey({ forceRefresh = false } = {}) {
  if (!forceRefresh && cachedKey && Date.now() < cachedExpiresAt) return cachedKey;

  const token = process.env.KEYGEN_TOKEN?.trim();
  if (!token || token === "paste-here") {
    throw new KeygenError(
      "The AI key service is not configured.",
      "Add your KEYGEN_URL and KEYGEN_TOKEN to the server's .env file, then restart LocalLens.",
    );
  }

  const url = lookupUrl();
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new KeygenError(
      "The AI key service could not be reached.",
      "Check KEYGEN_URL and your internet connection, then try again.",
    );
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    // The response below becomes the safe, structured error shown to the app.
  }

  if (!response.ok || typeof data.apiKey !== "string" || !data.apiKey || !data.expiresAt) {
    const message = data?.error?.message || "The AI key service did not return a usable key.";
    const fix = data?.error?.fix || "Check the MindDo key service settings, then try again.";
    throw new KeygenError(message, fix, response.status >= 400 ? response.status : 503);
  }

  const expiresAt = Date.parse(data.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new KeygenError(
      "The AI key service returned an expired key.",
      "Check the MindDo key service response and try again.",
    );
  }

  cachedKey = data.apiKey;
  cachedExpiresAt = expiresAt;
  return cachedKey;
}

export function toKeygenErrorBody(error) {
  if (error instanceof KeygenError) {
    return { error: { message: error.message, fix: error.fix } };
  }
  return {
    error: {
      message: "The AI key service could not complete the request.",
      fix: "Check the MindDo key service and try again.",
    },
  };
}
