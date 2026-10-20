import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Agent worktrees under .claude/ are separate checkouts with their own lint runs.
  { ignores: ["**/dist/**", "**/coverage/**", ".claude/worktrees/**"] },
  js.configs.recommended,
  tseslint.configs.recommended,
);
