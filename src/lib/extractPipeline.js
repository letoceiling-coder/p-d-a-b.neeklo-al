"use strict";

const { callOllama } = require("./ollamaDirect");
const { buildPrompt } = require("./extractionPromptStrict");
const { extractJson } = require("./parseJsonStrict");

/**
 * @typedef {{ key: string, name?: string, type?: string }} FieldDescriptor
 */

/**
 * @param {unknown} body
 * @returns {string}
 */
function ollamaMessageText(body) {
  if (!body || typeof body !== "object") return "";
  const b = /** @type {Record<string, unknown>} */ (body);
  if (typeof b.raw === "string") return b.raw;
  const msg = b.message;
  if (msg && typeof msg === "object" && typeof msg.content === "string") {
    return msg.content;
  }
  if (typeof b.response === "string") return b.response;
  return "";
}

/**
 * @param {string} text
 * @param {FieldDescriptor[]} fields
 * @returns {Promise<Record<string, unknown>>}
 */
async function extractWithRetry(text, fields) {
  const messages = buildPrompt(text, fields);

  const res1 = await callOllama(messages, { temperature: 0 });
  const raw1 = ollamaMessageText(res1);
  const parsed1 = extractJson(raw1);
  console.log("PARSED 1:", parsed1);
  if (parsed1) return parsed1;

  const retryPrompt = [
    {
      role: "system",
      content:
        "Ты нарушил формат ответа. Верни ТОЛЬКО JSON. Без текста. Начни с { и закончи }."
    },
    {
      role: "user",
      content: text.slice(0, 15000)
    }
  ];

  const res2 = await callOllama(retryPrompt, { temperature: 0 });
  const raw2 = ollamaMessageText(res2);
  const parsed2 = extractJson(raw2);
  console.log("PARSED 2:", parsed2);
  if (parsed2) return parsed2;

  return {
    fields: {},
    risks: [],
    meta: {
      extractionFailed: true,
      raw: raw2 || raw1
    }
  };
}

module.exports = { extractWithRetry, ollamaMessageText };
