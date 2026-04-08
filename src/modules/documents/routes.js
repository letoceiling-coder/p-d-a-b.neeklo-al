const { saveBufferAsDocument, processDocument } = require("./service");
const { parseFieldsConfigPayload } = require("./extractionUpload");
const { prisma } = require("../../lib/prisma");
const { requireAuth, isElevated } = require("../../middleware/auth");

async function documentsRoutes(fastify) {
  fastify.post(
    "/documents/upload",
    { preHandler: requireAuth },
    async (request, reply) => {
      let fileBuf = null;
      let filename = "";
      /** @type {string | null} */
      let fieldsConfigRaw = null;

      try {
        for await (const part of request.parts()) {
          if (part.type === "file") {
            if (part.fieldname === "file") {
              fileBuf = await part.toBuffer();
              filename = part.filename || "document";
            } else {
              await part.toBuffer();
            }
          } else if (part.fieldname === "fieldsConfig") {
            fieldsConfigRaw =
              part.value != null ? String(part.value) : null;
          }
        }
      } catch (err) {
        request.log.error(err);
        return reply.code(400).send({ error: "Некорректное тело запроса" });
      }

      if (!fileBuf || !filename) {
        return reply.code(400).send({ error: "File is required" });
      }

      const ext = filename.toLowerCase();
      if (!ext.endsWith(".pdf") && !ext.endsWith(".docx")) {
        return reply
          .code(400)
          .send({ error: "Only PDF and DOCX are allowed" });
      }

      const extractionPayload = parseFieldsConfigPayload(fieldsConfigRaw);
      if (
        fieldsConfigRaw &&
        extractionPayload &&
        extractionPayload.fields.length === 0
      ) {
        return reply.code(400).send({
          error: "Укажите хотя бы одно допустимое поле для извлечения"
        });
      }

      try {
        const filePath = await saveBufferAsDocument(fileBuf, filename);
        const doc = await processDocument({
          userId: request.user.id,
          filePath,
          originalName: filename,
          extractionPayload: extractionPayload || undefined
        });

        if (doc && doc.error === "DOCUMENT_UNREADABLE") {
          return reply.code(422).send(doc);
        }

        return reply.code(201).send({
          id: doc.id,
          status: doc.status
        });
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  fastify.get(
    "/documents",
    { preHandler: requireAuth },
    async (request) => {
      const where = isElevated(request.user.role)
        ? {}
        : { userId: request.user.id };
      const docs = await prisma.document.findMany({
        where,
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
    }
  );

  fastify.get(
    "/documents/:id",
    { preHandler: requireAuth },
    async (request, reply) => {
      const doc = await prisma.document.findUnique({
        where: { id: request.params.id }
      });
      if (!doc) return reply.code(404).send({ error: "Document not found" });
      if (!isElevated(request.user.role) && doc.userId !== request.user.id) {
        return reply.code(403).send({ error: "Forbidden" });
      }
      return doc;
    }
  );

  fastify.get(
    "/documents/:id/result",
    { preHandler: requireAuth },
    async (request, reply) => {
      const doc = await prisma.document.findUnique({
        where: { id: request.params.id },
        select: { id: true, userId: true, status: true, extractedJson: true }
      });
      if (!doc) return reply.code(404).send({ error: "Document not found" });
      if (!isElevated(request.user.role) && doc.userId !== request.user.id) {
        return reply.code(403).send({ error: "Forbidden" });
      }

      return {
        documentId: doc.id,
        status: doc.status,
        result: doc.extractedJson || null
      };
    }
  );
}

module.exports = documentsRoutes;
