"use strict";

const Tesseract = require("tesseract.js");

async function extractPdfViaOCR(buffer) {
  const { data } = await Tesseract.recognize(buffer, "rus+eng");
  return data.text;
}

module.exports = { extractPdfViaOCR };

