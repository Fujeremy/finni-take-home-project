import { existsSync } from "node:fs";
import path from "node:path";
import { createApp } from "./app.js";
import { createDb } from "./db/knex.js";
import { loadRootEnvFile, readRequiredEnv } from "./env.js";

loadRootEnvFile();

const port = Number(readRequiredEnv("PORT"));
if (!Number.isInteger(port)) {
  throw new Error(`PORT must be a whole number, but it is "${process.env.PORT}".`);
}

// Two levels up from both src/ (tsx) and dist/ (node) is the repository root.
const builtClientPath = path.resolve(import.meta.dirname, "../../client/dist");
const hasBuiltClient = existsSync(path.join(builtClientPath, "index.html"));

const db = createDb(readRequiredEnv("DATABASE_URL"));
const app = createApp(db, { builtClientPath: hasBuiltClient ? builtClientPath : undefined });

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
  if (hasBuiltClient) {
    console.log(`Serving the built client at http://localhost:${port}`);
  }
});
