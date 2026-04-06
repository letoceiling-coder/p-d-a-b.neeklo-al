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

  const risksBlock = extractRisks
    ? `"risks": [
    {
      "text": "описание риска",
      "level": "low" | "medium" | "high",
      "confidence": 0.0
    }
  ]`
    : `"risks": []`;

  const risksRules = extractRisks
    ? `- Массив risks: только существенные риски из текста; если нет — [].`
    : `- Массив risks ВСЕГДА пустой: []. Не анализируй и не описывай риски.`;

  return `
Ты анализируешь договор.
Верни строго один JSON-объект без markdown и пояснений.

Структура:
{
  "fields": {
    "<ключ>": {
      "value": "извлечённое значение или пустая строка",
      "confidence": 0.0,
      "source": "краткая цитата из договора, откуда взято значение"
    }
  },
  ${risksBlock}
}

Поля для извлечения (для каждого создай объект в "fields" с указанным ключом):
${fieldLines}

Правила:
- confidence от 0 до 1 для каждого поля${extractRisks ? " и риска" : ""}.
- Если значение не найдено: value "", confidence низкая (например 0.2), source можно оставить пустым.
${risksRules}

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
Ниже JSON, извлечённый из договора моделью.
Проверь корректность структуры (объекты fields и risks), типы полей и очевидные ошибки.
Исправь JSON при необходимости, не добавляй комментарии.
Верни ТОЛЬКО итоговый JSON без markdown и текста вокруг.

JSON:
${body}
`.trim();
}

module.exports = {
  buildExtractionPrompt,
  buildVerificationPrompt
};
