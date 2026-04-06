"use strict";

/**
 * @param {string} raw
 * @returns {Record<string, unknown> | null}
 */
function extractJson(raw) {
  if (!raw) return null;
  const match = String(raw).match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

module.exports = { extractJson };
