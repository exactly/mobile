const { include: nodeFiles } = require("./tsconfig.node.json");

/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [
    "universe",
    "eslint:recommended",
    "plugin:@typescript-eslint/strict-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "plugin:@eslint-community/eslint-plugin-eslint-comments/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:perfectionist/recommended-natural-legacy",
    "plugin:prettier/recommended",
    "plugin:promise/recommended",
    "plugin:regexp/recommended",
    "plugin:unicorn/recommended",
  ],
  ignorePatterns: [
    ".expo/",
    "build/",
    "coverage/",
    "dist/",
    "expo-env.d.ts",
    "generated/",
    "public/",
    "server/drizzle/",
  ],
  overrides: [
    {
      extends: [
        "universe/native",
        "plugin:@tanstack/eslint-plugin-query/recommended",
        "plugin:jsx-a11y/recommended",
        "plugin:react/recommended",
        "plugin:react-hooks/recommended",
        "plugin:react-native/all",
      ],
      files: ["src/**"],
      rules: {
        "import/no-unresolved": "off", // handled by bundler
        "import/order": "off", // handled by perfectionist
        "react-native/no-raw-text": [
          "error",
          {
            skip: [
              "ActionButton",
              "Button",
              "Heading",
              "Link",
              "LinkButton",
              "SizableText",
              "SubmitButton",
              "Select.Label",
            ],
          },
        ],
        "unicorn/prefer-top-level-await": "off", // unsupported in react-native
      },
    },
    {
      extends: ["universe/node", "plugin:n/recommended", "plugin:drizzle/all"],
      files: [...nodeFiles, "server/**"],
      rules: {
        "drizzle/enforce-delete-with-where": ["error", { drizzleObjectName: "database" }],
        "drizzle/enforce-update-with-where": ["error", { drizzleObjectName: "database" }],
        "import/no-unresolved": "off", // handled by bundler
        "import/order": "off", // handled by perfectionist
        "n/no-missing-import": "off", // handled by bundler
        "unicorn/prefer-top-level-await": "off", // unsupported in cjs
      },
    },
    {
      files: ["**/*.cjs"],
      rules: { "@typescript-eslint/no-require-imports": "off" },
    },
    {
      extends: ["plugin:@vitest/legacy-all"],
      files: ["server/test/**"],
      rules: {
        "@vitest/no-hooks": "off",
        "@vitest/prefer-expect-assertions": [
          "warn",
          { onlyFunctionsWithExpectInCallback: true, onlyFunctionsWithExpectInLoop: true },
        ],
      },
    },
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: { project: ["tsconfig.json", "tsconfig.node.json", "server/tsconfig.json"] },
  rules: {
    "@eslint-community/eslint-comments/no-unused-disable": "error",
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-import-type-side-effects": "error",
    "@typescript-eslint/no-shadow": "error",
    "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    "import/order": "off", // handled by perfectionist
    "import/prefer-default-export": "error",
    "no-console": "warn",
    "no-restricted-imports": ["error", { patterns: ["./server/"] }],
    "no-shadow": "off", // @typescript-eslint/no-shadow
    "promise/always-return": ["error", { ignoreLastCallback: true }],
    "unicorn/filename-case": "off", // use default export name
    "unicorn/no-null": "off", // part of multiple apis
    "unicorn/no-useless-undefined": ["error", { checkArrowFunctionBody: false }], // @typescript-eslint/no-empty-function
    "unicorn/number-literal-case": "off", // incompatible with prettier
    "unicorn/switch-case-braces": ["error", "avoid"], // consistently avoid braces
  },
  settings: { "import/resolver": "typescript", react: { version: "detect" } },
};
