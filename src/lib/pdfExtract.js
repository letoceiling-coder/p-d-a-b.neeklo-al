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

  const parsed = fixMojibake(fullText);
  console.log("PDF TEXT PREVIEW:", parsed.slice(0, 300));
  console.log("TEXT AFTER FIX:", parsed.slice(0, 200));

  if (isGoodText(parsed)) {
    console.log("PDF OK");
    return parsed;
  }

  console.log("PDF BAD → TRY OCR");

  const ocr = await extractPdfViaOCR(buffer);
  console.log("OCR TEXT PREVIEW:", (ocr || "").slice(0, 200));
  console.log("TEXT AFTER FIX:", (ocr || "").slice(0, 200));

  if (isGoodText(ocr)) {
    console.log("OCR OK");
    return ocr;
  }

  console.log("DOCUMENT UNREADABLE");
  return {
    __error: "DOCUMENT_UNREADABLE"
  };
}

module.exports = { extractPDF };

