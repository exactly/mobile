const { include: nodeFiles } = require("./tsconfig.node.json");

/** @type {import('eslint').Linter.Config} */
module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: { project: ["tsconfig.json", "tsconfig.node.json"] },
  settings: { react: { version: "detect" }, "import/resolver": "typescript" },
  extends: [
    "universe/native",
    "eslint:recommended",
    "plugin:@typescript-eslint/strict-type-checked",
    "plugin:eslint-comments/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:prettier/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:react-native/all",
  ],
  rules: {
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-import-type-side-effects": "error",
    "@typescript-eslint/no-shadow": "error",
    "eslint-comments/no-unused-disable": "error",
    "no-console": "error",
    "no-shadow": "off", // @typescript-eslint/no-shadow
  },
  ignorePatterns: ["build/", "dist/", ".expo/types/**/*.ts", "expo-env.d.ts"],
  overrides: [
    {
      files: nodeFiles,
      extends: ["plugin:node/recommended"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
        "node/no-missing-import": ["error", { tryExtensions: [".ts", ".js"] }],
        "node/no-unpublished-import": "off",
        "node/no-unsupported-features/es-syntax": ["error", { ignores: ["modules", "dynamicImport"] }],
      },
    },
  ],
};
