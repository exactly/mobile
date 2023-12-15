const { include: nodeFiles } = require("./tsconfig.node.json");

/** @type {import('eslint').Linter.Config} */
module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: { project: ["tsconfig.json", "tsconfig.node.json", "pomelo/tsconfig.json", "webauthn/tsconfig.json"] },
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
    "plugin:unicorn/recommended",
  ],
  rules: {
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-import-type-side-effects": "error",
    "@typescript-eslint/no-shadow": "error",
    "eslint-comments/no-unused-disable": "error",
    "import/prefer-default-export": "error",
    "no-console": "error",
    "no-shadow": "off", // @typescript-eslint/no-shadow
    "react-native/no-raw-text": ["error", { skip: ["Button"] }],
    "unicorn/filename-case": "off", // use default export name
    "unicorn/prefer-top-level-await": "off", // unsupported in react-native
  },
  ignorePatterns: ["build/", "dist/", ".expo/types/**/*.ts", "expo-env.d.ts", "contracts/lib/"],
  overrides: [
    {
      files: [...nodeFiles, "pomelo/**"],
      extends: ["plugin:node/recommended"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
        "node/no-missing-import": "off",
        "node/no-unpublished-import": "off",
        "node/no-unsupported-features/es-syntax": ["error", { ignores: ["modules", "dynamicImport"] }],
        "unicorn/prefer-module": "off",
      },
    },
  ],
};
