const fs = require("fs/promises");
const mammoth = require("mammoth");
const { extractPDF } = require("./pdfExtract");

function fixEncoding(text) {
  if (!text) return text;

  return Buffer.from(text, "binary").toString("utf8");
}

async function parsePdf(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  const text = await extractPDF(fileBuffer);
  return (text || "").trim();
}

async function parseDocx(filePath) {
  const parsed = await mammoth.extractRawText({ path: filePath });
  const text = fixEncoding((parsed.value || "").trim());
  console.log("TEXT PREVIEW FIXED:", (text || "").slice(0, 200));
  return text;
}

module.exports = { parsePdf, parseDocx };
