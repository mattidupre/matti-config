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
      rules: {
        'prefer-template': 'off',
        'import/prefer-default-export': 'off',
        'class-methods-use-this': 'off',
        'import/order': 'off',
        'max-classes-per-file': 'off',
        'no-restricted-syntax': 'off',
      },
    },
  ],
};
