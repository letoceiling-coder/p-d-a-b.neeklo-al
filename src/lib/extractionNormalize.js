"use strict";

const {
  validateInn,
  validateDate,
  validateAmount
} = require("./extractionValidators");

/**
 * @typedef {{ key: string, name: string, type: 'string' | 'date' | 'number' }} FieldDescriptor
 */

function clamp01(x) {
  if (Number.isNaN(x) || x == null) return 0;
  return Math.max(0, Math.min(1, x));
}

/**
 * Уверенность по фактам (источник, значение, doubtful), не из ответа LLM.
 * @param {Record<string, unknown>} field
 * @param {Record<string, unknown>} [_context]
 * @returns {number}
 */
function calculateConfidence(field, _context) {
  let score = 0.5;

  const source = String(field.source || "");

  if (source === "rule") {
    score += 0.4;
  }

  const val = field.value;
  const hasValue =
    val !== null &&
    val !== undefined &&
    String(val).trim() !== "";

  if (hasValue) {
    score += 0.1;
  }

  if (field.doubtful === true) {
    score -= 0.3;
  }

  if (source === "llm") {
    score -= 0.1;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Короткое объяснение для пользователя: откуда взялось значение поля.
 * @param {Record<string, unknown>} field
 * @returns {string}
 */
function buildReason(field) {
  const source = String(field.source || "");
  const hasValue =
    field.value !== null &&
    field.value !== undefined &&
    String(field.value).trim() !== "";

  if (!hasValue) {
    return "значение не найдено в документе";
  }

  if (source === "rule" || source === "words") {
    return "найдено по ключевым словам в документе";
  }

  if (source === "llm") {
    if (field.doubtful) {
      return "извлечено AI, но есть сомнения";
    }
    return "извлечено AI на основе анализа текста";
  }

  return "не удалось определить источник";
}

/**
 * Ответ AI в плоском виде → структура fields + risks.
 * @param {Record<string, unknown>} obj
 * @param {FieldDescriptor[]} descriptors
 * @returns {Record<string, unknown>}
 */
function migrateLegacyAiPayload(obj, descriptors) {
  if (obj.fields && typeof obj.fields === "object" && !Array.isArray(obj.fields)) {
    return obj;
  }
  const fields = {};
  for (const d of descriptors) {
    const raw = obj[d.key];
    const value = raw != null ? String(raw) : "";
    const trimmed = value.trim();
    fields[d.key] = {
      value,
      confidence: trimmed ? 0.65 : 0.25,
      source: "llm",
      doubtful: !trimmed
    };
  }
  let risks = [];
  if (Array.isArray(obj.risks)) {
    risks = obj.risks.map((r) => {
      if (typeof r === "string") {
        return {
          text: r,
          level: "medium",
          confidence: 0.5
        };
      }
      return r;
    });
  }
  return { fields, risks, legacyMigration: true };
}

/**
 * @param {Record<string, unknown>} fields
 * @param {FieldDescriptor[]} descriptors
 */
function ensureFieldShape(fields, descriptors) {
  const out = { ...(fields && typeof fields === "object" ? fields : {}) };
  for (const d of descriptors) {
    const cell = out[d.key];
    if (!cell || typeof cell !== "object" || Array.isArray(cell)) {
      out[d.key] = {
        value: "",
        confidence: 0,
        source: "",
        doubtful: true
      };
    } else {
      const f = /** @type {Record<string, unknown>} */ (cell);
      if (f.value === null) {
        /* явный null от AI — «нет в договоре», не подменяем на "" */
      } else if (f.value === undefined) {
        f.value = "";
      } else {
        f.value = String(f.value);
      }
      f.confidence = clamp01(Number(f.confidence));
      if (f.source == null) f.source = "";
      else f.source = String(f.source);
    }
  }
  return out;
}

/**
 * @param {Record<string, unknown>} fields
 * @param {FieldDescriptor[]} descriptors
 */
function applyFieldValidators(fields, descriptors) {
  const map = Object.fromEntries(descriptors.map((d) => [d.key, d]));
  for (const key of Object.keys(fields)) {
    const cell = fields[key];
    if (!cell || typeof cell !== "object") continue;
    const f = /** @type {Record<string, unknown>} */ (cell);
    const desc = map[key];
    const type = (desc && desc.type) || "string";
    const val = f.value != null ? String(f.value).trim() : "";

    let ok = true;
    if (val) {
      if (key === "inn") ok = validateInn(val);
      else if (type === "date") ok = validateDate(val);
      else if (type === "number" || key === "amount") ok = validateAmount(val);
    }

    if (!ok) {
      f.value = null;
      f.doubtful = true;
      f.source = "";
    } else {
      f.doubtful = !val;
    }

    f.confidence = calculateConfidence(f, { key, descriptor: desc });
    f.reason = buildReason(f);
  }
  return fields;
}

/**
 * @param {unknown} risks
 */
function normalizeRisks(risks) {
  if (!Array.isArray(risks)) return [];
  return risks
    .map((r) => {
      if (!r || typeof r !== "object" || Array.isArray(r)) return null;
      const o = /** @type {Record<string, unknown>} */ (r);
      const text =
        typeof o.text === "string"
          ? o.text
          : typeof o.message === "string"
            ? o.message
            : "";
      const level =
        typeof o.level === "string" && ["low", "medium", "high"].includes(o.level)
          ? o.level
          : "medium";
      let c = clamp01(Number(o.confidence));
      return {
        text,
        level,
        confidence: c,
        doubtful: c < 0.5
      };
    })
    .filter(Boolean);
}

/**
 * @param {Record<string, unknown>} fields
 * @param {unknown[]} risks
 */
function buildMeta(fields, risks, secondPassOk) {
  const anyFieldDoubtful = Object.values(fields).some(
    (cell) =>
      cell &&
      typeof cell === "object" &&
      /** @type {{ doubtful?: boolean }} */ (cell).doubtful === true
  );
  const anyRiskDoubtful = risks.some(
    (r) => r && typeof r === "object" && r.doubtful === true
  );
  return {
    extractionVersion: 2,
    secondPassOk: Boolean(secondPassOk),
    anyDoubtful: anyFieldDoubtful || anyRiskDoubtful
  };
}

/**
 * Доля заполненных полей меньше 30% → meta.lowExtractionQuality.
 * @param {Record<string, unknown>} meta
 * @param {Record<string, unknown>} fields
 */
function attachLowExtractionQualityMeta(meta, fields) {
  const total = Object.keys(fields).length;
  const filled = Object.values(fields).filter((cell) => {
    if (!cell || typeof cell !== "object" || Array.isArray(cell)) return false;
    const v = /** @type {{ value?: unknown }} */ (cell).value;
    return v !== null && v !== "";
  }).length;
  if (total > 0 && filled / total < 0.3) {
    meta.lowExtractionQuality = true;
  }
}

module.exports = {
  migrateLegacyAiPayload,
  ensureFieldShape,
  applyFieldValidators,
  calculateConfidence,
  buildReason,
  normalizeRisks,
  buildMeta,
  attachLowExtractionQualityMeta,
  clamp01
};
