"use strict";

const Tesseract = require("tesseract.js");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

async function extractPdfViaOCR(buffer) {
  const tmpDir = os.tmpdir();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const pdfPath = path.join(tmpDir, `ocr-src-${id}.pdf`);
  const ppmPrefix = path.join(tmpDir, `ocr-page-${id}`);
  const pngPath = `${ppmPrefix}.png`;

  await fs.writeFile(pdfPath, buffer);
  try {
    await execFileAsync("pdftoppm", ["-png", "-f", "1", "-singlefile", pdfPath, ppmPrefix]);
    const { data } = await Tesseract.recognize(pngPath, "rus+eng");
    return data.text;
  } finally {
    await fs.rm(pdfPath, { force: true }).catch(() => {});
    await fs.rm(pngPath, { force: true }).catch(() => {});
  }
}

module.exports = { extractPdfViaOCR };

