"use strict";

const { callAI } = require("./aiClient");
const {
  buildExtractionPrompt,
  buildVerificationPrompt
} = require("./extractionPrompt");
const {
  migrateLegacyAiPayload,
  ensureFieldShape,
  applyFieldValidators,
  normalizeRisks,
  buildMeta
} = require("./extractionNormalize");

/**
 * @typedef {{ key: string, name: string, type: 'string' | 'date' | 'number' }} FieldDescriptor
 */

/**
 * Поддержка типовых форматов ответа gateway (порядок по контракту).
 * @param {unknown} data
 * @returns {string}
 */
function replyTextFromGatewayBody(data) {
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

function extractFirstJsonString(raw) {
  const s = String(raw);
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return s.slice(start, end + 1);
}

/**
 * @param {string} raw
 * @returns {{ ok: true, obj: Record<string, unknown> } | { ok: false }}
 */
function parseExtractedJson(raw) {
  if (raw == null || !String(raw).trim()) return { ok: false };
  const jsonStr = extractFirstJsonString(String(raw));
  if (!jsonStr) return { ok: false };
  try {
    const obj = JSON.parse(jsonStr);
    if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
      return { ok: false };
    }
    JSON.parse(JSON.stringify(obj));
    return { ok: true, obj };
  } catch {
    return { ok: false };
  }
}

/**
 * Извлечение с confidence, вторым проходом AI и пост-валидацией.
 * @param {string} text
 * @param {FieldDescriptor[]} fieldDescriptors
 * @param {{ extractRisks?: boolean }} [options]
 * @returns {Promise<Record<string, unknown>>}
 */
async function extractFields(text, fieldDescriptors, options = {}) {
  const descriptors =
    fieldDescriptors && fieldDescriptors.length > 0 ? fieldDescriptors : [];
  const extractRisks = options.extractRisks !== false;

  console.log("EXTRACTION INPUT:", text.slice(0, 500));

  try {
    const assistantId = process.env.AI_ASSISTANT_ID;
    if (!assistantId) {
      const out = { status: "FAILED", error: "AI unavailable" };
      console.log("EXTRACTION OUTPUT:", out);
      return out;
    }

    if (!descriptors.length) {
      const out = { error: "No extraction fields configured" };
      console.log("EXTRACTION OUTPUT:", out);
      return out;
    }

    const prompt = buildExtractionPrompt(text, descriptors, { extractRisks });

    let parsed = { ok: false, obj: undefined };
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const data = await callAI(prompt, assistantId);
        const raw = replyTextFromGatewayBody(data);
        parsed = parseExtractedJson(raw);
        if (parsed.ok) break;
      } catch (err) {
        console.error("EXTRACT callAI failed:", err);
        const out = { status: "FAILED", error: "AI unavailable" };
        console.log("EXTRACTION OUTPUT:", out);
        return out;
      }
    }

    if (!parsed.ok || !parsed.obj) {
      const out = { error: "AI extraction failed" };
      console.log("EXTRACTION OUTPUT:", out);
      return out;
    }

    let obj = migrateLegacyAiPayload(parsed.obj, descriptors);
    if (!obj.fields || typeof obj.fields !== "object") {
      const out = { error: "AI extraction failed" };
      console.log("EXTRACTION OUTPUT:", out);
      return out;
    }

    let secondPassOk = false;
    try {
      const payload = JSON.stringify({
        fields: obj.fields,
        risks: extractRisks
          ? Array.isArray(obj.risks)
            ? obj.risks
            : []
          : []
      });
      const verifyPrompt = buildVerificationPrompt(payload);
      const data2 = await callAI(verifyPrompt, assistantId);
      const raw2 = replyTextFromGatewayBody(data2);
      const p2 = parseExtractedJson(raw2);
      if (p2.ok && p2.obj) {
        const verified = migrateLegacyAiPayload(p2.obj, descriptors);
        if (verified.fields && typeof verified.fields === "object") {
          obj = verified;
          secondPassOk = true;
        }
      }
    } catch (err) {
      console.error("VERIFY callAI failed:", err);
    }

    let fields = ensureFieldShape(obj.fields, descriptors);
    fields = applyFieldValidators(fields, descriptors);
    let risks = extractRisks ? normalizeRisks(obj.risks) : [];
    const meta = {
      ...buildMeta(fields, risks, secondPassOk),
      extractRisks
    };

    const out = {
      fields,
      risks,
      meta
    };
    console.log("EXTRACTION OUTPUT meta:", out.meta);
    return out;
  } catch (fatal) {
    console.error("EXTRACTION FATAL:", fatal);
    const out = { status: "FAILED", error: "AI unavailable" };
    console.log("EXTRACTION OUTPUT:", out);
    return out;
  }
}

module.exports = {
  extractFields,
  replyTextFromGatewayBody,
  buildExtractionPrompt,
  buildVerificationPrompt,
  parseExtractedJson
};
