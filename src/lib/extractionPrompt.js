"use strict";

/**
 * @typedef {{ key: string, name: string, type: 'string' | 'date' | 'number' }} FieldDescriptor
 */

const TYPE_HINT = {
  string: "строка",
  date: "дата (как в тексте или ISO)",
  number: "число / сумма"
};

/**
 * Промпт извлечения с настраиваемым набором полей.
 * @param {string} text
 * @param {FieldDescriptor[]} fields
 * @param {{ extractRisks?: boolean }} [options]
 * @returns {string}
 */
function buildExtractionPrompt(text, fields, options = {}) {
  const extractRisks = options.extractRisks !== false;
  const slice = text.slice(0, 20000);
  const fieldLines = fields
    .map((f) => {
      const hint = TYPE_HINT[f.type] || TYPE_HINT.string;
      return `- ключ JSON "${f.key}" (${f.name}, тип: ${hint})`;
    })
    .join("\n");

  const risksFormat = extractRisks
    ? `Элементы risks: объекты с полями "text" (строка), "level" ("low"|"medium"|"high"), "confidence" (число 0..1). Только существенные риски из текста; если нет — пустой массив [].`
    : `Массив risks ВСЕГДА пустой: []. Не анализируй риски.`;

  return `
Ты — API.
Ты НЕ человек.
Ты НЕ объясняешь.
Ты НЕ пишешь текст.

---

ТЫ ДОЛЖЕН ВЕРНУТЬ ТОЛЬКО JSON.

---

ФОРМАТ:

{
"fields": {
"<key>": {
"value": "...",
"confidence": 0.0,
"source": "..."
}
},
"risks": []
}

---

ЗАПРЕЩЕНО:

* писать текст
* писать объяснения
* писать markdown
* писать \`\`\`json
* писать перед или после JSON

---

ЕСЛИ НЕ НАЙДЕНО:

"value": null

---

Ключи в "fields" (обязательно все перечисленные):

${fieldLines}

${risksFormat}
confidence для каждого поля — число от 0 до 1.

---

Верни ТОЛЬКО JSON.
Начни ответ с { и закончи }.

---

Текст договора:

${slice}
`.trim();
}

/**
 * Второй проход: проверка и исправление JSON.
 * @param {string} jsonString
 * @returns {string}
 */
function buildVerificationPrompt(jsonString) {
  const body = jsonString.slice(0, 24000);
  return `
Ты — API.
Ты НЕ человек.
Ты НЕ объясняешь.
Ниже JSON — проверь структуру (fields, risks), исправь ошибки.
Верни ТОЛЬКО JSON.
Начни ответ с { и закончи }.
ЗАПРЕЩЕНО: markdown, \`\`\`json, текст до или после JSON.

JSON:
${body}
`.trim();
}

module.exports = {
  buildExtractionPrompt,
  buildVerificationPrompt
};
