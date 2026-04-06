require("dotenv/config");
const { buildApp } = require("./app");

const port = Number(process.env.PORT || 3000);
const host = "0.0.0.0";

async function start() {
  const app = buildApp();
  try {
    await app.listen({ port, host });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
