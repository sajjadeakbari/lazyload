/*!
 * Type definitions for LazyLoad.js
 * Project: https://github.com/sajjadeakbari/lazyload
 * Definitions by: Sajjad Akbari <https://sajjadakbari.ir>
 * Version: 4.0.2
 */

// Use a consistent type for elements that can be passed to the library
export type LazyLoadInputElements = NodeList | Array<HTMLElement> | HTMLElement;

/**
 * Defines the structure for callback functions used by LazyLoad.
 */
export interface LazyLoadCallbacks {
  /**
   * Callback function executed when an element enters the viewport or is about to be loaded.
   * @param element The HTML element that entered the viewport.
   * @example
   * ```typescript
   * callback_enter: (element) => {
   *   console.log('Element entered viewport:', element);
   *   element.style.willChange = 'opacity'; // Prepare for animation
   * }
   * ```
   */
  callback_enter?: (element: HTMLElement) => void;

  /**
   * Callback function executed after an element (e.g., <img>, <video>) has successfully loaded its content.
   * @param element The HTML element that has loaded.
   * @example
   * ```typescript
   * callback_load: (element) => {
   *   element.classList.add('fade-in');
   * }
   * ```
   */
  callback_load?: (element: HTMLElement) => void;

  /**
   * Callback function executed if an element fails to load its content.
   * @param element The HTML element that failed to load.
   * @param error The error event or object.
   * @example
   * ```typescript
   * callback_error: (element, error) => {
   *   console.error('Failed to load element:', element, error);
   *   element.parentElement.innerHTML = '<p>Error loading image</p>';
   * }
   * ```
   */
  callback_error?: (element: HTMLElement, error: Event | Error) => void;

  /**
   * Callback function executed after an element has finished processing (either loaded successfully or errored)
   * and all relevant CSS classes have been applied.
   * @param element The HTML element that has finished processing.
   */
  callback_finish?: (element: HTMLElement) => void;
}

/**
 * Configuration options for the LazyLoad instance.
 */
export interface LazyLoadOptions extends LazyLoadCallbacks { // Inherit callbacks
  /**
   * The attribute on elements that holds the URL of the image/media to load.
   * @default 'data-src'
   */
  src?: string;

  /**
   * The attribute on elements that holds the srcset value for responsive images.
   * @default 'data-srcset'
   */
  srcset?: string;

  /**
   * The attribute on elements that holds the sizes value for responsive images.
   * @default 'data-sizes'
   */
  sizes?: string;

  /**
   * The attribute on video elements that holds the URL for the poster image.
   * @default 'data-poster'
   */
  poster?: string;

  /**
   * CSS selector for elements to be lazy-loaded.
   * Ignored if `elements` are provided to the constructor.
   * @default '.lazyload'
   */
  elements_selector?: string;

  /**
   * CSS class added to an element when it starts loading.
   * @default 'lazyloading'
   */
  class_loading?: string;

  /**
   * CSS class added to an element after it has successfully loaded.
   * @default 'lazyloaded'
   */
  class_loaded?: string;

  /**
   * CSS class added to an element if an error occurs during loading.
   * @default 'lazyerror'
   */
  class_error?: string;

  /**
   * The element that is used as the viewport for checking visibility of the target cells.
   * Must be an ancestor of the target. Defaults to the browser viewport if not specified or if null.
   * @default null
   */
  root?: HTMLElement | null;

  /**
   * Margin around the root. Can have values similar to the CSS margin property,
   * e.g. "10px 20px 30px 40px" (top, right, bottom, left).
   * @default '0px'
   */
  rootMargin?: string;

  /**
   * A single number or an array of numbers indicating at what percentage of the
   * target's visibility the observer's callback should be executed.
   * @default 0
   */
  threshold?: number | number[];

  /**
   * Delay in milliseconds before an element starts loading after it has entered the viewport.
   * @default 0
   */
  load_delay?: number;

  /**
   * If true, elements that are already visible on page load will be loaded immediately,
   * bypassing the IntersectionObserver for them.
   * @default false
   */
  skip_invisible?: boolean;

  /**
   * If true, enables debug messages to be logged to the console.
   * @default false
   */
  debug?: boolean;
}

declare module 'lazyload-plus' { // Assuming package name in npm will be 'lazyload-plus'
  /**
   * Main class for the LazyLoad functionality.
   * @template TElementType The specific type of HTMLElement being targeted, defaults to HTMLElement.
   * Allows for more specific typing if, for example, only `HTMLImageElement`s are being lazy-loaded.
   */
  export default class LazyLoad<TElementType extends HTMLElement = HTMLElement> {
    /**
     * Current settings for the LazyLoad instance, merged from defaults and user-provided options.
     */
    public settings: LazyLoadOptions;

    /**
     * Initializes a new instance of the LazyLoad class.
     *
     * @example
     * ```typescript
     * // Basic usage with default selector
     * const lazyLoader = new LazyLoad();
     *
     * // With custom options
     * const lazyWithOptions = new LazyLoad({
     *   threshold: 0.5,
     *   callback_load: (el) => console.log(el, 'loaded!'),
     * });
     *
     * // Targeting specific elements directly
     * const images = document.querySelectorAll('.my-images');
     * const lazySpecific = new LazyLoad(images); // Overload 2
     *
     * // Targeting specific elements with options
     * const videos = document.getElementById('my-video-gallery');
     * const lazyVideosWithOptions = new LazyLoad({ root: videos, rootMargin: "100px" }, videos.querySelectorAll('video')); // Overload 3
     * ```
     *
     * @param options Optional. User-defined options to override the defaults.
     * Can also be an `LazyLoadInputElements` if no options are provided as the first argument.
     * @param elements Optional. A custom list of elements (NodeList, Array of HTMLElements, or a single HTMLElement) to observe.
     *                 If `options` is `LazyLoadInputElements`, this argument is ignored.
     */
    constructor(); // No arguments, uses defaults
    constructor(options: LazyLoadOptions); // Only options
    constructor(elements: LazyLoadInputElements<TElementType>); // Only elements
    constructor(options: LazyLoadOptions, elements: LazyLoadInputElements<TElementType>); // Both options and elements

    /**
     * Initializes or re-initializes the IntersectionObserver to monitor elements.
     * If IntersectionObserver is not supported, it loads all elements immediately.
     * This method is typically called automatically by the constructor.
     */
    public init(): void;

    /**
     * Adds new elements to the list of elements to be lazy-loaded.
     * Elements that are already loaded, errored, or currently being observed will be skipped.
     * @param elementsToAdd The element(s) (NodeList, Array of HTMLElements, or a single HTMLElement) to add.
     * @example
     * ```typescript
     * const lazyLoader = new LazyLoad();
     * // Sometime later, new content is added to the page:
     * const newImages = document.querySelectorAll('.newly-added-images');
     * lazyLoader.addElements(newImages);
     * ```
     */
    public addElements(elementsToAdd: LazyLoadInputElements<TElementType>): void;

    /**
     * Forces the loading of all elements currently in the observation queue,
     * regardless of their visibility. Useful for fallbacks or manual triggers.
     */
    public loadAllNow(): void;

    /**
     * Re-evaluates and re-observes elements.
     * Disconnects the current observer, optionally re-queries the DOM for elements
     * based on `elements_selector` (if no `newElements` are provided),
     * and starts observing them.
     * @param newElements Optional. A new set of elements (NodeList, Array of HTMLElements, or a single HTMLElement) to observe.
     *                    If not provided, elements are re-queried using `elements_selector` from the initial settings.
     * @example
     * ```typescript
     * const lazyLoader = new LazyLoad({ elements_selector: '.dynamic-content img' });
     * // After DOM updates that change which elements match the selector:
     * lazyLoader.update();
     *
     * // Update with a specific new set of elements
     * const otherImages = document.querySelectorAll('.other-section img');
     * lazyLoader.update(otherImages);
     * ```
     */
    public update(newElements?: LazyLoadInputElements<TElementType>): void;

    /**
     * Stops observing all elements and cleans up the IntersectionObserver instance.
     * This method does not remove any CSS classes (e.g., `class_loaded`)
     * or revert `src` attributes on elements that have already been processed.
     * Useful for component unmounts or when lazy loading is no longer needed.
     */
    public destroy(): void;
  }
}

// Optional: If you want to provide types for global `window.LazyLoad` usage as well.
// This is more relevant if the library is included via a <script> tag directly.
// declare global {
//   interface Window {
//     LazyLoad: new <TElementType extends HTMLElement = HTMLElement> (
//       optionsOrElements?: LazyLoadOptions | LazyLoadInputElements<TElementType>,
//       elements?: LazyLoadInputElements<TElementType>
//     ) => LazyLoad<TElementType>;
//   }
// }
