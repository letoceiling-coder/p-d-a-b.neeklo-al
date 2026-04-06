const { callAI } = require("./aiClient");

function buildPrompt(text) {
  return `
Ты извлекаешь данные из договора.
Верни строго JSON без markdown и комментариев:
{
  "inn": "...",
  "amount": "...",
  "start_date": "...",
  "end_date": "...",
  "payment_terms": "..."
}
Если значения нет, поставь пустую строку.

Текст договора:
${text.slice(0, 20000)}
`.trim();
}

/**
 * Поддержка типовых форматов ответа gateway (порядок по контракту).
 * @param {unknown} data
 * @returns {string}
 */
function replyTextFromGatewayBody(data) {
  try {
    if (data == null) return "";
    if (typeof data === "string") return data;
    if (typeof data.reply === "string") return data.reply;
    if (typeof data.message === "string") return data.message;
    if (typeof data.content === "string") return data.content;
    if (typeof data.response === "string") return data.response;
    if (data.data != null && typeof data.data.content === "string") {
      return data.data.content;
    }
    const choice = data.choices?.[0]?.message?.content;
    if (typeof choice === "string") return choice;
    if (data.data != null && typeof data.data.message === "string") {
      return data.data.message;
    }
    if (typeof data.text === "string") return data.text;
    return "";
  } catch {
    return "";
  }
}

function extractFirstJsonString(raw) {
  const s = String(raw);
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return s.slice(start, end + 1);
}

/**
 * Проверка и парсинг JSON объекта из сырой строки ответа.
 * @param {string} raw
 * @returns {{ ok: true, obj: Record<string, unknown> } | { ok: false }}
 */
function parseExtractedJson(raw) {
  if (raw == null || !String(raw).trim()) return { ok: false };
  const jsonStr = extractFirstJsonString(String(raw));
  if (!jsonStr) return { ok: false };
  try {
    JSON.parse(jsonStr);
  } catch {
    return { ok: false };
  }
  try {
    const obj = JSON.parse(jsonStr);
    JSON.parse(JSON.stringify(obj));
    if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
      return { ok: false };
    }
    return { ok: true, obj };
  } catch {
    return { ok: false };
  }
}

/**
 * Извлечение полей договора через AI Gateway.
 * Не бросает наружу: при фатальной ошибке AI возвращает { status, error } или { error }.
 * @param {string} text
 * @returns {Promise<Record<string, unknown>>}
 */
async function extractFields(text) {
  console.log("EXTRACTION INPUT:", text.slice(0, 500));

  try {
    const assistantId = process.env.AI_ASSISTANT_ID;
    if (!assistantId) {
      const out = { status: "FAILED", error: "AI unavailable" };
      console.log("EXTRACTION OUTPUT:", out);
      return out;
    }

    const prompt = buildPrompt(text);

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const data = await callAI(prompt, assistantId);
        const raw = replyTextFromGatewayBody(data);
        const parsed = parseExtractedJson(raw);
        if (parsed.ok) {
          console.log("EXTRACTION OUTPUT:", parsed.obj);
          return parsed.obj;
        }
      } catch (err) {
        console.error("EXTRACT callAI failed:", err);
        const out = { status: "FAILED", error: "AI unavailable" };
        console.log("EXTRACTION OUTPUT:", out);
        return out;
      }
    }

    const out = { error: "AI extraction failed" };
    console.log("EXTRACTION OUTPUT:", out);
    return out;
  } catch (fatal) {
    console.error("EXTRACTION FATAL:", fatal);
    const out = { status: "FAILED", error: "AI unavailable" };
    console.log("EXTRACTION OUTPUT:", out);
    return out;
  }
}

module.exports = {
  extractFields,
  replyTextFromGatewayBody,
  buildPrompt
};
