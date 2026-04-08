"use strict";

let pdfjsLibPromise = null;
const { extractPdfViaOCR } = require("./pdfOcr");

async function getPdfJsLib() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfjsLibPromise;
}

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

function isGoodText(text) {
  if (!text) return false;

  if (text.length < 200) return false;

  const ru = (text.match(/[а-яА-Я]/g) || []).length;
  const bad = (text.match(/[�ÐÑ¥%]/g) || []).length;

  const ruRatio = ru / text.length;
  const badRatio = bad / text.length;

  console.log("TEXT QUALITY:", {
    length: text.length,
    ruRatio,
    badRatio
  });

  if (ruRatio < 0.2) return false;
  if (badRatio > 0.05) return false;

  return true;
}

async function extractPDF(buffer) {
  const pdfjsLib = await getPdfJsLib();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item.str);
    fullText += strings.join(" ") + "\n";
  }

  console.log("FORCE OCR MODE");
  const parsed = null;
  void parsed;

  const ocr = await extractPdfViaOCR(buffer);
  console.log("OCR TEXT PREVIEW:", (ocr || "").slice(0, 200));
  console.log("OCR TEXT FULL PREVIEW:", (ocr || "").slice(0, 500));
  return ocr;
}

module.exports = { extractPDF };

