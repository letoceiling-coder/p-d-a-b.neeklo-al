const fs = require("fs/promises");
const path = require("path");
const { prisma } = require("../../lib/prisma");
const { parsePdf, parseDocx } = require("../../lib/parsers");
const { extractFields } = require("../../lib/ollama");
const { loadFieldDescriptors } = require("./fieldDescriptors");

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
  const buf = await part.toBuffer();
  return saveBufferAsDocument(buf, part.filename || "upload");
}

/**
 * @param {Buffer} buf
 * @param {string} originalName
 * @returns {Promise<string>}
 */
async function saveBufferAsDocument(buf, originalName) {
  await ensureUploadDir();
  const ext = getExt(originalName);
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const filePath = path.join(UPLOAD_DIR, safeName);
  await fs.writeFile(filePath, buf);
  return filePath;
}

function isAiFailurePayload(extracted) {
  if (!extracted || typeof extracted !== "object") return true;
  if (extracted.status === "FAILED") return true;
  if (extracted.error === "AI extraction failed") return true;
  if (extracted.error === "AI unavailable") return true;
  if (extracted.error === "No extraction fields configured") return true;
  if (extracted.fields && typeof extracted.fields === "object") return false;
  if ("inn" in extracted || "amount" in extracted) return false;
  return true;
}

/**
 * @param {object} opts
 * @param {string} opts.userId
 * @param {string} opts.filePath
 * @param {string} opts.originalName
 * @param {{ fields: Array<{ key: string, name: string, type: string }>, extractRisks: boolean } | null} [opts.extractionPayload]
 */
async function processDocument({
  userId,
  filePath,
  originalName,
  extractionPayload = null
}) {
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

  let fieldDescriptors;
  if (
    extractionPayload &&
    Array.isArray(extractionPayload.fields) &&
    extractionPayload.fields.length > 0
  ) {
    fieldDescriptors = extractionPayload.fields;
  } else {
    fieldDescriptors = await loadFieldDescriptors(prisma, null);
  }

  const extractRisks =
    extractionPayload && extractionPayload.extractRisks === false
      ? false
      : true;

  const storedFieldsConfig = {
    fields: fieldDescriptors,
    extractRisks
  };

  const extracted = await extractFields(text, fieldDescriptors, {
    extractRisks
  });
  const failed = isAiFailurePayload(extracted);

  const updated = await prisma.document.update({
    where: { id: created.id },
    data: {
      extractedJson: extracted,
      fieldsConfig: storedFieldsConfig,
      status: failed ? "FAILED" : "DONE"
    }
  });

  return updated;
}

module.exports = {
  saveIncomingFile,
  saveBufferAsDocument,
  processDocument
};
