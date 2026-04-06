"use strict";

const { extractWithRetry } = require("./extractPipeline");
const {
  migrateLegacyAiPayload,
  ensureFieldShape,
  applyFieldValidators,
  normalizeRisks,
  buildMeta,
  attachLowExtractionQualityMeta
} = require("./extractionNormalize");

/**
 * @typedef {{ key: string, name: string, type: 'string' | 'date' | 'number' }} FieldDescriptor
 */

/**
 * Извлечение с прямым вызовом Ollama (GPU) + пост-валидацией.
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
    if (!descriptors.length) {
      const out = { error: "No extraction fields configured" };
      console.log("EXTRACTION OUTPUT:", out);
      return out;
    }

    const aiObj = await extractWithRetry(text, descriptors);
    const aiMeta =
      aiObj && typeof aiObj === "object" && aiObj.meta && typeof aiObj.meta === "object"
        ? aiObj.meta
        : null;
    const lastRaw = aiMeta && typeof aiMeta.raw === "string" ? aiMeta.raw : "";

    let obj = migrateLegacyAiPayload(aiObj, descriptors);
    if (!obj.fields || typeof obj.fields !== "object") {
      let fields = ensureFieldShape({}, descriptors);
      fields = applyFieldValidators(fields, descriptors);
      const risks = [];
      const meta = {
        ...buildMeta(fields, risks, false),
        extractRisks,
        rawAiResponse: lastRaw,
        extractionParseFailed: true,
        extractionShapeFailed: true
      };
      attachLowExtractionQualityMeta(meta, fields);
      const out = { fields, risks, meta };
      console.log("EXTRACTION OUTPUT meta:", out.meta);
      return out;
    }

    let fields = ensureFieldShape(obj.fields, descriptors);
    fields = applyFieldValidators(fields, descriptors);
    const risks = extractRisks ? normalizeRisks(obj.risks) : [];
    const meta = {
      ...buildMeta(fields, risks, false),
      extractRisks
    };
    if (aiMeta && aiMeta.extractionFailed === true) {
      meta.extractionParseFailed = true;
      meta.rawAiResponse = lastRaw;
    }
    attachLowExtractionQualityMeta(meta, fields);

    const out = { fields, risks, meta };
    console.log("EXTRACTION OUTPUT meta:", out.meta);
    return out;
  } catch (fatal) {
    console.error("EXTRACTION FATAL:", fatal);
    const out = { status: "FAILED", error: "AI unavailable" };
    console.log("EXTRACTION OUTPUT:", out);
    return out;
  }
}

module.exports = { extractFields };
