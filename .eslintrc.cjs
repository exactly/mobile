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
    "plugin:@eslint-community/eslint-plugin-eslint-comments/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:prettier/recommended",
    "plugin:unicorn/recommended",
  ],
  rules: {
    "@eslint-community/eslint-comments/no-unused-disable": "error",
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-import-type-side-effects": "error",
    "@typescript-eslint/no-shadow": "error",
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
      extends: ["plugin:n/recommended"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
        "n/no-missing-import": "off",
        "n/no-unpublished-import": "off",
        "n/no-unsupported-features/es-syntax": ["error", { ignores: ["modules", "dynamicImport"] }],
        "n/no-unpublished-require": "off",
        "unicorn/prefer-module": "off",
      },
    },
  ],
  ignorePatterns: [".expo/", "build/", "dist/", "expo-env.d.ts", "generated/", "public/", "server/drizzle/"],
};
