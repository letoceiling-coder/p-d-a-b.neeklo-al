const fs = require("fs/promises");
const path = require("path");
const { prisma } = require("../../lib/prisma");
const { parsePdf, parseDocx } = require("../../lib/parsers");
const { extractFields } = require("../../lib/ollama");

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "documents");

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

function getExt(filename = "") {
  return path.extname(filename).toLowerCase();
}

function getParserByExt(ext) {
  if (ext === ".pdf") return parsePdf;
  if (ext === ".docx") return parseDocx;
  throw new Error("Unsupported file type. Only PDF and DOCX are allowed.");
}

async function saveIncomingFile(part) {
  await ensureUploadDir();
  const ext = getExt(part.filename);
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const filePath = path.join(UPLOAD_DIR, safeName);
  const buf = await part.toBuffer();
  await fs.writeFile(filePath, buf);
  return filePath;
}

async function processDocument({ userId, filePath, originalName }) {
  const parser = getParserByExt(getExt(originalName));
  const text = await parser(filePath);

  const created = await prisma.document.create({
    data: {
      userId,
      filePath,
      text,
      status: "PROCESSING"
    }
  });

  try {
    const extracted = await extractFields(text);
    const updated = await prisma.document.update({
      where: { id: created.id },
      data: {
        extractedJson: extracted,
        status: "DONE"
      }
    });
    return updated;
  } catch (error) {
    await prisma.document.update({
      where: { id: created.id },
      data: { status: "FAILED" }
    });
    throw error;
  }
}

module.exports = {
  saveIncomingFile,
  processDocument
};
