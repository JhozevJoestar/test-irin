module.exports = {
  root: true,
  env: { node: true, browser: true, es2022: true, jest: true },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['dist', 'node_modules'],
  rules: { '@typescript-eslint/no-explicit-any': 'error' },
};
