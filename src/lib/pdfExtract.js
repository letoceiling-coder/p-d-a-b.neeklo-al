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

function isTextBroken(text) {
  if (!text) return true;

  const badChars = (text.match(/[�ÐÑ]/g) || []).length;
  const ratio = badChars / text.length;

  return ratio > 0.05;
}

function detectBadText(text) {
  if (!text) return true;

  const badChars = (text.match(/[�ÐÑ¥%]/g) || []).length;
  const ratio = badChars / text.length;

  if (ratio > 0.1) return true;
  if (!/[а-яА-Я]/.test(text)) return true;

  return false;
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

  const text = fixMojibake(fullText);
  if (isTextBroken(text)) {
    console.log("PDF TEXT BROKEN → USING OCR");
    const ocrText = await extractPdfViaOCR(buffer);
    console.log("OCR TEXT PREVIEW:", (ocrText || "").slice(0, 200));
    if (detectBadText(ocrText)) {
      console.log("DOCUMENT UNREADABLE");
      return {
        __error: "DOCUMENT_UNREADABLE",
        text: ocrText
      };
    }
    return ocrText;
  }
  console.log("PDF TEXT PREVIEW:", text.slice(0, 300));
  console.log("TEXT AFTER FIX:", text.slice(0, 200));
  return text;
}

module.exports = { extractPDF };

