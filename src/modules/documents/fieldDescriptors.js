"use strict";

const DEFAULT_FIELD_DESCRIPTORS = [
  { key: "inn", name: "ИНН", type: "string" },
  { key: "amount", name: "Сумма контракта", type: "number" },
  { key: "start_date", name: "Дата начала", type: "date" },
  { key: "end_date", name: "Дата окончания", type: "date" },
  { key: "payment_terms", name: "Условия оплаты", type: "string" }
];

/**
 * @param {unknown} t
 * @returns {'string' | 'date' | 'number'}
 */
function coerceType(t) {
  const s = String(t).toLowerCase();
  if (s === "number" || s === "NUMBER") return "number";
  if (s === "date" || s === "DATE") return "date";
  return "string";
}

/**
 * @param {{ key: string, name: string, type: string }} r
 */
function rowToDescriptor(r) {
  const t = String(r.type);
  const type =
    t === "NUMBER" ? "number" : t === "DATE" ? "date" : "string";
  return {
    key: r.key,
    name: r.name,
    type
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {unknown} fieldsConfig — Document.fieldsConfig: [{ key, name, type }?]
 * @returns {Promise<Array<{ key: string, name: string, type: 'string'|'date'|'number' }>>}
 */
async function loadFieldDescriptors(prisma, fieldsConfig) {
  if (Array.isArray(fieldsConfig) && fieldsConfig.length > 0) {
    const out = [];
    for (const row of fieldsConfig) {
      if (!row || typeof row !== "object") continue;
      const o = /** @type {Record<string, unknown>} */ (row);
      if (typeof o.key !== "string" || typeof o.name !== "string") continue;
      out.push({
        key: o.key,
        name: o.name,
        type: coerceType(o.type)
      });
    }
    if (out.length > 0) return out;
  }

  const rows = await prisma.extractionField.findMany({
    where: { isDefault: true },
    orderBy: { key: "asc" }
  });

  if (rows.length === 0) {
    return [...DEFAULT_FIELD_DESCRIPTORS];
  }

  return rows.map(rowToDescriptor);
}

module.exports = {
  loadFieldDescriptors,
  DEFAULT_FIELD_DESCRIPTORS
};
