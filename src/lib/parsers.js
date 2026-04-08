const fs = require("fs/promises");
const mammoth = require("mammoth");
const { extractPDF } = require("./pdfExtract");

function fixMojibake(text) {
  if (!text) return text;

  if (text.includes("Ð") || text.includes("Ñ")) {
    try {
      return Buffer.from(text, "latin1").toString("utf8");
    } catch (e) {
      console.error("MOJIBAKE FIX ERROR:", e.message);
      return text;
    }
  }

  return text;
}

async function parsePdf(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  const text = await extractPDF(fileBuffer);
  if (text && typeof text === "object" && text.__error === "DOCUMENT_UNREADABLE") {
    return text;
  }
  return (text || "").trim();
}

async function parseDocx(filePath) {
  const parsed = await mammoth.extractRawText({ path: filePath });
  const text = fixMojibake((parsed.value || "").trim());
  console.log("TEXT AFTER FIX:", (text || "").slice(0, 200));
  return text;
}

module.exports = { parsePdf, parseDocx };
