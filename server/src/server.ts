import { createApp } from "./app.js";
import { createDb } from "./db/knex.js";
import { loadRootEnvFile, readRequiredEnv } from "./env.js";

loadRootEnvFile();

const port = Number(readRequiredEnv("PORT"));
if (!Number.isInteger(port)) {
  throw new Error(`PORT must be a whole number, but it is "${process.env.PORT}".`);
}

const db = createDb(readRequiredEnv("DATABASE_URL"));
const app = createApp(db);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
