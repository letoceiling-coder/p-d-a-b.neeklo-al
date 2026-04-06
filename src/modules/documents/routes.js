const {
  saveIncomingFile,
  processDocument
} = require("./service");
const { prisma } = require("../../lib/prisma");

async function documentsRoutes(fastify) {
  fastify.post("/documents/upload", async (request, reply) => {
    const part = await request.file();
    if (!part) {
      return reply.code(400).send({ error: "File is required" });
    }

    const ext = (part.filename || "").toLowerCase();
    if (!ext.endsWith(".pdf") && !ext.endsWith(".docx")) {
      return reply
        .code(400)
        .send({ error: "Only PDF and DOCX are allowed" });
    }

    try {
      const filePath = await saveIncomingFile(part);
      const userId = request.headers["x-user-id"] || "mvp-user";

      const doc = await processDocument({
        userId: String(userId),
        filePath,
        originalName: part.filename
      });

      return reply.code(201).send({
        id: doc.id,
        status: doc.status
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: error.message });
    }
  });

  fastify.get("/documents", async () => {
    const docs = await prisma.document.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        filePath: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });
    return { items: docs };
  });

  fastify.get("/documents/:id", async (request, reply) => {
    const doc = await prisma.document.findUnique({
      where: { id: request.params.id }
    });
    if (!doc) return reply.code(404).send({ error: "Document not found" });
    return doc;
  });

  fastify.get("/documents/:id/result", async (request, reply) => {
    const doc = await prisma.document.findUnique({
      where: { id: request.params.id },
      select: { id: true, status: true, extractedJson: true }
    });
    if (!doc) return reply.code(404).send({ error: "Document not found" });

    return {
      documentId: doc.id,
      status: doc.status,
      result: doc.extractedJson || null
    };
  });
}

module.exports = documentsRoutes;
