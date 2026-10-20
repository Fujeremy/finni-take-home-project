import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Agent worktrees under .claude/ are separate checkouts with their own lint runs.
  { ignores: ["**/dist/**", "**/coverage/**", ".claude/worktrees/**"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["client/src/**/*.{ts,tsx}"],
    ...reactHooks.configs.flat.recommended,
  },
  {
    rules: {
      // Some signatures need unused arguments, e.g. Express error handlers must take four.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
);
