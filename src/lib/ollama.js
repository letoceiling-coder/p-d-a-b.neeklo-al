const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3:8b";

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

function extractFirstJson(raw) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("LLM did not return JSON object");
  }
  const maybeJson = raw.slice(start, end + 1);
  return JSON.parse(maybeJson);
}

async function extractFields(text) {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: buildPrompt(text),
      stream: false
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ollama error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return extractFirstJson(data.response || "");
}

module.exports = { extractFields };
