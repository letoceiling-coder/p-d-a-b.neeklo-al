const Fastify = require("fastify");
const cors = require("@fastify/cors");
const fp = require("fastify-plugin");
const multipart = require("@fastify/multipart");
const jwt = require("@fastify/jwt");
const authRoutes = require("./modules/auth/routes");
const usersRoutes = require("./modules/users/routes");
const documentsRoutes = require("./modules/documents/routes");
const { callAI } = require("./lib/aiClient");

async function buildApp() {
  const app = Fastify({ logger: true });

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is required");
  }

  if (!process.env.AI_API_KEY) {
    throw new Error("AI_API_KEY environment variable is required");
  }

  await app.register(jwt, {
    secret: jwtSecret,
    sign: { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  });

  await app.register(cors, {
    origin: true,
    credentials: true
  });

  await app.register(
    fp(async function multipartRoot(f) {
      await f.register(multipart, {
        limits: { fileSize: 20 * 1024 * 1024 }
      });
    })
  );

  await authRoutes(app);
  await usersRoutes(app);
  await documentsRoutes(app);

  app.get("/health", async () => ({ ok: true }));

  app.get("/test-ai", async (request, reply) => {
    const assistantId = process.env.AI_ASSISTANT_ID;
    if (!assistantId) {
      return reply.code(503).send({
        ok: false,
        error: "AI_ASSISTANT_ID is not configured"
      });
    }

    const q = request.query;
    const message =
      typeof q.message === "string" && q.message.trim()
        ? q.message.trim()
        : "Ответь одним JSON-объектом: {\"ping\":\"ok\"} без пояснений.";

    try {
      const data = await callAI(message, assistantId);
      return { ok: true, message, response: data };
    } catch (err) {
      request.log.error(err);
      return reply.code(502).send({
        ok: false,
        error: err instanceof Error ? err.message : "AI request failed"
      });
    }
  });

  return app;
}

module.exports = { buildApp };
