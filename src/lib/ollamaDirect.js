"use strict";

const OLLAMA_URL =
  process.env.OLLAMA_URL || "http://188.124.55.89:11434/api/chat";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 45_000);

/**
 * Прямой вызов Ollama (GPU) без внешних ассистентов.
 * @param {Array<{ role: string, content: string }>} messages
 * @param {Record<string, unknown>} [options]
 * @returns {Promise<unknown>}
 */
async function callOllama(messages, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        temperature: 0,
        ...options
      }),
      signal: controller.signal
    });

    const text = await res.text();
    console.log("RAW OLLAMA:", text.slice(0, 500));

    if (!res.ok) {
      return { raw: text, httpStatus: res.status };
    }

    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = { callOllama };
