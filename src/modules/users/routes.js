const bcrypt = require("bcrypt");
const { prisma } = require("../../lib/prisma");
const { requireRole } = require("../../middleware/auth");

const adminOrDev = requireRole(["ADMIN", "DEVELOPER"]);

const ROLES = ["USER", "MANAGER", "ADMIN", "DEVELOPER"];

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true
};

async function usersRoutes(fastify) {
  fastify.get("/users", { preHandler: adminOrDev }, async () => {
    const items = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: userSelect
    });
    return { items };
  });

  fastify.post("/users", { preHandler: adminOrDev }, async (request, reply) => {
    const body = request.body || {};
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const role = typeof body.role === "string" ? body.role.trim() : "";

    if (!email || !password || !name || !role) {
      return reply
        .code(400)
        .send({ error: "email, password, name and role are required" });
    }

    if (!ROLES.includes(role)) {
      return reply.code(400).send({ error: "Invalid role" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({ error: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        role
      },
      select: userSelect
    });

    return reply.code(201).send(user);
  });

  fastify.patch(
    "/users/:id",
    { preHandler: adminOrDev },
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body || {};

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) {
        return reply.code(404).send({ error: "User not found" });
      }

      const data = {};
      if (typeof body.email === "string" && body.email.trim()) {
        data.email = body.email.trim();
        const taken = await prisma.user.findFirst({
          where: { email: data.email, NOT: { id } }
        });
        if (taken) {
          return reply.code(409).send({ error: "Email already in use" });
        }
      }
      if (typeof body.name === "string" && body.name.trim()) {
        data.name = body.name.trim();
      }
      if (typeof body.role === "string" && body.role.trim()) {
        const r = body.role.trim();
        if (!ROLES.includes(r)) {
          return reply.code(400).send({ error: "Invalid role" });
        }
        data.role = r;
      }
      if (typeof body.password === "string" && body.password.length > 0) {
        data.password = await bcrypt.hash(body.password, 10);
      }

      if (Object.keys(data).length === 0) {
        return reply.code(400).send({ error: "No valid fields to update" });
      }

      const user = await prisma.user.update({
        where: { id },
        data,
        select: userSelect
      });

      return user;
    }
  );

  fastify.delete(
    "/users/:id",
    { preHandler: adminOrDev },
    async (request, reply) => {
      const { id } = request.params;

      if (id === request.user.id) {
        return reply.code(400).send({ error: "Cannot delete yourself" });
      }

      try {
        await prisma.user.delete({ where: { id } });
      } catch {
        return reply.code(404).send({ error: "User not found" });
      }

      return reply.code(204).send();
    }
  );
}

module.exports = usersRoutes;
