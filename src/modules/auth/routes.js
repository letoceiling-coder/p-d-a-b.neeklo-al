const bcrypt = require("bcrypt");
const { prisma } = require("../../lib/prisma");

const userPublicSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true
};

async function authRoutes(fastify) {
  fastify.post("/auth/register", async (request, reply) => {
    const body = request.body || {};
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!email || !password || !name) {
      return reply
        .code(400)
        .send({ error: "email, password and name are required" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({ error: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name, role: "USER" },
      select: userPublicSelect
    });

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role
    });

    return reply.code(201).send({ token, user });
  });

  fastify.post("/auth/login", async (request, reply) => {
    const body = request.body || {};
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return reply.code(400).send({ error: "email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.code(401).send({ error: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return reply.code(401).send({ error: "Invalid email or password" });
    }

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role
    });

    const { password: _p, ...publicUser } = user;
    return { token, user: publicUser };
  });
}

module.exports = authRoutes;
