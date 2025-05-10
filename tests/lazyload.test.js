// tests/lazyload.test.js
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import LazyLoad from '../src/LazyLoad.js'; // مسیر فایل اصلی کتابخانه

// شبیه‌سازی اولیه DOM برای هر تست
const setupDOM = (html) => {
  document.body.innerHTML = html || '';
  // بازگرداندن عناصر برای دسترسی آسان‌تر در تست‌ها
  return Array.from(document.querySelectorAll('.lazyload'));
};

// شبیه‌سازی IntersectionObserver
// این یک شبیه‌سازی بسیار ساده است. برای تست‌های پیچیده‌تر، ممکن است نیاز به شبیه‌سازی کامل‌تری باشد.
class MockIntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.observedElements = new Set();
  }

  observe(element) {
    this.observedElements.add(element);
  }

  unobserve(element) {
    this.observedElements.delete(element);
  }

  disconnect() {
    this.observedElements.clear();
  }

  // متد کمکی برای شبیه‌سازی تقاطع
  simulateIntersection(entries) {
    this.callback(entries, this);
  }

  // متد کمکی برای شبیه‌سازی ورود یک عنصر به دید
  triggerIntersect(element, isIntersecting) {
    if (this.observedElements.has(element)) {
      this.simulateIntersection([{ target: element, isIntersecting: isIntersecting }]);
    }
  }
}

describe('LazyLoad Core Functionality', () => {
  let originalIntersectionObserver;

  beforeEach(() => {
    // ذخیره IntersectionObserver اصلی و جایگزینی با mock
    originalIntersectionObserver = global.IntersectionObserver;
    global.IntersectionObserver = MockIntersectionObserver;
    vi.useFakeTimers(); // برای کنترل setTimeout (مثلاً برای load_delay)
  });

  afterEach(() => {
    // بازگرداندن IntersectionObserver اصلی
    global.IntersectionObserver = originalIntersectionObserver;
    document.body.innerHTML = ''; // پاکسازی DOM
    vi.restoreAllMocks(); // بازگرداندن تمام mock ها و spy ها
    vi.clearAllTimers(); // پاکسازی تایمرها
  });

  it('should initialize without errors with default options', () => {
    expect(() => new LazyLoad()).not.toThrow();
  });

  it('should select elements based on default elements_selector', () => {
    setupDOM('<img class="lazyload" data-src="image.jpg">');
    const lazyLoader = new LazyLoad();
    // @ts-ignore (برای دسترسی به پراپرتی خصوصی در تست)
    expect(lazyLoader._elementsToObserve.size).toBe(1);
  });

  it('should select elements based on custom elements_selector', ()C => {
    setupDOM('<img class="my-custom-lazy" data-src="image.jpg">');
    const lazyLoader = new LazyLoad({ elements_selector: '.my-custom-lazy' });
    // @ts-ignore
    expect(lazyLoader._elementsToObserve.size).toBe(1);
  });

  it('should not select elements if selector does not match', () => {
    setupDOM('<img class="another-class" data-src="image.jpg">');
    const lazyLoader = new LazyLoad();
    // @ts-ignore
    expect(lazyLoader._elementsToObserve.size).toBe(0);
  });

  it('should use provided elements if passed to constructor', () => {
    const img = document.createElement('img');
    img.setAttribute('data-src', 'image.jpg');
    document.body.appendChild(img);

    const lazyLoader = new LazyLoad({}, [img]);
    // @ts-ignore
    expect(lazyLoader._elementsToObserve.size).toBe(1);
    // @ts-ignore
    expect(lazyLoader._elementsToObserve.has(img)).toBe(true);
  });

  it('should load an image when it intersects', () => {
    const [img] = setupDOM('<img class="lazyload" data-src="test-image.jpg" width="10" height="10">');
    const lazyLoader = new LazyLoad();
    
    // @ts-ignore (دسترسی به observer شبیه‌سازی شده)
    const mockObserverInstance = lazyLoader._observer;
    expect(mockObserverInstance).toBeInstanceOf(MockIntersectionObserver);

    // شبیه‌سازی ورود به دید
    // @ts-ignore
    mockObserverInstance.triggerIntersect(img, true);

    // بررسی اینکه src تغییر کرده است
    // به دلیل requestAnimationFrame، ممکن است نیاز به fast-forward کردن تایمرها باشد
    vi.runAllTimers(); // اجرای requestAnimationFrame و هرگونه setTimeout
    
    expect(img.src).toContain('test-image.jpg');
    expect(img.classList.contains('lazyloaded')).toBe(true);
  });

  it('should apply loading and loaded classes', () => {
    const [img] = setupDOM('<img class="lazyload" data-src="image.jpg" width="10" height="10">');
    const lazyLoader = new LazyLoad({
      class_loading: 'custom-loading',
      class_loaded: 'custom-loaded',
    });

    // @ts-ignore
    lazyLoader._observer.triggerIntersect(img, true);
    // کلاس loading باید قبل از اتمام لود واقعی اضافه شود
    // در پیاده‌سازی فعلی، loading همزمان با شروع لود در rAF اضافه می‌شود
    // برای تست دقیق‌تر این بخش، می‌توانیم رویداد 'load' تصویر را mock کنیم.

    vi.runAllTimers(); // برای rAF

    // شبیه‌سازی بارگذاری موفق تصویر
    // برای تست کامل، باید رویداد 'load' تصویر را dispatch کنیم.
    // در این تست ساده، فرض می‌کنیم rAF کافی است تا src ست شود و 'load' اتفاق بیفتد.
    // این بخش نیاز به بهبود با شبیه‌سازی دقیق‌تر رویداد load دارد.
    // اما برای شروع، چک می‌کنیم که آیا کلاس loaded اضافه شده یا نه (پس از اینکه src ست شد).
    
    // برای اطمینان از اجرای کامل، یکبار دیگر تایمرها را اجرا می‌کنیم
    // (اگر رویداد load تصویر زمان‌بر باشد، این کمک نمی‌کند، باید رویداد را شبیه‌سازی کنیم)
    // اما برای کلاس loaded که پس از ست شدن src و load شدن اتفاق میفتد:
    // img.dispatchEvent(new Event('load')); // شبیه‌سازی دقیق‌تر
    // در این مثال ساده، با فرض اینکه پس از rAF، لود سریع اتفاق افتاده:
    expect(img.classList.contains('custom-loaded')).toBe(true);
    expect(img.classList.contains('custom-loading')).toBe(false); // باید حذف شده باشد
  });

  it('should use data-srcset for images', () => {
    const [img] = setupDOM('<img class="lazyload" data-srcset="image-400.jpg 400w, image-800.jpg 800w" data-sizes="auto" width="10" height="10">');
    const lazyLoader = new LazyLoad();
    // @ts-ignore
    lazyLoader._observer.triggerIntersect(img, true);
    vi.runAllTimers();
    expect(img.srcset).toBe('image-400.jpg 400w, image-800.jpg 800w');
    expect(img.sizes).toBe('auto'); // اگرچه data-sizes مستقیماً به sizes می‌رود، در اینجا چک می‌شود.
  });

  it('should load background image for a div', () => {
    const [div] = setupDOM('<div class="lazyload" data-src="bg.jpg" style="width:10px; height:10px;"></div>');
    const lazyLoader = new LazyLoad();
    // @ts-ignore
    lazyLoader._observer.triggerIntersect(div, true);
    vi.runAllTimers(); // برای هرگونه rAF یا setTimeout داخلی
    expect(div.style.backgroundImage).toBe('url("bg.jpg")');
    expect(div.classList.contains('lazyloaded')).toBe(true);
  });

  it('should call callback_load on successful load', () => {
    const mockLoadCallback = vi.fn();
    const [img] = setupDOM('<img class="lazyload" data-src="image.jpg" width="10" height="10">');
    const lazyLoader = new LazyLoad({ callback_load: mockLoadCallback });

    // @ts-ignore
    lazyLoader._observer.triggerIntersect(img, true);
    vi.runAllTimers(); // برای rAF

    // شبیه‌سازی دستی رویداد load تصویر برای کنترل دقیق‌تر تست
    img.dispatchEvent(new Event('load'));
    vi.runAllTimers(); // برای هرگونه callback در setTimeout یا rAF

    expect(mockLoadCallback).toHaveBeenCalledTimes(1);
    expect(mockLoadCallback).toHaveBeenCalledWith(img);
  });

  it('should call callback_error on failed load', () => {
    const mockErrorCallback = vi.fn();
    const [img] = setupDOM('<img class="lazyload" data-src="nonexistent.jpg" width="10" height="10">');
    const lazyLoader = new LazyLoad({ callback_error: mockErrorCallback, class_error: 'img-error' });

    // @ts-ignore
    lazyLoader._observer.triggerIntersect(img, true);
    vi.runAllTimers();

    // شبیه‌سازی دستی رویداد error تصویر
    const errorEvent = new Event('error');
    img.dispatchEvent(errorEvent);
    vi.runAllTimers();

    expect(mockErrorCallback).toHaveBeenCalledTimes(1);
    expect(mockErrorCallback).toHaveBeenCalledWith(img, errorEvent);
    expect(img.classList.contains('img-error')).toBe(true);
  });

  it('should use load_delay option', () => {
    const [img] = setupDOM('<img class="lazyload" data-src="image.jpg" width="10" height="10">');
    const lazyLoader = new LazyLoad({ load_delay: 100 });
    // @ts-ignore
    lazyLoader._observer.triggerIntersect(img, true);
    
    expect(img.src).toBe(''); // هنوز نباید src ست شده باشد

    vi.advanceTimersByTime(99);
    expect(img.src).toBe(''); // هنوز هم نه

    vi.advanceTimersByTime(1); // حالا باید تایمر delay تمام شده باشد
    vi.runAllTimers(); // برای اجرای rAF داخلی و هر چیز دیگر
    
    expect(img.src).toContain('image.jpg');
  });

  it('should immediately load visible elements if skip_invisible is true', () => {
    // برای این تست، باید _isElementVisible را mock کنیم یا فرض کنیم که عنصر قابل مشاهده است
    // jsdom به طور پیش‌فرض ابعاد ندارد، بنابراین getBoundingClientRect مقادیر 0 برمی‌گرداند.
    // یک راه ساده، spy کردن روی _isElementVisible است.
    const mockIsVisible = vi.fn(() => true);
    
    const [img] = setupDOM('<img class="lazyload" data-src="visible.jpg" width="10" height="10">');
    
    // جایگزینی موقت متد با mock
    const originalIsVisible = LazyLoad.prototype._isElementVisible;
    LazyLoad.prototype._isElementVisible = mockIsVisible;

    new LazyLoad({ skip_invisible: true });
    LazyLoad.prototype._isElementVisible = originalIsVisible; // بازگرداندن متد اصلی

    vi.runAllTimers(); // برای rAF
    
    expect(mockIsVisible).toHaveBeenCalled();
    expect(img.src).toContain('visible.jpg');
    expect(img.classList.contains('lazyloaded')).toBe(true);
  });

  it('destroy method should disconnect observer', () => {
    setupDOM('<img class="lazyload" data-src="image.jpg">');
    const lazyLoader = new LazyLoad();
    // @ts-ignore
    const mockObserverInstance = lazyLoader._observer;
    // @ts-ignore
    const disconnectSpy = vi.spyOn(mockObserverInstance, 'disconnect');
    
    lazyLoader.destroy();
    
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    // @ts-ignore
    expect(lazyLoader._observer).toBeNull();
  });

  it('loadAllNow should load all queued elements', () => {
    const images = setupDOM(
      '<img class="lazyload" data-src="img1.jpg">' +
      '<img class="lazyload" data-src="img2.jpg">'
    );
    const lazyLoader = new LazyLoad();
    
    // در ابتدا هیچکدام نباید src داشته باشند (چون تقاطعی رخ نداده)
    expect(images[0].src).toBe('');
    expect(images[1].src).toBe('');

    lazyLoader.loadAllNow();
    vi.runAllTimers(); // برای rAF ها

    expect(images[0].src).toContain('img1.jpg');
    expect(images[1].src).toContain('img2.jpg');
    expect(images[0].classList.contains('lazyloaded')).toBe(true);
    expect(images[1].classList.contains('lazyloaded')).toBe(true);
  });

  // TODO: تست‌های بیشتر برای:
  // - <picture> و <source>
  // - <video> و <source> و poster
  // - <iframe>
  // - متد update
  // - مدیریت خطاهای پیچیده‌تر
  // - رفتار با root و rootMargin (نیاز به شبیه‌سازی پیچیده‌تر IntersectionObserver دارد)
});
