const { include: nodeFiles } = require("./tsconfig.node.json");

/** @type {import('eslint').Linter.Config} */
module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: { project: ["tsconfig.json", "tsconfig.node.json", "server/tsconfig.json"] },
  settings: { react: { version: "detect" }, "import/resolver": "typescript" },
  extends: [
    "universe",
    "eslint:recommended",
    "plugin:@typescript-eslint/strict-type-checked",
    "plugin:eslint-comments/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:prettier/recommended",
    "plugin:unicorn/recommended",
  ],
  rules: {
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-import-type-side-effects": "error",
    "@typescript-eslint/no-shadow": "error",
    "eslint-comments/no-unused-disable": "error",
    "import/prefer-default-export": "error",
    "no-console": "warn",
    "no-restricted-imports": ["error", { patterns: ["./server/"] }],
    "no-shadow": "off", // @typescript-eslint/no-shadow
    "react-native/no-raw-text": [
      "error",
      { skip: ["Button", "Link", "SubmitButton", "LinkButton", "Heading", "SizableText", "ActionButton"] },
    ],
    "unicorn/filename-case": "off", // use default export name
    "unicorn/number-literal-case": "off", // incompatible with prettier
    "unicorn/prefer-top-level-await": "off", // unsupported in react-native
    "unicorn/switch-case-braces": ["error", "avoid"], // consistently avoid braces
  },
  overrides: [
    {
      files: ["src/**"],
      extends: [
        "universe/native",
        "plugin:react/recommended",
        "plugin:react-hooks/recommended",
        "plugin:react-native/all",
      ],
    },
    {
      files: [...nodeFiles, "server/**"],
      extends: ["plugin:node/recommended"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
        "node/no-missing-import": "off",
        "node/no-unpublished-import": "off",
        "node/no-unsupported-features/es-syntax": ["error", { ignores: ["modules", "dynamicImport"] }],
        "node/no-unpublished-require": "off",
        "unicorn/prefer-module": "off",
      },
    },
  ],
  ignorePatterns: [
    ".expo/types/**/*.ts",
    "build/",
    "dist/",
    "expo-env.d.ts",
    "generated/",
    "public/",
    "server/app/",
    "server/drizzle/",
  ],
};
