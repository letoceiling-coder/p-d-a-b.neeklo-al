const fs = require("fs/promises");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

function fixEncoding(text) {
  if (!text) return text;

  return Buffer.from(text, "binary").toString("utf8");
}

async function parsePdf(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  const parsed = await pdfParse(fileBuffer);
  const text = fixEncoding((parsed.text || "").trim());
  console.log("TEXT PREVIEW FIXED:", (text || "").slice(0, 200));
  return text;
}

async function parseDocx(filePath) {
  const parsed = await mammoth.extractRawText({ path: filePath });
  const text = fixEncoding((parsed.value || "").trim());
  console.log("TEXT PREVIEW FIXED:", (text || "").slice(0, 200));
  return text;
}

module.exports = { parsePdf, parseDocx };
