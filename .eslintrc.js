// .eslintrc.js
module.exports = {
  env: {
    browser: true, // متغیرهای گلوبال مرورگر
    es2021: true, // فعال کردن ویژگی‌های ES2021 (مانند globalThis)
    node: true, // متغیرهای گلوبال Node.js و scope (برای فایل‌های کانفیگ و اسکریپت‌ها)
    // 'vitest-globals/env': true, // اگر از Vitest استفاده می‌کنید و می‌خواهید گلوبال‌های آن را بشناسد
  },
  extends: [
    'eslint:recommended', // قوانین پیشنهادی ESLint
    'plugin:import/recommended', // قوانین برای import/export
    // 'plugin:vitest-globals/recommended', // اگر از Vitest استفاده می‌کنید
    'prettier', // خاموش کردن قوانینی که با Prettier تداخل دارند (باید آخرین extends باشد)
  ],
  parserOptions: {
    ecmaVersion: 'latest', // استفاده از آخرین نسخه ECMAScript
    sourceType: 'module', // کد شما از ماژول‌های ES استفاده می‌کند
  },
  plugins: [
    'import', // پلاگین برای lint کردن import/export
    // 'vitest', // اگر از Vitest استفاده می‌کنید
    'prettier', // اجرای Prettier به عنوان یک قانون ESLint (اختیاری، اما مفید)
  ],
  rules: {
    'prettier/prettier': 'warn', // نمایش هشدارهای Prettier به عنوان خطاهای ESLint (یا 'error' برای خطا)

    // === ESLint Best Practices & Overrides ===
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }], // هشدار برای متغیرهای استفاده نشده (با _ شروع شوند نادیده گرفته می‌شوند)
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off', // هشدار برای console.log در production
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off', // هشدار برای debugger در production
    'eqeqeq': ['error', 'always'], // همیشه از === و !== استفاده شود
    'curly': ['error', 'multi-line'], // براکت‌ها برای بلوک‌های چند خطی الزامی است

    // === Import Plugin Rules ===
    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
        pathGroups: [
          {
            pattern: '@/**',
            group: 'internal',
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
    'import/no-unresolved': 'off', // اگر از alias ها یا موارد خاصی استفاده می‌کنید، شاید نیاز به تنظیمات resolver یا خاموش کردن این قانون باشد
    'import/prefer-default-export': 'off', // اجازه به named export ها بدون نیاز به default export

    // می‌توانید قوانین بیشتری را بر اساس نیاز خود اضافه یا تغییر دهید
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.mjs'], // پسوندهایی که import resolver باید بررسی کند
      },
      // می‌توانید resolver های دیگری برای alias ها اضافه کنید (مثلاً با eslint-import-resolver-alias)
    },
  },
  overrides: [ // تنظیمات خاص برای فایل‌های تست
    {
      files: ['**/tests/**/*.js', '**/*.test.js'],
      env: {
        // node: true, // اگر تست‌ها در محیط Node اجرا می‌شوند (که معمولاً با Vitest/Jest همینطور است)
        // jest: true, // اگر از Jest استفاده می‌کنید
        // 'vitest-globals/env': true, // اگر از Vitest استفاده می‌کنید
      },
      // rules: { // قوانین خاص برای فایل‌های تست
      //   'no-undef': 'off', // برای گلوبال‌های تست مانند describe, it
      // }
    }
  ]
};
