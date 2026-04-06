const fs = require("fs/promises");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

async function parsePdf(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  const parsed = await pdfParse(fileBuffer);
  return (parsed.text || "").trim();
}

async function parseDocx(filePath) {
  const parsed = await mammoth.extractRawText({ path: filePath });
  return (parsed.value || "").trim();
}

module.exports = { parsePdf, parseDocx };
