# LazyLoad Plus

[![npm version](https://img.shields.io/npm/v/lazyload-plus.svg?style=flat-square)](https://www.npmjs.com/package/lazyload-plus)
[![npm downloads](https://img.shields.io/npm/dm/lazyload-plus.svg?style=flat-square)](https://www.npmjs.com/package/lazyload-plus)
[![license](https://img.shields.io/npm/l/lazyload-plus.svg?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
<!-- Add more badges as needed: build status, coverage, etc. -->
<!-- [![Build Status](https://img.shields.io/github/actions/workflow/status/sajjadeakbari/lazyload-plus/main.yml?branch=main&style=flat-square)](https://github.com/sajjadeakbari/lazyload-plus/actions) -->
<!-- [![Coverage Status](https://img.shields.io/coveralls/github/sajjadeakbari/lazyload-plus/main.svg?style=flat-square)](https://coveralls.io/github/sajjadeakbari/lazyload-plus?branch=main) -->
<!-- [![bundle size](https://img.shields.io/bundlephobia/minzip/lazyload-plus?style=flat-square)](https://bundlephobia.com/result?p=lazyload-plus) -->

**LazyLoad Plus** is a lightweight, flexible, and high-performance JavaScript plugin for lazy loading images, videos, iframes, and background images. It uses the `IntersectionObserver` API for efficient detection of elements entering the viewport, with a fallback for older browsers. Improve your website's initial load time, reduce bandwidth usage, and enhance user experience.

**[✨ Live Demo (Placeholder)]()** - _(Link to a live demo page will be added here)_

## Features

-   🚀 **High Performance**: Leverages `IntersectionObserver` for efficient viewport detection.
-   🖼️ **Versatile**: Supports `<img>`, `<picture>`, `<video>`, `<iframe>`, and background images.
-   🛠️ **Highly Customizable**: Extensive options for thresholds, root margins, CSS classes, and callbacks.
-   🎛️ **Fine-grained Control**: Methods to `addElements`, `update`, `loadAllNow`, and `destroy`.
-   💨 **Lightweight**: Minimal footprint, optimized for performance.
-    fallback **Fallback Support**: Gracefully handles browsers that don't support `IntersectionObserver` (loads all images immediately).
-   🧩 **Modular**: Supports UMD, ESM, and direct browser usage (IIFE).
-    JQuery **jQuery Plugin (Optional)**: Easy integration for projects already using jQuery.
-   📝 **Well-Documented**: Clear API and usage examples.
-   🐛 **Debug Mode**: For easier troubleshooting.
-   🛡️ **TypeScript Definitions**: Full TypeScript support for a better development experience.

## Table of Contents

-   [Installation](#installation)
-   [Usage](#usage)
    -   [ES Modules](#es-modules)
    -   [Browser (IIFE/UMD)](#browser-iifeumd)
    -   [HTML Markup](#html-markup)
-   [Configuration Options](#configuration-options)
-   [API Methods](#api-methods)
-   [Callbacks](#callbacks)
-   [jQuery Plugin](#jquery-plugin)
-   [Examples](#examples)
    -   [Basic Image](#basic-image)
    -   [Responsive Images with `<picture>`](#responsive-images-with-picture)
    -   [Video](#video)
    -   [Iframe](#iframe)
    -   [Background Image](#background-image)
    -   [Using Callbacks](#using-callbacks)
-   [Browser Support](#browser-support)
-   [Development](#development)
-   [Contributing](#contributing)
-   [License](#license)

## Installation

### via npm (or yarn, pnpm)

```bash
npm install lazyload-plus
# or
yarn add lazyload-plus
# or
pnpm add lazyload-plus
```

### via CDN (for direct browser usage)

You can use a CDN like [unpkg](https://unpkg.com/) or [jsDelivr](https://www.jsdelivr.com/).

```html
<!-- Get the latest version -->
<script src="https://unpkg.com/lazyload-plus/dist/lazyload-plus.min.js"></script>
<!-- Or a specific version -->
<script src="https://unpkg.com/lazyload-plus@4.0.3/dist/lazyload-plus.min.js"></script>
```

## Usage

### ES Modules

```javascript
import LazyLoad from 'lazyload-plus';

// Initialize with default options
const lazyLoader = new LazyLoad();

// Or with custom options
const customLazyLoader = new LazyLoad({
    elements_selector: '.my-lazy-elements',
    threshold: 0.5, // Load when 50% of the element is visible
    callback_load: (element) => {
        console.log('Element loaded:', element);
        element.classList.add('loaded-fade-in'); // Example: add a class for fade-in animation
    }
});

// If you need to add dynamically loaded elements later
// const newElements = document.querySelectorAll('.new-content .my-lazy-elements');
// customLazyLoader.addElements(newElements);
```

### Browser (IIFE/UMD)

If you've included the script via CDN or a direct `<script>` tag, `LazyLoad` will be available as a global object (e.g., `window.LazyLoad`).

```html
<script src="path/to/lazyload-plus.min.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    // Initialize with default options
    var lazyLoader = new LazyLoad();

    // Or with custom options
    var customLazyLoader = new LazyLoad({
      elements_selector: '.my-lazy-elements',
      threshold: 100 // in pixels, alternative to percentage for rootMargin
    });
  });
</script>
```

### HTML Markup

Prepare your HTML elements by using `data-` attributes for the actual source. Use a placeholder `src` (e.g., a tiny transparent GIF or SVG) or omit it if your CSS handles the initial state.

**For `<img>` elements:**

```html
<img class="lazyload"
     data-src="path/to/image.jpg"
     data-srcset="path/to/image-400w.jpg 400w, path/to/image-800w.jpg 800w"
     data-sizes="(max-width: 600px) 400px, 800px"
     alt="Descriptive alt text"
     width="800" height="600" />
<!-- Small placeholder to prevent layout shifts and show something initially -->
<img class="lazyload" src="placeholder.gif" data-src="real-image.jpg" alt="...">
```

**For `<picture>` elements:**

```html
<picture class="lazyload">
    <source media="(max-width: 799px)" data-srcset="path/to/small-image.webp" type="image/webp">
    <source media="(max-width: 799px)" data-srcset="path/to/small-image.jpg" type="image/jpeg">
    <source media="(min-width: 800px)" data-srcset="path/to/large-image.webp" type="image/webp">
    <source media="(min-width: 800px)" data-srcset="path/to/large-image.jpg" type="image/jpeg">
    <!-- Fallback img with data-src -->
    <img data-src="path/to/default-image.jpg" alt="Descriptive alt text" width="800" height="600">
</picture>
```

**For `<video>` elements:**

```html
<video class="lazyload" controls width="640" height="360" data-poster="path/to/poster.jpg">
    <source data-src="path/to/video.mp4" type="video/mp4">
    <source data-src="path/to/video.webm" type="video/webm">
    Your browser does not support the video tag.
</video>
```

**For `<iframe>` elements:**

```html
<iframe class="lazyload"
        data-src="https://www.youtube.com/embed/VIDEO_ID"
        width="560"
        height="315"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        title="YouTube video player">
</iframe>
```

**For background images on any element (e.g., `<div>`):**

```html
<div class="lazyload"
     data-src="path/to/background.jpg"
     style="width: 400px; height: 300px; background-color: #eee;">
    <!-- Content inside div -->
</div>
```

**Important:** Ensure your lazy-loaded elements have dimensions (width/height attributes for `img`/`video`/`iframe`, or CSS for `div`s) to prevent layout shifts when they load.

## Configuration Options

You can pass an options object to the `LazyLoad` constructor. Here are the available options with their default values:

| Option                | Type                          | Default           | Description                                                                                                |
| --------------------- | ----------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------- |
| `src`                 | `string`                      | `'data-src'`      | Attribute holding the main source URL.                                                                     |
| `srcset`              | `string`                      | `'data-srcset'`   | Attribute for responsive image `srcset`.                                                                   |
| `sizes`               | `string`                      | `'data-sizes'`    | Attribute for responsive image `sizes`.                                                                    |
| `poster`              | `string`                      | `'data-poster'`   | Attribute for video poster URL.                                                                            |
| `elements_selector`   | `string`                      | `'.lazyload'`     | CSS selector for elements to lazy load.                                                                    |
| `class_loading`       | `string`                      | `'lazyloading'`   | CSS class added when an element starts loading.                                                            |
| `class_loaded`        | `string`                      | `'lazyloaded'`    | CSS class added after successful loading.                                                                  |
| `class_error`         | `string`                      | `'lazyerror'`     | CSS class added on loading error.                                                                          |
| `root`                | `HTMLElement \| null`         | `null`            | Viewport element for `IntersectionObserver`. `null` for browser viewport.                                    |
| `rootMargin`          | `string`                      | `'0px'`           | Margin around the `root` (e.g., `'100px 0px'`).                                                            |
| `threshold`           | `number \| number[]`          | `0`               | Visibility percentage(s) to trigger loading (0 to 1.0).                                                      |
| `load_delay`          | `number`                      | `0`               | Delay (ms) before loading after intersection.                                                              |
| `skip_invisible`      | `boolean`                     | `false`           | Immediately load elements visible on initial page load.                                                      |
| `callback_enter`      | `(el: HTMLElement) => void`   | `null`            | Called when an element enters the viewport.                                                                |
| `callback_load`       | `(el: HTMLElement) => void`   | `null`            | Called after successful media load.                                                                        |
| `callback_error`      | `(el: HTMLElement, error: Event\|Error) => void` | `null` | Called on media loading error.                                                                             |
| `callback_finish`     | `(el: HTMLElement) => void`   | `null`            | Called after load or error, and classes are applied.                                                       |
| `debug`               | `boolean`                     | `false`           | Enable console debug messages.                                                                             |

**Example with custom options:**

```javascript
const lazyLoader = new LazyLoad({
  elements_selector: '.custom-lazy-image',
  rootMargin: '0px 0px 200px 0px', // Start loading 200px before element enters viewport from bottom
  threshold: 0.1, // Load when 10% of the element is visible
  class_loaded: 'is-loaded',
  callback_load: (element) => {
    element.style.opacity = 1; // Example: fade in effect
  }
});
```

## API Methods

The `LazyLoad` instance provides several public methods:

-   **`instance.addElements(elementsToAdd: NodeList | Array<HTMLElement> | HTMLElement)`**
    Adds new elements to be lazy-loaded. Useful for dynamically added content.
    ```javascript
    const newImages = document.querySelectorAll('.ajax-content .lazyload');
    lazyLoader.addElements(newImages);
    ```

-   **`instance.update(newElements?: NodeList | Array<HTMLElement> | HTMLElement)`**
    Re-evaluates elements to observe. If `newElements` is provided, it observes those. Otherwise, it re-queries the DOM using `elements_selector`.
    ```javascript
    // Re-scan the page for elements matching the original selector
    lazyLoader.update();
    // Or update with a specific set of new elements
    // lazyLoader.update(document.querySelectorAll('.another-set'));
    ```

-   **`instance.loadAllNow()`**
    Forces all currently queued elements to load immediately, regardless of viewport visibility.

-   **`instance.destroy()`**
    Stops observing all elements and cleans up the `IntersectionObserver` instance. Does not revert already loaded elements.

## Callbacks

You can use callbacks to execute custom logic at different stages of the lazy loading process:

-   `callback_enter(element)`: When an element enters the observed area.
-   `callback_load(element)`: After an element's media has successfully loaded.
-   `callback_error(element, error)`: If an error occurs while loading an element's media.
-   `callback_finish(element)`: After an element has finished processing (load or error) and classes are set.

See [Configuration Options](#configuration-options) table for signatures.

## jQuery Plugin

If jQuery is present on the page when `lazyload-plus.js` is loaded, a jQuery plugin `$.fn.lazyload` becomes available.

```javascript
$(document).ready(function() {
  // Basic initialization
  $('.lazyload').lazyload();

  // With options
  $('.custom-lazy').lazyload({
    threshold: 0.25,
    class_error: 'my-custom-error-class'
  });

  // Calling methods (example)
  // Note: Method calls usually operate on the instance associated with the first element in the jQuery collection.
  // $('.lazyload').lazyload('loadAllNow');
  // To add new elements dynamically with jQuery:
  // const $newElements = $('<img class="lazyload" data-src="new.jpg">').appendTo('body');
  // $('.lazyload').lazyload('addElements', $newElements.get()); // Pass DOM elements
});
```

## Examples

_(More detailed examples for each media type can be added here, similar to the HTML Markup section but with full context and potential JS.)_

### Basic Image

```html
<img class="lazyload" data-src="image.jpg" alt="My Image" width="300" height="200">
```
```javascript
new LazyLoad(); // Will pick up elements with class "lazyload"
```

### Responsive Images with `<picture>`
_(See HTML Markup section)_

### Video
_(See HTML Markup section)_

### Iframe
_(See HTML Markup section)_

### Background Image
_(See HTML Markup section)_

### Using Callbacks

```javascript
new LazyLoad({
  elements_selector: '.animate-on-load',
  callback_load: (element) => {
    // Add a class for a CSS animation once loaded
    element.classList.add('loaded-and-animated');
  },
  callback_error: (element, error) => {
    console.error('Could not load:', element.dataset.src, error);
    element.style.border = '2px dashed red';
  }
});
```

## Browser Support

LazyLoad Plus relies on `IntersectionObserver` for optimal performance.

-   **Modern Browsers**: Natively supported (Chrome, Firefox, Safari, Edge).
-   **Older Browsers (e.g., IE11)**: `IntersectionObserver` is not supported. In these browsers, LazyLoad Plus will **load all images immediately** upon initialization as a fallback. No polyfill is bundled by default. If you need `IntersectionObserver` functionality in older browsers, you can include a polyfill separately:
    ```html
    <!-- Example: IntersectionObserver Polyfill -->
    <script src="https://polyfill.io/v3/polyfill.min.js?features=IntersectionObserver"></script>
    <!-- Then include LazyLoad Plus -->
    <script src="path/to/lazyload-plus.min.js"></script>
    ```

The core JavaScript used is ES5/ES6 compatible, and the UMD/IIFE builds are processed with Babel for broader compatibility based on the `browserslist` configuration.

## Development

To set up the development environment:

1.  Clone the repository:
    ```bash
    git clone https://github.com/sajjadeakbari/lazyload-plus.git
    cd lazyload-plus
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Available scripts (see `package.json` for all scripts):
    -   `npm run dev`: Start Rollup in watch mode for development.
    -   `npm run build`: Build for development (non-minified).
    -   `npm run build:prod`: Build for production (minified).
    -   `npm run lint`: Lint the codebase.
    -   `npm run test`: Run tests with Vitest.
    -   `npm run docs:generate`: Generate API documentation.

## Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Ensure tests pass (`npm test`).
5.  Lint your code (`npm run lint`).
6.  Commit your changes (`git commit -m 'Add some feature'`).
7.  Push to the branch (`git push origin feature/your-feature-name`).
8.  Open a Pull Request.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) (you'll need to create this file) for more details on the process and code style.

## License

LazyLoad Plus is open-source software licensed under the [MIT License](LICENSE).

---

Crafted with ❤️ by [Sajjad Akbari](https://sajjadakbari.ir)
