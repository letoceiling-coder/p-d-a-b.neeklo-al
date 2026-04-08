"use strict";

/**
 * @param {string} text
 * @param {{ key: string, name?: string }} field
 * @returns {Array<{ role: string, content: string }>}
 */
function buildFieldPrompt(text, field) {
  if (field.key === "subject") {
    return [
      {
        role: "system",
        content: `
Ты анализируешь договор.

Найди ПРЕДМЕТ ДОГОВОРА.

Это обычно:
- что делает исполнитель
- какие услуги оказываются
- что является целью договора

Верни краткое описание (1-2 предложения).

Если есть блок с обязанностями — это и есть предмет.

Ответ строго JSON:

{ "value": "...", "confidence": 0.9 }
`
      },
      {
        role: "user",
        content: text.slice(0, 12000)
      }
    ];
  }

  return [
    {
      role: "system",
      content: `Ты API. Верни ТОЛЬКО JSON.

ФОРМАТ:
{
"value": string | null,
"confidence": number
}

ПРАВИЛА:
* НЕТ текста
* НЕТ markdown
* НЕТ объяснений
* ЕСЛИ НЕТ ДАННЫХ -> value = null
* confidence 0..1
* НЕ ПРИДУМЫВАТЬ

Начни с { и закончи }.`
    },
    {
      role: "user",
      content: `Поле: ${field.name || field.key}

Текст договора:
${text.slice(0, 12000)}`
    }
  ];
}

module.exports = { buildFieldPrompt };
