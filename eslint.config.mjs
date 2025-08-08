export default [
  // Global ignores
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "eslint.config.mjs",
      "jest.config.js"
    ]
  },
  // ESM files
  {
    files: ["**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module"
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": "off"
    }
  },
  // CommonJS files
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script"
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": "off"
    }
  }
];
