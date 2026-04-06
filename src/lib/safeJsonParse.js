"use strict";

/**
 * @param {string} text
 * @returns {unknown | null}
 */
function safeJsonParse(text) {
  if (text == null || typeof text !== "string") return null;
  const t = text.trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

module.exports = { safeJsonParse };
