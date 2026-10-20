import path from "node:path";

const rootEnvPath = path.resolve(import.meta.dirname, "../../.env");

// Variables already set in the shell take precedence; a missing .env file is
// fine as long as the required variables come from somewhere.
export function loadRootEnvFile(): void {
  try {
    process.loadEnvFile(rootEnvPath);
  } catch (error) {
    const isMissingFile = error instanceof Error && "code" in error && error.code === "ENOENT";
    if (!isMissingFile) {
      throw error;
    }
  }
}

export function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env at the repository root.`);
  }
  return value;
}
