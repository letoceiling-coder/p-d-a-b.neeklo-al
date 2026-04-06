/** Два последовательных вызова AI (извлечение + проверка JSON). */
const AI_TIMEOUT_MS = 20_000;

/**
 * @param {string} message
 * @param {string} assistantId
 * @returns {Promise<unknown>}
 */
async function callAI(message, assistantId) {
  const rawUrl = process.env.AI_API_URL || "";
  const base = rawUrl.replace(/\/+$/, "");

  if (!process.env.AI_API_KEY) {
    throw new Error("AI_API_KEY is required");
  }
  if (!base) {
    throw new Error("AI_API_URL is required");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const res = await fetch(`${base}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": process.env.AI_API_KEY
      },
      body: JSON.stringify({
        assistantId,
        message
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI gateway HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    console.log("AI RESPONSE:", data);
    return data;
  } catch (err) {
    console.error("AI ERROR:", err);
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = { callAI, AI_TIMEOUT_MS };
