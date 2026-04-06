"use strict";

const { callOllama } = require("./ollamaDirect");
const { buildFieldPrompt } = require("./extractionPromptField");
const { extractJson } = require("./parseJsonStrict");
const { applyRuleEngine } = require("./ruleEngine");

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
 * @param {Array<{ key: string, name?: string }>} fields
 * @returns {Promise<Record<string, unknown>>}
 */
async function extractMultiPass(text, fields) {
  const result = {
    fields: {},
    risks: [],
    meta: {}
  };

  const ruleResults = applyRuleEngine(text, fields);

  for (const field of fields) {
    try {
      if (ruleResults[field.key]) {
        console.log("RULE HIT:", field.key);
        result.fields[field.key] = { ...ruleResults[field.key] };
        continue;
      }

      let value = null;
      let confidence = 0;

      const res1 = await callOllama(buildFieldPrompt(text, field), { temperature: 0 });
      const raw1 = ollamaMessageText(res1);
      const parsed1 = extractJson(raw1);

      console.log("FIELD:", field.key);
      console.log("RAW1:", (raw1 || "").slice(0, 200));

      if (parsed1 && Object.prototype.hasOwnProperty.call(parsed1, "value")) {
        value = parsed1.value ?? null;
        confidence =
          typeof parsed1.confidence === "number" ? parsed1.confidence : 0.7;
      } else {
        const retryPrompt = [
          {
            role: "system",
            content: "Верни строго JSON. Только { value, confidence }"
          },
          {
            role: "user",
            content: text.slice(0, 12000)
          }
        ];

        const res2 = await callOllama(retryPrompt, { temperature: 0 });
        const raw2 = ollamaMessageText(res2);
        const parsed2 = extractJson(raw2);

        console.log("RAW2:", (raw2 || "").slice(0, 200));

        if (parsed2 && Object.prototype.hasOwnProperty.call(parsed2, "value")) {
          value = parsed2.value ?? null;
          confidence =
            typeof parsed2.confidence === "number" ? parsed2.confidence : 0.5;
        }
      }

      result.fields[field.key] = {
        value: value ?? null,
        confidence
      };
    } catch (err) {
      console.error("FIELD ERROR:", field.key, err?.message);
      result.fields[field.key] = {
        value: null,
        confidence: 0,
        error: "timeout_or_ai_error"
      };
      if (!result.meta) result.meta = {};
      result.meta.partialExtraction = true;
      continue;
    }
  }

  return result;
}

module.exports = { extractMultiPass };
