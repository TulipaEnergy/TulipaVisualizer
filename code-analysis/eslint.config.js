import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import complexity from "eslint-plugin-complexity";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json",
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        React: "readonly", // Add React as a global since it's used for types
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
      react: react,
      complexity: complexity,
    },
    rules: {
      // Extend TypeScript recommended rules, but turn off some that conflict
      ...typescript.configs.recommended.rules,
      "@typescript-eslint/no-require-imports": "off",

      // Complexity rules as warnings (not errors)
      complexity: ["warn", { max: 15 }],
      "max-depth": ["warn", { max: 4 }],
      "max-lines": ["warn", { max: 300, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 50, skipComments: true }],
      "max-params": ["warn", { max: 5 }],

      // TypeScript specific rules
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",

      // React specific rules for new JSX transform
      "react/jsx-uses-react": "off", // Not needed with new JSX transform
      "react/jsx-uses-vars": "error",
      "react/react-in-jsx-scope": "off", // Not needed with new JSX transform

      // General code quality (warnings only)
      "no-console": "warn",
      "no-debugger": "warn",
      "prefer-const": "warn",
      "no-var": "warn",
      "no-undef": "off", // TypeScript handles this better
    },
    settings: {
      react: {
        version: "detect",
        jsx: "react-jsx", // Specify the JSX transform
      },
    },
  },
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "src-tauri/target/**",
      "*.config.js",
      "*.config.ts",
    ],
  },
];
