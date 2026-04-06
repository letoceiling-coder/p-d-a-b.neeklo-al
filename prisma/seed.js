/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("123123123", 10);

  const extractionDefaults = [
    { key: "inn", name: "ИНН", type: "STRING", isDefault: true },
    {
      key: "amount",
      name: "Сумма контракта",
      type: "NUMBER",
      isDefault: true
    },
    { key: "start_date", name: "Дата начала", type: "DATE", isDefault: true },
    {
      key: "end_date",
      name: "Дата окончания",
      type: "DATE",
      isDefault: true
    },
    {
      key: "payment_terms",
      name: "Условия оплаты",
      type: "STRING",
      isDefault: true
    }
  ];

  for (const ef of extractionDefaults) {
    await prisma.extractionField.upsert({
      where: { key: ef.key },
      update: {
        name: ef.name,
        type: ef.type,
        isDefault: true,
        createdByUser: false
      },
      create: {
        key: ef.key,
        name: ef.name,
        type: ef.type,
        isDefault: true,
        createdByUser: false
      }
    });
  }

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
