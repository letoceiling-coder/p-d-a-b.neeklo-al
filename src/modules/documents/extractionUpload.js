"use strict";

const KEY_RE = /^[a-z][a-z0-9_]{0,63}$/;

/**
 * @param {unknown} raw
 * @returns {Array<{ key: string, name: string, type: 'string'|'date'|'number' }>}
 */
function sanitizeClientFieldDescriptors(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const row of raw.slice(0, 24)) {
    if (!row || typeof row !== "object") continue;
    const o = /** @type {Record<string, unknown>} */ (row);
    const key = typeof o.key === "string" ? o.key.trim() : "";
    const name = typeof o.name === "string" ? o.name.trim().slice(0, 200) : "";
    if (!KEY_RE.test(key) || !name) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    const t = String(o.type || "string").toLowerCase();
    const type =
      t === "number" || t === "NUMBER" ? "number" : t === "date" || t === "DATE" ? "date" : "string";
    out.push({ key, name, type });
  }
  return out;
}

/**
 * @param {unknown} raw
 * @returns {{ fields: Array<{ key: string, name: string, type: string }>, extractRisks: boolean } | null}
 */
function parseFieldsConfigPayload(raw) {
  if (raw == null || raw === "") {
    return null;
  }
  let obj;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  } else if (typeof raw === "object") {
    obj = raw;
  } else {
    return null;
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  if (!Array.isArray(obj.fields)) return null;
  const fields = sanitizeClientFieldDescriptors(obj.fields);
  const extractRisks = obj.extractRisks !== false;
  return { fields, extractRisks };
}

module.exports = {
  sanitizeClientFieldDescriptors,
  parseFieldsConfigPayload,
  KEY_RE
};
