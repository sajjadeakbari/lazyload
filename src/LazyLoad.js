/*!
 * LazyLoad.js - JavaScript plugin for lazy loading images and other media
 *
 * Copyright (c) 2023 Sajjad Akbari (sajjadakbari.ir)
 * Based on the original work by Mika Tuupola (2007-2019)
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Project home:
 *   https://github.com/sajjadeakbari/lazyload
 *   https://sajjadakbari.ir
 *
 * Version: 4.0.1
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof exports === 'object' && typeof module !== 'undefined') {
        // CommonJS (for Node.js or Browserify/Webpack)
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.LazyLoad = factory();
    }
}(typeof global !== 'undefined' ? global : this.window || this.global, function () {
    'use strict';

    const IS_BROWSER = typeof window !== 'undefined' && typeof window.document !== 'undefined';

    const defaults = {
        src: 'data-src',
        srcset: 'data-srcset',
        sizes: 'data-sizes',
        poster: 'data-poster', // For video elements
        elements_selector: '.lazyload', // Selector for elements to lazy load
        class_loading: 'lazyloading',   // Class added when an element is loading
        class_loaded: 'lazyloaded',     // Class added when an element has successfully loaded
        class_error: 'lazyerror',       // Class added when an element fails to load
        // IntersectionObserver settings
        root: null,                     // The element that is used as the viewport for checking visibility
        rootMargin: '0px',              // Margin around the root
        threshold: 0,                   // A single number or an array of numbers indicating at what percentage of the target's visibility the observer's callback should be executed
        // Behavior settings
        load_delay: 0,                  // Milliseconds to delay loading after an element intersects
        skip_invisible: false,          // Immediately load elements that are already visible on page load, bypassing IntersectionObserver for them
        // Callbacks
        callback_enter: null,           // (element: HTMLElement) => void - Called when an element enters the viewport or is about to be loaded
        callback_load: null,            // (element: HTMLElement) => void - Called after an element (e.g., <img>, <video>) has successfully loaded its content
        callback_error: null,           // (element: HTMLElement, error: Event | Error) => void - Called if an element fails to load
        callback_finish: null,          // (element: HTMLElement) => void - Called after an element has finished processing (either loaded or errored) and classes have been applied
        // Debug
        debug: false,                   // Enable console logs for debugging purposes
    };

    /**
     * Merges user-provided options with default options.
     * @private
     * @param {object} target - The target object to merge into.
     * @param {...object} sources - The source objects to merge from.
     * @returns {object} The merged object.
     */
    const _extend = function (target, ...sources) {
        sources.forEach(source => {
            if (source) {
                for (const key in source) {
                    if (Object.prototype.hasOwnProperty.call(source, key)) {
                        target[key] = source[key];
                    }
                }
            }
        });
        return target;
    };
    
    /**
     * Gets an attribute value from an element.
     * @private
     * @param {HTMLElement} element - The HTML element.
     * @param {string} attributeName - The name of the attribute.
     * @returns {string|null} The attribute value or null if not found.
     */
    const _getAttribute = (element, attributeName) => element.getAttribute(attributeName);

    /**
     * Removes an attribute from an element.
     * @private
     * @param {HTMLElement} element - The HTML element.
     * @param {string} attributeName - The name of the attribute.
     */
    const _removeAttribute = (element, attributeName) => element.removeAttribute(attributeName);

    /**
     * Adds a CSS class to an element if the className is provided.
     * @private
     * @param {HTMLElement} element - The HTML element.
     * @param {string} className - The CSS class name to add.
     */
    const _addClass = (element, className) => { if (className) element.classList.add(className); };

    /**
     * Removes a CSS class from an element if the className is provided.
     * @private
     * @param {HTMLElement} element - The HTML element.
     * @param {string} className - The CSS class name to remove.
     */
    const _removeClass = (element, className) => { if (className) element.classList.remove(className); };

    class LazyLoad {
        /**
         * Initializes a new instance of the LazyLoad class.
         * @param {object} [options] - User-defined options to override the defaults.
         * @param {NodeList|Array<HTMLElement>|HTMLElement} [elements] - A custom list of elements to observe. If not provided, `elements_selector` from options will be used.
         */
        constructor(options = {}, elements) {
            this.settings = _extend({}, defaults, options);
            this._observer = null;
            this._elementsToObserve = new Set();      // Elements queued for lazy loading
            this._observedByIO = new Set();           // Elements currently being watched by IntersectionObserver

            this._logDebug('Instance created with settings:', this.settings);
            
            const initialElements = elements || (IS_BROWSER ? Array.from(window.document.querySelectorAll(this.settings.elements_selector)) : []);
            this.addElements(initialElements); // Add and prepare initial elements
            this.init(); // Initialize the IntersectionObserver and start observing
        }

        /**
         * Logs a debug message to the console if debugging is enabled.
         * @private
         * @param {string} message - The debug message.
         * @param {...any} args - Additional arguments to log.
         */
        _logDebug(message, ...args) {
            if (this.settings.debug) {
                console.log('[LazyLoad DEBUG]', message, ...args);
            }
        }

        /**
         * Checks if an element is currently visible within the viewport.
         * Used by `skip_invisible` option.
         * @private
         * @param {HTMLElement} element - The element to check.
         * @returns {boolean} True if the element is visible, false otherwise.
         */
        _isElementVisible(element) {
            if (!IS_BROWSER || !element.getBoundingClientRect) return false;
            const rect = element.getBoundingClientRect();
            return (
                rect.top < window.innerHeight && rect.bottom > 0 &&
                rect.left < window.innerWidth && rect.right > 0
            );
        }

        /**
         * Starts the loading process for an element that has entered the viewport or is otherwise triggered.
         * @private
         * @param {HTMLElement} element - The element to load.
         */
        _revealElement(element) {
            const settings = this.settings;
            this._logDebug('Revealing element:', element);
            
            if (typeof settings.callback_enter === 'function') {
                settings.callback_enter(element);
            }

            const actualLoad = () => {
                this._logDebug('Starting actual load for:', element);
                _addClass(element, settings.class_loading);

                const src = _getAttribute(element, settings.src);
                const srcset = _getAttribute(element, settings.srcset);
                const sizes = _getAttribute(element, settings.sizes);
                const poster = _getAttribute(element, settings.poster);
                const tagName = element.tagName.toLowerCase();

                if (tagName === 'img') {
                    this._loadImage(element, src, srcset, sizes);
                } else if (tagName === 'picture') {
                    this._loadPicture(element);
                } else if (tagName === 'video') {
                    this._loadVideo(element, poster);
                } else if (tagName === 'iframe') {
                    this._loadIframe(element, src);
                } else { // For background images or other elements using data-src
                    if (src) {
                        element.style.backgroundImage = `url("${src}")`;
                        _removeAttribute(element, settings.src); // Remove data-src after use
                    }
                    this._finishLoading(element, true); // Assume success for backgrounds, no explicit load event
                }
            };

            if (settings.load_delay > 0) {
                this._logDebug(`Delaying load for ${settings.load_delay}ms for element:`, element);
                setTimeout(actualLoad, settings.load_delay);
            } else {
                actualLoad();
            }
        }

        /**
         * Handles loading for <img> elements.
         * @private
         * @param {HTMLImageElement} imgElement - The image element.
         * @param {string|null} src - The value for the src attribute.
         * @param {string|null} srcset - The value for the srcset attribute.
         * @param {string|null} sizes - The value for the sizes attribute.
         */
        _loadImage(imgElement, src, srcset, sizes) {
            const settings = this.settings;

            const onImageLoad = () => {
                this._finishLoading(imgElement, true);
                imgElement.removeEventListener('load', onImageLoad);
                imgElement.removeEventListener('error', onImageError);
            };

            const onImageError = (event) => {
                this._finishLoading(imgElement, false, event);
                imgElement.removeEventListener('load', onImageLoad);
                imgElement.removeEventListener('error', onImageError);
            };

            imgElement.addEventListener('load', onImageLoad);
            imgElement.addEventListener('error', onImageError);
            
            // Use requestAnimationFrame to batch DOM updates for smoother rendering
            if (IS_BROWSER) {
                window.requestAnimationFrame(() => {
                    this._logDebug('Applying src/srcset to img via rAF:', imgElement, {src, srcset, sizes});
                    if (sizes) {
                        imgElement.sizes = sizes;
                        _removeAttribute(imgElement, settings.sizes);
                    }
                    if (srcset) {
                        imgElement.srcset = srcset;
                        _removeAttribute(imgElement, settings.srcset);
                    }
                    if (src) {
                        imgElement.src = src;
                        _removeAttribute(imgElement, settings.src);
                    }
                });
            } else { // Fallback for non-browser environments (e.g., simple tests)
                if (sizes) imgElement.sizes = sizes;
                if (srcset) imgElement.srcset = srcset;
                if (src) imgElement.src = src;
                _removeAttribute(imgElement, settings.sizes);
                _removeAttribute(imgElement, settings.srcset);
                _removeAttribute(imgElement, settings.src);
            }
        }

        /**
         * Handles loading for <picture> elements.
         * It processes <source> children and then the <img> child.
         * @private
         * @param {HTMLPictureElement} pictureElement - The picture element.
         */
        _loadPicture(pictureElement) {
            const settings = this.settings;
            const imgElement = pictureElement.querySelector('img');
            this._logDebug('Loading <picture> element:', pictureElement);

            if (!imgElement) {
                this._finishLoading(pictureElement, false, new Error("LazyLoad: No <img> tag found in <picture>."));
                return;
            }
            
            if (IS_BROWSER) {
                window.requestAnimationFrame(() => {
                    this._logDebug('Applying sources to <picture> via rAF:', pictureElement);
                    Array.from(pictureElement.querySelectorAll('source')).forEach(source => {
                        const srcset = _getAttribute(source, settings.srcset);
                        const sizes = _getAttribute(source, settings.sizes);
                        const media = _getAttribute(source, 'data-media');

                        if (media) { // Allow dynamic media attribute updates
                            source.media = media;
                            _removeAttribute(source, 'data-media');
                        }
                        if (sizes) {
                            source.sizes = sizes;
                            _removeAttribute(source, settings.sizes);
                        }
                        if (srcset) {
                            source.srcset = srcset;
                            _removeAttribute(source, settings.srcset);
                        }
                    });
                    
                    const imgSrc = _getAttribute(imgElement, settings.src);
                    const imgSrcset = _getAttribute(imgElement, settings.srcset);
                    const imgSizes = _getAttribute(imgElement, settings.sizes);
                    this._loadImage(imgElement, imgSrc, imgSrcset, imgSizes); // Delegate to _loadImage for the <img>
                });
            } else {
                // Simplified logic for non-browser (mostly for attribute removal)
                Array.from(pictureElement.querySelectorAll('source')).forEach(source => {
                     _removeAttribute(source, settings.srcset);
                     _removeAttribute(source, settings.sizes);
                     _removeAttribute(source, 'data-media');
                });
                this._loadImage(imgElement, _getAttribute(imgElement, settings.src), null, null);
            }
        }

        /**
         * Handles loading for <video> elements.
         * @private
         * @param {HTMLVideoElement} videoElement - The video element.
         * @param {string|null} poster - The value for the poster attribute.
         */
        _loadVideo(videoElement, poster) {
            const settings = this.settings;
            this._logDebug('Loading <video> element:', videoElement, {poster});
            
            const onCanPlay = () => {
                this._finishLoading(videoElement, true);
                videoElement.removeEventListener('canplaythrough', onCanPlay);
                videoElement.removeEventListener('error', onError);
            };
            const onError = (event) => {
                this._finishLoading(videoElement, false, event);
                videoElement.removeEventListener('canplaythrough', onCanPlay);
                videoElement.removeEventListener('error', onError);
            };

            videoElement.addEventListener('canplaythrough', onCanPlay);
            videoElement.addEventListener('error', onError);

            if (IS_BROWSER) {
                window.requestAnimationFrame(() => {
                    this._logDebug('Applying sources/poster to <video> via rAF:', videoElement);
                    Array.from(videoElement.querySelectorAll('source')).forEach(source => {
                        const src = _getAttribute(source, settings.src);
                        if (src) {
                            source.src = src;
                            _removeAttribute(source, settings.src);
                        }
                    });

                    if (poster) {
                        videoElement.poster = poster;
                        _removeAttribute(videoElement, settings.poster);
                    }
                    videoElement.load(); // Tell the browser to load the video
                });
            } else {
                Array.from(videoElement.querySelectorAll('source')).forEach(source => _removeAttribute(source, settings.src));
                _removeAttribute(videoElement, settings.poster);
            }
        }

        /**
         * Handles loading for <iframe> elements.
         * @private
         * @param {HTMLIFrameElement} iframeElement - The iframe element.
         * @param {string|null} src - The value for the src attribute.
         */
        _loadIframe(iframeElement, src) {
            const settings = this.settings;
            this._logDebug('Loading <iframe> element:', iframeElement, {src});

            const onIframeLoad = () => {
                this._finishLoading(iframeElement, true);
                iframeElement.removeEventListener('load', onIframeLoad);
            };
             // Note: 'error' event on iframes for src loading issues is unreliable across browsers.
             // We primarily rely on the 'load' event.

            iframeElement.addEventListener('load', onIframeLoad);
            
            if (IS_BROWSER) {
                window.requestAnimationFrame(() => {
                    if (src) {
                        iframeElement.src = src;
                        _removeAttribute(iframeElement, settings.src);
                    }
                });
            } else {
                 if (src) iframeElement.src = src;
                 _removeAttribute(iframeElement, settings.src);
            }
        }
        
        /**
         * Finalizes the loading state of an element, applies classes, and triggers callbacks.
         * @private
         * @param {HTMLElement} element - The element that has finished processing.
         * @param {boolean} success - True if loading was successful, false otherwise.
         * @param {Event|Error|null} [errorEvent=null] - The error event or object if loading failed.
         */
        _finishLoading(element, success, errorEvent = null) {
            const settings = this.settings;
            _removeClass(element, settings.class_loading);

            if (success) {
                _addClass(element, settings.class_loaded);
                this._logDebug('Successfully loaded:', element);
                if (typeof settings.callback_load === 'function') {
                    settings.callback_load(element);
                }
            } else {
                _addClass(element, settings.class_error);
                this._logDebug('Error loading element:', element, 'Error Details:', errorEvent);
                if (typeof settings.callback_error === 'function') {
                    settings.callback_error(element, errorEvent);
                }
            }
            if (typeof settings.callback_finish === 'function') {
                settings.callback_finish(element);
            }

            // Clean up all potential data attributes to prevent re-processing
            _removeAttribute(element, settings.src);
            _removeAttribute(element, settings.srcset);
            _removeAttribute(element, settings.sizes);
            _removeAttribute(element, settings.poster);
            _removeAttribute(element, 'data-media'); // For <source> in <picture>
        }

        /**
         * Initializes the IntersectionObserver to monitor elements.
         * If IntersectionObserver is not supported, it loads all elements immediately.
         * @public
         */
        init() {
            if (this._observer && IS_BROWSER) { // If re-initializing
                this._observer.disconnect();
                this._observedByIO.clear();
                this._logDebug('Re-initializing observer.');
            }
            
            const settings = this.settings;
            
            if (!IS_BROWSER || !window.IntersectionObserver) {
                this._logDebug('IntersectionObserver not supported or not in a browser environment. Loading all elements now.');
                this.loadAllNow();
                return;
            }
            
            this._observer = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    const targetElement = entry.target;
                    // Ensure the element is still meant to be observed by this instance
                    if (!this._elementsToObserve.has(targetElement) && !this._observedByIO.has(targetElement)) {
                        observer.unobserve(targetElement);
                        this._observedByIO.delete(targetElement); // Clean up if it was somehow still tracked
                        return;
                    }

                    if (entry.isIntersecting || (settings.skip_invisible && this._isElementVisible(targetElement)) ) {
                        this._logDebug('Element is intersecting or skip_invisible allows:', targetElement);
                        observer.unobserve(targetElement);
                        this._observedByIO.delete(targetElement);
                        this._elementsToObserve.delete(targetElement); // Mark as processed from the queue
                        this._revealElement(targetElement);
                    }
                });
            }, {
                root: settings.root,
                rootMargin: settings.rootMargin,
                threshold: settings.threshold
            });

            this._logDebug(`Attempting to observe ${this._elementsToObserve.size} elements in queue.`);
            this._elementsToObserve.forEach(element => {
                // Only observe if not already being explicitly watched by this IO instance
                if (!this._observedByIO.has(element)) {
                    if (settings.skip_invisible && this._isElementVisible(element)) {
                        this._logDebug('Element already visible (skip_invisible), revealing immediately:', element);
                        this._elementsToObserve.delete(element); // Remove from queue as it's processed now
                        this._revealElement(element);
                    } else {
                        this._observer.observe(element);
                        this._observedByIO.add(element);
                    }
                }
            });
        }

        /**
         * Adds new elements to the list of elements to be lazy-loaded.
         * Elements that are already loaded, errored, or being observed will be skipped.
         * @public
         * @param {NodeList|Array<HTMLElement>|HTMLElement} elementsToAdd - The element(s) to add.
         */
        addElements(elementsToAdd) {
            if (!elementsToAdd) return;
            
            const elementsArray = NodeList.prototype.isPrototypeOf(elementsToAdd) ? Array.from(elementsToAdd) :
                                  Array.isArray(elementsToAdd) ? elementsToAdd : [elementsToAdd];

            let newElementsCount = 0;
            elementsArray.forEach(element => {
                // Check if element is valid, not already in queue, not observed, and not already processed
                if (element instanceof HTMLElement &&
                    !this._elementsToObserve.has(element) &&
                    !this._observedByIO.has(element) &&
                    !element.classList.contains(this.settings.class_loaded) &&
                    !element.classList.contains(this.settings.class_error)) {
                    this._elementsToObserve.add(element);
                    newElementsCount++;
                }
            });

            if (newElementsCount > 0) {
                this._logDebug(`Added ${newElementsCount} new elements to the observation queue.`);
                if (this._observer) { // If observer is active, process new elements
                    this._elementsToObserve.forEach(element => {
                        // Only act on elements not yet handed to the IO
                        if (!this._observedByIO.has(element)) {
                             if (this.settings.skip_invisible && this._isElementVisible(element)) {
                                this._logDebug('Newly added element already visible (skip_invisible), revealing immediately:', element);
                                this._revealElement(element); // Load it
                                this._elementsToObserve.delete(element); // Remove from queue
                            } else {
                                this._observer.observe(element);
                                this._observedByIO.add(element);
                            }
                        }
                    });
                } else if (IS_BROWSER && window.IntersectionObserver) {
                    // If observer wasn't initialized (e.g., no elements on first run) and now we have elements
                    this.init();
                }
            }
        }

        /**
         * Forces the loading of all elements currently in the observation queue,
         * regardless of their visibility. Useful for fallbacks or manual triggers.
         * @public
         */
        loadAllNow() {
            this._logDebug('loadAllNow called. Processing all queued elements.');
            // Iterate over a copy, as _revealElement modifies _elementsToObserve
            const elementsToProcessImmediately = new Set(this._elementsToObserve);
            elementsToProcessImmediately.forEach(element => {
                if (this._elementsToObserve.has(element)) { // Check if still in queue (might have been processed by another call)
                    if (this._observer && this._observedByIO.has(element)) {
                         this._observer.unobserve(element);
                         this._observedByIO.delete(element);
                    }
                    this._elementsToObserve.delete(element); // Remove from queue
                    this._revealElement(element); // Load it
                }
            });
            // Note: This method doesn't destroy the observer itself, allowing for `addElements` later.
            // If full cleanup is needed, `destroy()` should be called.
        }

        /**
         * Re-evaluates and re-observes elements.
         * Disconnects the current observer, optionally re-queries the DOM for elements
         * based on `elements_selector` (if no `newElements` are provided),
         * and starts observing them.
         * @public
         * @param {NodeList|Array<HTMLElement>|HTMLElement} [newElements] - Optional. A new set of elements to observe.
         * If not provided, elements are re-queried using `elements_selector` from the initial settings.
         */
        update(newElements) {
            this._logDebug('update called. Re-evaluating elements.');
            if (this._observer && IS_BROWSER) {
                this._observer.disconnect();
            }
            this._elementsToObserve.clear();
            this._observedByIO.clear();

            const elementsToProcess = newElements || (IS_BROWSER ? Array.from(window.document.querySelectorAll(this.settings.elements_selector)) : []);
            this.addElements(elementsToProcess); // Add valid elements to the queue
            
            if (this._elementsToObserve.size > 0) {
                this.init(); // Re-initialize observer for the new/updated set of elements
            } else {
                 this._logDebug('Update: No elements found or added to observe.');
            }
        }

        /**
         * Stops observing all elements and cleans up the IntersectionObserver instance.
         * This method does not remove any CSS classes (e.g., `class_loaded`)
         * or revert `src` attributes on elements that have already been processed.
         * @public
         */
        destroy() {
            this._logDebug('destroy called. Cleaning up observer and element sets.');
            if (this._observer && IS_BROWSER) {
                this._observer.disconnect();
                this._observer = null; // Release the observer instance
            }
            this._elementsToObserve.clear();
            this._observedByIO.clear();
            // Consider if settings should be nulled if the instance is not meant to be reused:
            // this.settings = null;
        }
    }

    // Optional: jQuery plugin wrapper
    if (IS_BROWSER && window.jQuery) {
        const $ = window.jQuery;
        const JQ_INSTANCE_KEY = 'sajjadAkbariLazyLoadInstance'; // Unique key for storing instance data

        $.fn.lazyload = function (optionsOrMethod) {
            if (typeof optionsOrMethod === 'string') {
                // Calling a method on an existing instance
                const methodName = optionsOrMethod;
                const args = Array.prototype.slice.call(arguments, 1);
                let returnValue = this; // Default to `this` for chainability

                // Iterate over each element in the jQuery collection
                this.each(function() {
                    const instance = $(this).data(JQ_INSTANCE_KEY); // Retrieve instance associated with this element
                    if (instance && typeof instance[methodName] === 'function') {
                        const result = instance[methodName].apply(instance, args);
                        if (result !== undefined && methodName !== 'addElements' && methodName !== 'update' && methodName !== 'destroy' && methodName !== 'loadAllNow') {
                            // If a method returns a value (and it's not a chainable method), capture it.
                            // We typically only care about the return value from the first matched element.
                            returnValue = result;
                            return false; // Break jQuery's .each loop
                        }
                    } else {
                        console.warn(`LazyLoad jQuery: Method '${methodName}' not found on instance or instance not initialized for element:`, this);
                    }
                });
                return returnValue;

            } else {
                // Initialization
                const elements = this.toArray(); // Get DOM elements from jQuery object
                if (elements.length > 0) {
                    // Attempt to get an existing instance from the first element
                    // This assumes a single LazyLoad instance manages the group passed to jQuery.
                    let groupInstance = $(elements[0]).data(JQ_INSTANCE_KEY);

                    if (groupInstance) {
                        // If an instance already exists, add the current elements to it
                        groupInstance.addElements(elements);
                        // Re-associate the instance in case the jQuery collection was different
                        $(elements[0]).data(JQ_INSTANCE_KEY, groupInstance);
                        if (groupInstance.settings.debug) console.log('[LazyLoad jQuery] Added elements to existing instance:', elements);
                    } else {
                        // Create a new instance for this group of elements
                        groupInstance = new LazyLoad(optionsOrMethod, elements);
                        // Store the instance on the first element, so it can be retrieved later for this group.
                        $(elements[0]).data(JQ_INSTANCE_KEY, groupInstance);
                        if (groupInstance.settings.debug) console.log('[LazyLoad jQuery] Created new instance for elements:', elements);
                    }
                }
                return this; // Maintain chainability for initialization
            }
        };
    }

    return LazyLoad;
}));
