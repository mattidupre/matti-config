module.exports = {
  root: true,
  env: {
    node: true,
  },
  overrides: [
    {
      files: ['./src/**/*.ts'],
      plugins: [
        '@typescript-eslint/eslint-plugin',
        'eslint-plugin-filenames',
        'eslint-plugin-import',
      ],
      extends: [
        'eslint-config-airbnb-base',
        'eslint-config-airbnb-typescript/base',
        'prettier',
      ],
      parserOptions: {
        ecmaVersion: 'esnext',
        sourceType: 'module',
        project: ['./tsconfig.json'],
      },
      parser: '@typescript-eslint/parser',
    },
  ],
};
