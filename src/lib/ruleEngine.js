"use strict";

/**
 * @returns {{ value: string, confidence: number } | null}
 */
function extractInn(text) {
  const match = text.match(/\b\d{10}\b|\b\d{12}\b/);
  if (!match) return null;

  return {
    value: match[0],
    confidence: 1
  };
}

/**
 * @returns {{ value: string, confidence: number } | null}
 */
function extractAmount(text) {
  let match = text.match(
    /сумма[^:\d]{0,48}:\s*(\d[\d\s]{3,})\s*(?:руб|₽|RUB|рубл(?:ей|я)?)?/i
  );
  if (!match) {
    match = text.match(
      /(?:сумма|amount)\s*[:.]?\s*(\d[\d\s]{3,})\s*(?:руб|₽|RUB)?/i
    );
  }
  if (!match) {
    match = text.match(/(\d[\d\s]{3,})\s?(руб|₽|RUB)?/i);
  }
  if (!match) return null;

  const clean = match[1].replace(/\s+/g, "");
  return {
    value: clean,
    confidence: 0.95
  };
}

/**
 * @returns {{ value: string, confidence: number } | null}
 */
function extractDate(text) {
  const match = text.match(/\b\d{2}\.\d{2}\.\d{4}\b/);
  if (!match) return null;

  return {
    value: match[0],
    confidence: 0.9
  };
}

/**
 * @param {string} text
 * @param {Array<{ key: string, name?: string }>} fields
 * @returns {Record<string, { value: string, confidence: number, source: string }>}
 */
function applyRuleEngine(text, fields) {
  const result = {};

  for (const field of fields) {
    let extracted = null;

    if (field.key === "inn") {
      extracted = extractInn(text);
    }

    if (field.key === "contract_amount") {
      extracted = extractAmount(text);
    }

    if (field.key === "start_date" || field.key === "end_date") {
      extracted = extractDate(text);
    }

    if (extracted) {
      result[field.key] = {
        ...extracted,
        source: "rule"
      };
    }
  }

  return result;
}

module.exports = { applyRuleEngine };
