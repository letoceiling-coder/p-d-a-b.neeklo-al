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
 * @param {string | null | undefined} raw
 * @returns {string | null}
 */
function normalizeAmount(raw) {
  if (!raw) return null;

  let cleaned = raw
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");

  if (!cleaned) return null;

  return cleaned;
}

/**
 * @param {string | null | undefined} raw
 * @returns {string | null}
 */
function normalizeDate(raw) {
  if (!raw) return null;

  const trimmed = String(raw).trim();

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [y, m, d] = trimmed.split("T")[0].split("-");
    return `${d}.${m}.${y}`;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("/");
    return `${d}.${m}.${y}`;
  }

  return null;
}

/** Допустимые литералы даты в тексте (ISO / slash / dot). */
const DATE_INNER =
  "\\d{4}-\\d{2}-\\d{2}(?:T[^\\s]*)?|\\d{2}/\\d{2}/\\d{4}|\\d{2}\\.\\d{2}\\.\\d{4}";

const THOUSAND_FORMS = ["тысяча", "тысячи", "тысяч", "тысяче"];
const MILLION_FORMS = ["миллион", "миллиона", "миллионов"];

/**
 * Сумма лексем 0–999 (сотни + десятки + единицы, аддитивно).
 * @param {string[]} words
 * @param {Record<string, number>} map
 * @returns {number}
 */
function sumBlock(words, map) {
  let s = 0;
  for (const w of words) {
    if (map[w] !== undefined) s += map[w];
  }
  return s;
}

/**
 * @param {string[]} tokens
 * @param {Record<string, number>} map
 * @returns {number | null}
 */
function parseRussianNumberFromTokens(tokens, map) {
  if (tokens.length === 0) return null;

  const ti = tokens.findIndex((w) => THOUSAND_FORMS.includes(w));
  const mi = tokens.findIndex((w) => MILLION_FORMS.includes(w));

  if (mi !== -1 && (ti === -1 || mi < ti)) {
    const left = sumBlock(tokens.slice(0, mi), map);
    const rest = tokens.slice(mi + 1);
    const sub = parseRussianNumberFromTokens(rest, map);
    return left * 1_000_000 + (sub || 0);
  }

  if (ti !== -1) {
    const left = sumBlock(tokens.slice(0, ti), map);
    const right = sumBlock(tokens.slice(ti + 1), map);
    return left * 1000 + right;
  }

  const s = sumBlock(tokens, map);
  return s > 0 ? s : null;
}

/**
 * Разбор числа прописью (рус.), поддержка тысяч и миллионов.
 * @param {string} text
 * @returns {number | null}
 */
function parseRussianNumber(text) {
  const map = {
    ноль: 0,
    один: 1,
    одна: 1,
    одну: 1,
    два: 2,
    две: 2,
    три: 3,
    четыре: 4,
    пять: 5,
    шесть: 6,
    семь: 7,
    восемь: 8,
    девять: 9,
    десять: 10,
    одиннадцать: 11,
    двенадцать: 12,
    тринадцать: 13,
    четырнадцать: 14,
    пятнадцать: 15,
    шестнадцать: 16,
    семнадцать: 17,
    восемнадцать: 18,
    девятнадцать: 19,
    двадцать: 20,
    тридцать: 30,
    сорок: 40,
    пятьдесят: 50,
    шестьдесят: 60,
    семьдесят: 70,
    восемьдесят: 80,
    девяносто: 90,
    сто: 100,
    двести: 200,
    триста: 300,
    четыреста: 400,
    пятьсот: 500,
    шестьсот: 600,
    семьсот: 700,
    восемьсот: 800,
    девятьсот: 900,
    тысяча: 1000,
    тысячи: 1000,
    тысяч: 1000,
    тысяче: 1000,
    миллион: 1_000_000,
    миллиона: 1_000_000,
    миллионов: 1_000_000
  };

  const tokens = text
    .toLowerCase()
    .replace(/ё/g, "е")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return null;

  return parseRussianNumberFromTokens(tokens, map);
}

/**
 * @returns {{ value: string, confidence: number, source?: string } | null}
 */
function extractAmountWords(text) {
  const match = text.match(/([а-яё\s]+)руб/i);
  if (!match) return null;

  const words = match[1].toLowerCase().trim();

  const parsed = parseRussianNumber(words);

  if (!parsed) {
    return {
      value: words,
      confidence: 0.5,
      source: "words"
    };
  }

  return {
    value: String(parsed),
    confidence: 0.7,
    source: "words"
  };
}

function isFakeNumber(v) {
  return /^\d+\.\d+$/.test(v);
}

function isValidAmount(v) {
  const num = Number(v.replace(/\s/g, "").replace(",", "."));
  return num > 1000;
}

/**
 * @returns {{ value: string, confidence: number, source?: string } | null}
 */
function extractAmount(text) {
  const contextMatch = text.match(
    /(сумм[аы]|стоимость|цена договора)[^\d]*(\d[\d\s.,]{3,})/iu
  );

  if (contextMatch && isFakeNumber(contextMatch[2])) {
    console.log("SKIP FAKE AMOUNT:", contextMatch[2]);
    return null;
  }

  if (contextMatch) {
    const normalized = normalizeAmount(contextMatch[2]);
    if (normalized) {
      console.log("RULE AMOUNT HIT (context)");
      return {
        value: normalized,
        confidence: 0.95
      };
    }
  }

  const matches = [...text.matchAll(/(\d[\d\s.,]{3,})/g)];

  const candidates = matches
    .map((m) => {
      const raw = m[1];
      console.log("AMOUNT RAW:", raw);
      if (isFakeNumber(raw)) return null;
      const normalized = normalizeAmount(raw);

      const start = m.index ?? 0;
      const context = text
        .slice(Math.max(0, start - 30), start + 30)
        .toLowerCase();

      let score = 0;

      if (
        context.includes("сумм") ||
        context.includes("стоимость") ||
        context.includes("цена")
      ) {
        score += 5;
      }

      if (context.includes("договор")) {
        score += 3;
      }

      if (context.includes("штраф")) {
        score -= 3;
      }

      if (context.includes("аванс")) {
        score -= 2;
      }

      return {
        value: normalized,
        score,
        context
      };
    })
    .filter((c) => c && c.value && isValidAmount(c.value));

  if (!candidates.length) return extractAmountWords(text);

  const best = [...candidates].sort((a, b) => b.score - a.score)[0];

  console.log("AMOUNT CANDIDATES:", candidates);
  console.log("AMOUNT SELECTED:", best);

  return {
    value: best.value,
    confidence: best.score > 0 ? 0.9 : 0.6
  };
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function allDatesInOrder(text) {
  const re = new RegExp(DATE_INNER, "g");
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const n = normalizeDate(m[0]);
    if (n) out.push(n);
  }
  return out;
}

/**
 * @returns {{ value: string, confidence: number } | null}
 */
function extractStartDate(text) {
  const match = text.match(
    /(начал[ао]|дата начала|действует с|вступает в силу)[^\d]{0,50}(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})/iu
  );
  if (!match) return null;

  const value = normalizeDate(match[2]);
  if (!value) return null;

  return {
    value,
    confidence: 0.95
  };
}

/**
 * @returns {{ value: string, confidence: number } | null}
 */
function extractEndDate(text) {
  const match = text.match(
    /(окончан[ия]|дата окончания|действует до|срок до|по\s+\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})[^\d]{0,50}(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})/iu
  );
  if (!match) return null;

  const value = normalizeDate(match[2]);
  if (!value) return null;

  return {
    value,
    confidence: 0.95
  };
}

/**
 * Старый regex: первая дата в тексте (низкая уверенность).
 * @returns {{ value: string, confidence: number } | null}
 */
function extractDateFallbackStart(text) {
  const dates = allDatesInOrder(text);
  if (dates.length === 0) return null;
  return { value: dates[0], confidence: 0.6 };
}

/**
 * Вторая дата в тексте, если есть (чтобы не совпадать со start при двух датах).
 * @returns {{ value: string, confidence: number } | null}
 */
function extractDateFallbackEnd(text) {
  const dates = allDatesInOrder(text);
  if (dates.length < 2) return null;
  return { value: dates[1], confidence: 0.6 };
}

function extractSubject(text) {
  if (!text) return null;

  const lower = text.toLowerCase();

  const anchors = [
    "предмет договора",
    "предмет:",
    "исполнитель обязуется",
    "по настоящему договору",
    "обязуется выполнить"
  ];

  let index = -1;

  for (const a of anchors) {
    const i = lower.indexOf(a);
    if (i !== -1) {
      index = i;
      break;
    }
  }

  if (index === -1) return null;

  const slice = text.slice(index, index + 500);
  const end = slice.search(/\n\s*\n/);
  const value = end !== -1 ? slice.slice(0, end) : slice;

  return {
    value: value.trim(),
    confidence: 0.85,
    source: "rule"
  };
}

function extractContractNumber(text) {
  if (!text) return null;

  const match = text.match(
    /(?:договор|контракт)[^\n]{0,50}№\s*([A-Za-zА-Яа-я0-9\-\/]+)/iu
  );

  if (!match) return null;

  const value = match[1].trim();

  if (!/[0-9]/.test(value)) {
    console.log("SKIP INVALID CONTRACT NUMBER:", value);
    return null;
  }

  return {
    value,
    confidence: 0.95,
    source: "rule"
  };
}

/**
 * @param {string} text
 * @param {Array<{ key: string, name?: string }>} fields
 * @returns {Record<string, { value: string, confidence: number, source: string }>}
 */
function applyRuleEngine(text, fields) {
  const result = {};
  if (fields.some((f) => f.key === "subject")) {
    result.subject = extractSubject(text);
  }
  console.log("SUBJECT EXTRACTED:", result["subject"]);

  if (fields.some((f) => f.key === "contract_number")) {
    const resultCN = extractContractNumber(text);
    if (resultCN) {
      result.contract_number = resultCN;
      console.log("CONTRACT NUMBER RULE:", resultCN.value);
    }
  }

  for (const field of fields) {
    let extracted = null;

    if (field.key === "inn") {
      extracted = extractInn(text);
    }

    if (field.key === "contract_amount") {
      extracted = extractAmount(text);
    }

    if (field.key === "start_date") {
      extracted = extractStartDate(text);
      if (extracted) console.log("RULE DATE HIT:", field.key);
      if (!extracted) extracted = extractDateFallbackStart(text);
    }

    if (field.key === "end_date") {
      extracted = extractEndDate(text);
      if (extracted) console.log("RULE DATE HIT:", field.key);
      if (!extracted) extracted = extractDateFallbackEnd(text);
    }

    if (field.key === "subject" && result.subject) {
      extracted = result.subject;
    }

    if (field.key === "contract_number" && result.contract_number) {
      extracted = result.contract_number;
    }

    if (extracted) {
      result[field.key] = {
        ...extracted,
        source: extracted.source ?? "rule"
      };
    }
  }

  return result;
}

module.exports = { applyRuleEngine };
