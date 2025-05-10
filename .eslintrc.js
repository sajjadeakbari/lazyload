// .eslintrc.js
module.exports = {
  root: true, // مهم: ESLint از جستجوی فایل‌های کانفیگ در پوشه‌های والد جلوگیری می‌کند
  env: {
    browser: true,
    es2021: true,
    node: true, // برای فایل‌های کانفیگ و اسکریپت‌ها
    'vitest-globals/env': true, // فعال کردن گلوبال‌های Vitest
  },
  extends: [
    'eslint:recommended',
    'plugin:import/recommended',
    'plugin:vitest-globals/recommended', // استفاده از قوانین پیشنهادی Vitest globals
    'prettier', // همیشه آخر برای override کردن قوانین استایلینگ ESLint
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [
    'import',
    'vitest', // پلاگین Vitest (اگر قوانین خاص بیشتری از آن می‌خواهید)
    'prettier'
  ],
  rules: {
    'prettier/prettier': 'warn', // نمایش هشدارهای Prettier به عنوان هشدارهای ESLint

    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': process.env.NODE_ENV === 'production' ? ['warn', { allow: ['warn', 'error'] }] : 'off', // در production فقط warn و error مجاز است
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    eqeqeq: ['error', 'always', { null: 'ignore' }], // همیشه === مگر برای null
    curly: ['warn', 'multi-line', 'consistent'],

    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
        pathGroups: [
          {
            pattern: '@/**',
            group: 'internal',
            position: 'before',
          },
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'import/no-unresolved': 'off', // برای سادگی فعلاً خاموش، با alias ها نیاز به تنظیمات resolver دارد
    'import/prefer-default-export': 'off',
    
    // Vitest specific rules (optional, if you use eslint-plugin-vitest)
    // 'vitest/no-disabled-tests': 'warn',
    // 'vitest/no-focused-tests': 'warn',
    // 'vitest/expect-expect': 'error',
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.mjs'],
      },
    },
  },
  overrides: [
    {
      files: ['**/tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
      env: {
        'vitest-globals/env': true, // اطمینان از فعال بودن برای فایل‌های تست
         node: true, // تست‌ها در محیط Node اجرا می‌شوند
      },
      // rules: {
      //   // Specific rules for test files if needed
      // }
    },
    {
      // برای فایل‌های کانفیگ در ریشه پروژه و اسکریپت‌ها
      files: ['./*.js', './*.mjs', './scripts/**/*.js'],
      env: { node: true, browser: false, es2021: true },
      parserOptions: { sourceType: 'script' }, // برخی فایل‌های کانفیگ ممکن است ماژول نباشند
      rules: {
        'import/order': 'off', // ممکن است در فایل‌های کانفیگ ترتیب import مهم نباشد
      }
    }
  ],
};
