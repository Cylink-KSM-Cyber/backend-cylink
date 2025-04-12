module.exports = {
  root: true,
  env: {
    node: true,
    jest: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
    createDefaultProgram: true,
  },
  plugins: ['@typescript-eslint', 'import', 'promise', 'node'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:promise/recommended',
    'plugin:node/recommended',
    'prettier',
  ],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
      node: {
        version: '>=16.0.0',
        extensions: ['.js', '.ts'],
        moduleDirectory: ['node_modules', 'src/'],
      },
    },
    node: {
      version: '>=16.0.0',
      tryExtensions: ['.js', '.ts', '.json'],
      resolvePaths: ['src/'],
    },
  },
  rules: {
    // General rules
    'no-console': 'warn',
    'no-return-await': 'off',

    // Node rules
    'node/no-missing-import': 'off',
    'node/no-missing-require': 'off',
    'node/no-unsupported-features/es-syntax': 'off',
    'node/no-unsupported-features/node-builtins': 'off',
    'node/no-unpublished-import': 'off',
    'node/no-unpublished-require': 'off',
    'node/exports-style': 'off',

    // TypeScript specific rules
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/no-var-requires': 'off', // Allow requires for CommonJS compatibility

    // Import rules
    'import/no-unresolved': 'off', // TypeScript takes care of this
    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],

    // Promise rules
    'promise/always-return': 'warn',
    'promise/catch-or-return': 'error',

    // Disable rules that are too strict for this project
    'no-process-exit': 'off',
    'no-empty': 'warn',
  },
  ignorePatterns: [
    'dist/**',
    '.dist/**',
    'build/**',
    'coverage/**',
    'node_modules/**',
    'src/__tests__/**',
    'jest.config.js',
    '*.md',
    '*.log',
    '.eslintrc.js',
  ],
  overrides: [
    {
      files: ['**/__tests__/**/*', '**/*.test.ts'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'node/no-unpublished-import': 'off',
      },
    },
  ],
};
