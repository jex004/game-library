module.exports = {
  root: true, // <-- ADD THIS LINE
  env: {
    es2021: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  parserOptions: {
    ecmaVersion: "latest",
  },
  rules: {
    quotes: ["error", "double"],
  },
};