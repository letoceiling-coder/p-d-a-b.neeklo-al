"use strict";

/**
 * ИНН РФ: только 10 или 12 цифр (пусто — нечего проверять).
 * @param {string} value
 * @returns {boolean}
 */
function validateInn(value) {
  const v = String(value).replace(/\s/g, "");
  if (!v) return true;
  return /^\d{10}$|^\d{12}$/.test(v);
}

/**
 * Дата: только ISO (YYYY-MM-DD…) или ДД.ММ.ГГГГ, год 1990–2120.
 * @param {string} value
 * @returns {boolean}
 */
function validateDate(value) {
  const raw = String(value).trim();
  if (!raw) return true;

  const ru = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(raw);
  if (ru) {
    const dd = Number(ru[1]);
    const mm = Number(ru[2]);
    const yy = Number(ru[3]);
    if (yy < 1990 || yy > 2120) return false;
    const d = new Date(yy, mm - 1, dd);
    return (
      d.getFullYear() === yy &&
      d.getMonth() === mm - 1 &&
      d.getDate() === dd
    );
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[Tt ].*)?$/.exec(raw);
  if (iso) {
    const yy = Number(iso[1]);
    const mm = Number(iso[2]);
    const dd = Number(iso[3]);
    if (yy < 1990 || yy > 2120) return false;
    const d = new Date(Date.UTC(yy, mm - 1, dd));
    return (
      d.getUTCFullYear() === yy &&
      d.getUTCMonth() === mm - 1 &&
      d.getUTCDate() === dd
    );
  }

  return false;
}

/**
 * Сумма: в строке должно быть число; пробелы, запятые, «руб» допустимы.
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
