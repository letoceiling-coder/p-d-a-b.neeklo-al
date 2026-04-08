"use strict";

/**
 * @param {string} text
 * @param {{ key: string, name?: string }} field
 * @returns {Array<{ role: string, content: string }>}
 */
function buildFieldPrompt(text, field) {
  const SYSTEM_FIELDS = new Set([
    "subject",
    "start_date",
    "end_date",
    "contract_amount",
    "inn"
  ]);

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

  if (SYSTEM_FIELDS.has(field.key)) {
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

  console.log("CUSTOM FIELD PROMPT:", field.key);
  // fallback для кастомных полей
  return [
    {
      role: "system",
      content: `
Ты анализируешь договор.

Найди значение поля: "${field.name || field.key}".

Это может быть:
- прямое упоминание
- рядом с похожими словами
- в заголовках или реквизитах

Верни краткое значение.

Ответ строго JSON:

{ "value": "...", "confidence": 0.7 }
`
    },
    {
      role: "user",
      content: text.slice(0, 12000)
    }
  ];
}

module.exports = { buildFieldPrompt };
