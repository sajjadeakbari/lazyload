// .prettierrc.js
module.exports = {
  printWidth: 100, // عرض خط قبل از شکستن
  tabWidth: 2, // عرض تب
  useTabs: false, // استفاده از فاصله به جای تب
  semi: true, // اضافه کردن سمیکالن در انتهای خطوط
  singleQuote: true, // استفاده از single quote به جای double quote
  quoteProps: 'as-needed', // نحوه نقل قول کردن property های آبجکت ('as-needed', 'consistent', 'preserve')
  jsxSingleQuote: false, // استفاده از double quote در JSX
  trailingComma: 'es5', // اضافه کردن کاما در انتهای آرایه‌ها و آبجکت‌ها ('es5', 'none', 'all')
  bracketSpacing: true, // اضافه کردن فاصله در داخل براکت‌های آبجکت: { foo: bar }
  bracketSameLine: false, // قرار دادن > تگ‌های HTML چند خطی در خط جدید
  arrowParens: 'always', // همیشه پرانتز دور پارامترهای arrow function: (x) => x
  endOfLine: 'lf', // نوع انتهای خط ('lf', 'crlf', 'cr', 'auto')
  // overrides: [ // تنظیمات خاص برای فایل‌های مختلف
  //   {
  //     files: '*.html',
  //     options: {
  //       parser: 'html',
  //     },
  //   },
  // ],
};
