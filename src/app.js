const Fastify = require("fastify");
const multipart = require("@fastify/multipart");
const documentsRoutes = require("./modules/documents/routes");

function buildApp() {
  const app = Fastify({ logger: true });

  app.register(multipart, {
    limits: { fileSize: 20 * 1024 * 1024 }
  });
  app.register(documentsRoutes);

  app.get("/health", async () => ({ ok: true }));

  return app;
}

module.exports = { buildApp };
