import tseslint from "typescript-eslint";
export default tseslint.config(...tseslint.configs.recommended, {
  files: ["backend/src/**/*.ts", "frontend/src/**/*.ts", "frontend/src/**/*.tsx"],
  rules: { "@typescript-eslint/no-explicit-any": "off", "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }] },
}, { ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**"] });
