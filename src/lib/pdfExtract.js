"use strict";

let pdfjsLibPromise = null;

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
  console.log("PDF TEXT PREVIEW:", text.slice(0, 300));
  console.log("TEXT AFTER FIX:", text.slice(0, 200));
  return text;
}

module.exports = { extractPDF };

