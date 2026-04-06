"use strict";

/**
 * ИНН РФ: 10 или 12 цифр.
 * @param {string} value
 * @returns {boolean}
 */
function validateInn(value) {
  const v = String(value).replace(/\s/g, "");
  if (!v) return true;
  return /^\d{10}$|^\d{12}$/.test(v);
}

/**
 * Дата: ISO, DD.MM.YYYY или распознаваемая строка, год 1990–2120.
 * @param {string} value
 * @returns {boolean}
 */
function validateDate(value) {
  const raw = String(value).trim();
  if (!raw) return true;
  const ru = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(raw);
  let d;
  if (ru) {
    const dd = Number(ru[1]);
    const mm = Number(ru[2]);
    const yy = Number(ru[3]);
    d = new Date(yy, mm - 1, dd);
    if (
      d.getFullYear() !== yy ||
      d.getMonth() !== mm - 1 ||
      d.getDate() !== dd
    ) {
      return false;
    }
  } else {
    d = new Date(raw);
  }
  if (Number.isNaN(d.getTime())) return false;
  const y = d.getFullYear();
  return y >= 1990 && y <= 2120;
}

/**
 * Сумма: непустое значение должно парситься в разумное неотрицательное число.
 * @param {string} value
 * @returns {boolean}
 */
function validateAmount(value) {
  const v = String(value).trim();
  if (!v) return true;
  const cleaned = v
    .replace(/\s/g, "")
    .replace(/,/g, ".")
    .replace(/руб\.?|₽|RUB/gi, "");
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return false;
  const num = Number(match[0]);
  return !Number.isNaN(num) && num >= 0 && num < 1e16;
}

module.exports = {
  validateInn,
  validateDate,
  validateAmount
};
