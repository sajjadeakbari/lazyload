// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import babel from '@rollup/plugin-babel';
import replace from '@rollup/plugin-replace';
import { visualizer } from 'rollup-plugin-visualizer'; // برای تحلیل باندل
import pkg from './package.json' assert { type: 'json' };

const input = 'src/LazyLoad.js';
const libraryName = 'LazyLoad'; // نام گلوبال در UMD/IIFE

const isProduction = process.env.NODE_ENV === 'production';
const analyzeBundle = process.env.ANALYZE_BUNDLE === 'true';

// تنظیمات Babel (سازگار با browserslist از package.json)
const babelOptions = {
  babelHelpers: 'bundled',
  exclude: 'node_modules/**',
  presets: [
    [
      '@babel/preset-env',
      {
        // targets به طور خودکار از browserslist خوانده می‌شود
        modules: false, // Rollup خودش ماژول‌ها را مدیریت می‌کند
        // useBuiltIns: 'usage', // در صورت نیاز به polyfill خودکار
        // corejs: { version: 3, proposals: true }, // در صورت نیاز به polyfill خودکار
      },
    ],
  ],
};

const banner = `/*!
 * ${pkg.name} v${pkg.version}
 * ${pkg.description}
 * (c) ${new Date().getFullYear()} ${pkg.author.name} (${pkg.author.url})
 * Repository: ${pkg.repository.url.replace('git+', '').replace('.git', '')}
 * License: ${pkg.license}
 */`;

// تنظیمات مشترک برای پلاگین‌ها
const commonPlugins = [
  resolve({ browser: true }), // browser: true برای اولویت دادن به فیلد 'browser' در package.json ها
  commonjs(), // برای تبدیل ماژول‌های CommonJS
  replace({
    preventAssignment: true,
    values: {
      '__VERSION__': JSON.stringify(pkg.version),
      'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
    }
  }),
];

// تنظیمات Terser برای بهینه‌سازی پیشرفته
const terserOptions = {
  ecma: 2015, // یا 5 اگر نیاز به پشتیبانی از مرورگرهای بسیار قدیمی دارید
  mangle: { toplevel: true },
  compress: {
    module: true,
    toplevel: true,
    unsafe_arrows: true,
    drop_console: isProduction, // حذف console.log فقط در production نهایی
    drop_debugger: isProduction,
    passes: 2, // اجرای چندباره compress برای بهینه‌سازی بیشتر
    pure_funcs: isProduction ? ['console.log', 'console.debug', 'console.warn'] : [], // حذف توابع خاص در production
  },
  output: {
    comments: function (node, comment) {
      // حفظ کامنت banner و کامنت‌های با @preserve, @license, @cc_on
      if (comment.type === "comment2" || comment.type === "comment1") {
        return /@preserve|@license|@cc_on/i.test(comment.value) || comment.value.startsWith('!');
      }
      return false;
    },
    quote_style: 1, // استفاده از single quotes
  },
};


export default [
  // 1. ES Module (ESM) build
  {
    input: input,
    output: {
      file: pkg.module, // 'dist/lazyload-plus.esm.js'
      format: 'es',
      sourcemap: !isProduction ? 'inline' : true, // سورس‌مپ جدا برای production
      banner: banner,
      exports: 'auto', // یا 'default' اگر فقط یک default export دارید
    },
    plugins: [
      ...commonPlugins,
      // برای ESM، ممکن است نیازی به Babel نباشد اگر کد مدرن و targets هم مدرن باشند.
      // babel(babelOptions),
      isProduction && terser(terserOptions), // Minify کردن ESM هم می‌تواند مفید باشد
      analyzeBundle && visualizer({
        filename: './bundle-analysis/esm-stats.html',
        title: `${pkg.name} ESM Bundle Analysis`,
        open: false, // true برای باز کردن خودکار در مرورگر
        gzipSize: true,
        brotliSize: true,
      }),
    ].filter(Boolean),
    // external: [], // وابستگی‌هایی که نباید در باندل قرار گیرند
  },

  // 2. Universal Module Definition (UMD) build
  {
    input: input,
    output: {
      file: pkg.main, // 'dist/lazyload-plus.umd.js'
      format: 'umd',
      name: libraryName,
      sourcemap: !isProduction ? 'inline' : true,
      banner: banner,
      exports: 'auto',
      globals: {
        // 'jquery': '$' // مثال برای وابستگی خارجی
      },
    },
    plugins: [
      ...commonPlugins,
      babel(babelOptions), // Babel برای سازگاری بیشتر در UMD
      isProduction && terser(terserOptions),
      analyzeBundle && visualizer({
        filename: './bundle-analysis/umd-stats.html',
        title: `${pkg.name} UMD Bundle Analysis`,
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
    ].filter(Boolean),
    // external: [],
  },

  // 3. Minified UMD build for Browser (IIFE as an alternative for pure browser usage)
  //    این بیلد در package.json به فیلد 'browser' لینک شده است.
  {
    input: input,
    output: {
      file: pkg.browser, // 'dist/lazyload-plus.min.js'
      format: 'iife', // IIFE برای استفاده مستقیم در <script>, کوچکترین حجم
      name: libraryName,
      sourcemap: isProduction ? true : false, // سورس‌مپ برای production
      banner: banner,
      // globals: {}, // برای IIFE معمولاً نیازی به globals نیست مگر اینکه به window متکی باشید
    },
    plugins: [
      ...commonPlugins,
      babel(babelOptions), // Babel برای سازگاری حداکثری
      terser(terserOptions), // همیشه minify شود چون .min.js است
      analyzeBundle && visualizer({
        filename: './bundle-analysis/browser-stats.html',
        title: `${pkg.name} Browser (IIFE) Bundle Analysis`,
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
    ].filter(Boolean),
    // external: [],
  },
];
