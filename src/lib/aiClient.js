/** Два последовательных вызова AI (извлечение + проверка JSON). */
const { safeJsonParse } = require("./safeJsonParse");

const AI_TIMEOUT_MS = 20_000;

/**
 * Текст ответа модели из тела gateway (без циклического require ollama).
 * @param {unknown} data
 * @returns {string}
 */
function gatewayMessageText(data) {
  try {
    if (data == null) return "";
    if (typeof data === "string") return data;
    if (typeof data.reply === "string") return data.reply;
    if (typeof data.message === "string") return data.message;
    if (typeof data.content === "string") return data.content;
    if (typeof data.response === "string") return data.response;
    if (data.data != null && typeof data.data.content === "string") {
      return data.data.content;
    }
    const choice = data.choices?.[0]?.message?.content;
    if (typeof choice === "string") return choice;
    if (data.data != null && typeof data.data.message === "string") {
      return data.data.message;
    }
    if (typeof data.text === "string") return data.text;
    return "";
  } catch {
    return "";
  }
}

/**
 * @param {string} message
 * @param {string} assistantId
 * @param {{
 *   temperature?: number;
 *   max_tokens?: number;
 *   stop?: string[];
 * }} [aiOptions] — опции генерации (передаются в gateway только если заданы)
 * @returns {Promise<unknown>}
 */
async function callAI(message, assistantId, aiOptions = {}) {
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

  const body = /** @type {Record<string, unknown>} */ ({
    assistantId,
    message
  });
  const opt = aiOptions || {};
  if (opt.temperature !== undefined) body.temperature = opt.temperature;
  if (opt.max_tokens !== undefined) body.max_tokens = opt.max_tokens;
  if (opt.stop !== undefined) body.stop = opt.stop;

  try {
    const res = await fetch(`${base}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": process.env.AI_API_KEY
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const rawBody = await res.text();

    if (!res.ok) {
      console.log("RAW AI RESPONSE (HTTP error body):", rawBody);
      throw new Error(`AI gateway HTTP ${res.status}: ${rawBody}`);
    }

    const data = safeJsonParse(rawBody);
    if (data === null) {
      console.log("RAW AI RESPONSE:", rawBody);
      console.log("PARSED RESULT:", null);
      return { reply: rawBody };
    }

    console.log("RAW AI RESPONSE:", gatewayMessageText(data));
    console.log("PARSED RESULT:", data);
    return data;
  } catch (err) {
    console.error("AI ERROR:", err);
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = { callAI, AI_TIMEOUT_MS };
