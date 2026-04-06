/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("123123123", 10);

  const user = await prisma.user.upsert({
    where: { email: "dsc-23@yandex.ru" },
    update: {
      password: hash,
      name: "Джон Уик",
      role: "DEVELOPER"
    },
    create: {
      email: "dsc-23@yandex.ru",
      password: hash,
      name: "Джон Уик",
      role: "DEVELOPER"
    }
  });

  const reassigned = await prisma.document.updateMany({
    where: { userId: "mvp-user" },
    data: { userId: user.id }
  });

  console.log("Seed OK:", user.email, user.role, "mvp-user docs:", reassigned.count);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
