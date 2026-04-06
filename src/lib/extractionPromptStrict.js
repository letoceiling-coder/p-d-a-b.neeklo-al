"use strict";

/**
 * @typedef {{ key: string, name?: string, type?: string }} FieldDescriptor
 */

/**
 * @param {string} text
 * @param {FieldDescriptor[]} fields
 * @returns {Array<{ role: string, content: string }>}
 */
function buildPrompt(text, fields) {
  const fieldList = fields.map((f) => `"${f.key}"`).join(", ");

  return [
    {
      role: "system",
      content: `Ты API. Ты возвращаешь только JSON.

ЗАПРЕЩЕНО:
- текст
- объяснения
- markdown
- \`\`\`json

ФОРМАТ:
{
  "fields": {
    "key": {
      "value": string | null,
      "confidence": number
    }
  },
  "risks": []
}

ЕСЛИ НЕТ ДАННЫХ -> value = null

Верни ТОЛЬКО JSON.
Начни с { и закончи }.`
    },
    {
      role: "user",
      content: `Извлеки поля: ${fieldList}

ТЕКСТ:
${text.slice(0, 15000)}`
    }
  ];
}

module.exports = { buildPrompt };
