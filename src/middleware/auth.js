async function requireAuth(request, reply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "Unauthorized" });
  }
}

function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return async function requireRoleHandler(request, reply) {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({ error: "Forbidden" });
    }
  };
}

function isElevated(role) {
  return role === "ADMIN" || role === "DEVELOPER";
}

module.exports = { requireAuth, requireRole, isElevated };
