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
    "plugin:@typescript-eslint/stylistic-type-checked",
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
    "unicorn/filename-case": "off", // use default export name
    "unicorn/no-useless-undefined": ["error", { checkArrowFunctionBody: false }], // @typescript-eslint/no-empty-function
    "unicorn/number-literal-case": "off", // incompatible with prettier
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
      rules: {
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
        "import/no-unresolved": "off", // handled by bundler
        "unicorn/prefer-top-level-await": "off", // unsupported in react-native
      },
    },
    {
      files: [...nodeFiles, "server/**"],
      extends: ["universe/node", "plugin:n/recommended", "plugin:drizzle/all"],
      rules: {
        "drizzle/enforce-delete-with-where": ["error", { drizzleObjectName: "database" }],
        "drizzle/enforce-update-with-where": ["error", { drizzleObjectName: "database" }],
        "import/no-unresolved": "off", // handled by bundler
        "n/no-missing-import": "off", // handled by bundler
        "unicorn/prefer-top-level-await": "off", // unsupported in cjs
      },
    },
    {
      files: ["**/*.cjs"],
      rules: { "@typescript-eslint/no-require-imports": "off" },
    },
    {
      files: ["server/test/**"],
      extends: ["plugin:@vitest/legacy-all"],
      rules: {
        "@vitest/no-hooks": "off",
        "@vitest/prefer-expect-assertions": [
          "warn",
          { onlyFunctionsWithExpectInLoop: true, onlyFunctionsWithExpectInCallback: true },
        ],
      },
    },
  ],
  ignorePatterns: [".expo/", "build/", "dist/", "expo-env.d.ts", "generated/", "public/", "server/drizzle/"],
};
