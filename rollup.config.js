// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import babel from '@rollup/plugin-babel';
import pkg from './package.json' assert { type: 'json' }; // برای خواندن اطلاعات از package.json

const input = 'src/LazyLoad.js';
const libraryName = 'LazyLoad'; // نامی که در UMD/IIFE به window اضافه می‌شود

// بررسی اینکه آیا در حالت production هستیم (از طریق متغیر محیطی)
const isProduction = process.env.NODE_ENV === 'production';

// تنظیمات Babel (اگر از Babel استفاده می‌کنید)
const babelOptions = {
  babelHelpers: 'bundled', // 'runtime' یا 'bundled' یا 'inline'
  exclude: 'node_modules/**', // فقط فایل‌های خودمان را transpile کن
  presets: [
    [
      '@babel/preset-env',
      {
        // targets بر اساس browserslist در package.json خواهد بود
        // یا می‌توانید targets را اینجا به صورت دستی مشخص کنید:
        // targets: { browsers: ['last 2 versions', 'ie >= 11'] },
        // useBuiltIns: 'usage', // 'usage' یا 'entry' یا false
        // corejs: 3, // نسخه core-js برای polyfill ها
        modules: false, // Babel را از تبدیل ماژول‌های ES منع می‌کند تا Rollup این کار را انجام دهد
      },
    ],
  ],
  // plugins: [] // پلاگین‌های اضافی Babel در صورت نیاز
};

const banner = `/*!
 * ${pkg.name} v${pkg.version}
 * ${pkg.description}
 * (c) ${new Date().getFullYear()} ${pkg.author.name} (${pkg.author.url})
 * Repository: ${pkg.repository.url}
 * License: ${pkg.license}
 */`;

export default [
  // 1. ES Module (ESM) build
  // - برای bundlerهای مدرن (Webpack, Parcel, Rollup)
  // - Tree-shaking را حفظ می‌کند
  {
    input: input,
    output: {
      file: pkg.module, // 'dist/lazyload-plus.esm.js'
      format: 'es',
      sourcemap: !isProduction ? 'inline' : false,
      banner: banner,
    },
    plugins: [
      resolve(), // برای پیدا کردن ماژول‌ها در node_modules
      commonjs(), // برای تبدیل ماژول‌های CommonJS به ES6 (اگر وابستگی CommonJS دارید)
      // babel(babelOptions), // اگر نیاز به transpile دارید
    ],
    // وابستگی‌های خارجی را مشخص کنید تا در باندل نهایی قرار نگیرند (اگر دارید)
    // external: [],
  },

  // 2. Universal Module Definition (UMD) build
  // - برای CommonJS (Node.js), AMD و browser globals
  // - نیاز به یک نام گلوبال دارد (libraryName)
  {
    input: input,
    output: {
      file: pkg.main, // 'dist/lazyload-plus.umd.js'
      format: 'umd',
      name: libraryName, // نام گلوبال: window.LazyLoad
      sourcemap: !isProduction ? 'inline' : false,
      banner: banner,
      globals: {
        // اگر وابستگی خارجی دارید که باید به صورت گلوبال در UMD در دسترس باشد:
        // 'jquery': '$'
      },
    },
    plugins: [
      resolve(),
      commonjs(),
      babel(babelOptions), // معمولاً برای UMD نیاز به transpile برای سازگاری بیشتر است
    ],
    // external: [],
  },

  // 3. Minified UMD build (برای فیلد 'browser' یا استفاده مستقیم در <script>)
  //    این بیلد معمولاً همان UMD است با terser فعال شده
  {
    input: input,
    output: {
      file: pkg.browser, // 'dist/lazyload-plus.min.js'
      format: 'umd', // یا 'iife' اگر فقط برای مرورگر است و نیازی به AMD/CommonJS نیست
      name: libraryName,
      sourcemap: isProduction ? true : false, // سورس‌مپ برای نسخه minified در production مفید است
      banner: banner,
      globals: {
        // 'jquery': '$'
      },
    },
    plugins: [
      resolve(),
      commonjs(),
      babel(babelOptions),
      isProduction && terser({ // فقط در production اجرا شود
        output: {
          comments: function (node, comment) {
            // حفظ کامنت banner
            if (comment.type === "comment2" || comment.type === "comment1") {
              return /@preserve|@license|@cc_on/i.test(comment.value) || comment.value.startsWith('!');
            }
            return false;
          },
        },
        compress: {
          drop_console: true, // حذف console.log در نسخه minified
        }
      }),
    ].filter(Boolean), // حذف پلاگین‌های false (مانند terser در حالت non-production)
    // external: [],
  },
];
