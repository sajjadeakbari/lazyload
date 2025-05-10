/*!
 * Lazy Load - JavaScript plugin for lazy loading images and other media
 *
 * Copyright (c) 2023 Sajjad Akbari (sajjadakbari.ir)
 * Based on the original work by Mika Tuupola (2007-2019)
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Project home:
 *   https://sajjadakbari.ir
 *
 * Version: 3.0.0
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(root);
    } else {
        root.LazyLoad = factory(root);
    }
})(typeof global !== 'undefined' ? global : this.window || this.global, function (window) {
    'use strict';

    const defaults = {
        src: 'data-src',
        srcset: 'data-srcset',
        sizes: 'data-sizes', // For responsive images
        elements_selector: '.lazyload',
        class_loading: 'lazyloading',
        class_loaded: 'lazyloaded',
        class_error: 'lazyerror',
        root: null,
        rootMargin: '0px',
        threshold: 0,
        // Callbacks
        callback_enter: null,
        callback_load: null,
        callback_error: null,
        // Skip elements that are already visible on load (useful for above-the-fold content)
        skip_invisible: false
    };

    /**
     * Merges user options with default options.
     * @private
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
     * @param {HTMLElement} element
     * @param {string} attributeName
     * @returns {string|null}
     */
    const _getAttribute = (element, attributeName) => element.getAttribute(attributeName);

    /**
     * @param {HTMLElement} element
     * @param {string} attributeName
     */
    const _removeAttribute = (element, attributeName) => element.removeAttribute(attributeName);

    /**
     * @param {HTMLElement} element
     * @param {string} className
     */
    const _addClass = (element, className) => {
        if (className) {
            element.classList.add(className);
        }
    };

    /**
     * @param {HTMLElement} element
     * @param {string} className
     */
    const _removeClass = (element, className) => {
        if (className) {
            element.classList.remove(className);
        }
    };

    class LazyLoad {
        /**
         * @param {Object} [options] - User options
         * @param {NodeList|Array<HTMLElement>} [elements] - Custom elements to observe
         */
        constructor(options = {}, elements) {
            this.settings = _extend({}, defaults, options);
            this._observer = null;
            this._elements = elements || Array.from(window.document.querySelectorAll(this.settings.elements_selector));
            this.init();
        }

        _revealElement(element) {
            const settings = this.settings;
            
            if (settings.callback_enter) {
                settings.callback_enter(element);
            }

            _addClass(element, settings.class_loading);

            const src = _getAttribute(element, settings.src);
            const srcset = _getAttribute(element, settings.srcset);
            const sizes = _getAttribute(element, settings.sizes);

            const tagName = element.tagName.toLowerCase();

            if (tagName === 'img') {
                this._loadImage(element, src, srcset, sizes);
            } else if (tagName === 'picture') {
                this._loadPicture(element, src, srcset, sizes);
            } else if (tagName === 'video') {
                this._loadVideo(element);
            } else { // For background images or other elements
                if (src) {
                    element.style.backgroundImage = `url("${src}")`;
                }
                this._finishLoading(element, true); // Assume success for background images
            }
        }

        _loadImage(imgElement, src, srcset, sizes) {
            const settings = this.settings;

            const onImageLoad = () => {
                this._finishLoading(imgElement, true);
                imgElement.removeEventListener('load', onImageLoad);
                imgElement.removeEventListener('error', onImageError);
            };

            const onImageError = () => {
                this._finishLoading(imgElement, false);
                imgElement.removeEventListener('load', onImageLoad);
                imgElement.removeEventListener('error', onImageError);
            };

            imgElement.addEventListener('load', onImageLoad);
            imgElement.addEventListener('error', onImageError);
            
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
        }

        _loadPicture(pictureElement, defaultSrc, defaultSrcset, defaultSizes) {
            const settings = this.settings;
            const imgElement = pictureElement.querySelector('img');

            if (!imgElement) {
                this._finishLoading(pictureElement, false, "No <img> tag found in <picture>.");
                return;
            }

            Array.from(pictureElement.querySelectorAll('source')).forEach(source => {
                const srcset = _getAttribute(source, settings.srcset);
                const sizes = _getAttribute(source, settings.sizes); // Although sizes is usually on <img>
                if (srcset) {
                    source.srcset = srcset;
                    _removeAttribute(source, settings.srcset);
                }
                if (sizes) { // typically not needed on source if img has sizes
                    source.sizes = sizes;
                     _removeAttribute(source, settings.sizes);
                }
            });
            
            // Load the main img tag within picture
            const imgSrc = _getAttribute(imgElement, settings.src) || defaultSrc;
            const imgSrcset = _getAttribute(imgElement, settings.srcset) || defaultSrcset;
            const imgSizes = _getAttribute(imgElement, settings.sizes) || defaultSizes;

            this._loadImage(imgElement, imgSrc, imgSrcset, imgSizes);
            // The load/error events will be on the imgElement
        }

        _loadVideo(videoElement) {
            const settings = this.settings;
            Array.from(videoElement.querySelectorAll('source')).forEach(source => {
                const src = _getAttribute(source, settings.src);
                if (src) {
                    source.src = src;
                    _removeAttribute(source, settings.src);
                }
            });

            const poster = _getAttribute(videoElement, 'data-poster');
            if (poster) {
                videoElement.poster = poster;
                _removeAttribute(videoElement, 'data-poster');
            }

            videoElement.load(); // Triggers browser to load sources
            this._finishLoading(videoElement, true); // Assume success, specific events could be added
        }
        
        _finishLoading(element, success, errorMessage = '') {
            const settings = this.settings;
            _removeClass(element, settings.class_loading);

            if (success) {
                _addClass(element, settings.class_loaded);
                if (settings.callback_load) {
                    settings.callback_load(element);
                }
            } else {
                _addClass(element, settings.class_error);
                if (settings.callback_error) {
                    settings.callback_error(element, errorMessage);
                }
                console.error(`LazyLoad Error: Could not load ${element.tagName}`, element, errorMessage);
            }

            // Clean up data attributes to prevent re-processing if somehow re-observed
            _removeAttribute(element, settings.src);
            _removeAttribute(element, settings.srcset);
            _removeAttribute(element, settings.sizes);
            if (element.tagName.toLowerCase() === 'video') {
                _removeAttribute(element, 'data-poster');
            }
        }

        init() {
            if (!window.IntersectionObserver) {
                this.loadAllNow(); // Fallback for older browsers
                console.warn("LazyLoad: IntersectionObserver not supported, loading all images immediately.");
                return;
            }

            if (this._observer) { // Already initialized
                this._observer.disconnect();
            }
            
            const settings = this.settings;
            this._observer = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting || (settings.skip_invisible && entry.boundingClientRect.top < window.innerHeight)) {
                        observer.unobserve(entry.target);
                        this._revealElement(entry.target);
                    }
                });
            }, {
                root: settings.root,
                rootMargin: settings.rootMargin,
                threshold: settings.threshold
            });

            this._elements.forEach(element => {
                 if (settings.skip_invisible && element.getBoundingClientRect().top < window.innerHeight && element.getBoundingClientRect().bottom > 0) {
                    // Element is already visible
                    this._revealElement(element);
                } else {
                    this._observer.observe(element);
                }
            });
        }

        /**
         * Loads all elements immediately.
         */
        loadAllNow() {
            this._elements.forEach(element => this._revealElement(element));
            this.destroy(); // No need to observe anymore
        }

        /**
         * Updates the list of elements to observe. Useful if new elements are added to the DOM.
         * @param {NodeList|Array<HTMLElement>} [newElements] - New elements to observe. If not provided, re-queries based on selector.
         */
        update(newElements) {
            if (this._observer) {
                this._observer.disconnect();
            }
            this._elements = newElements || Array.from(window.document.querySelectorAll(this.settings.elements_selector));
            if (this._elements.length > 0) {
                this.init();
            }
        }

        /**
         * Stops observing all elements and cleans up.
         */
        destroy() {
            if (this._observer) {
                this._observer.disconnect();
                this._observer = null;
            }
            this._elements = []; // Clear elements
            // Note: It doesn't remove classes or revert src attributes, as elements might be loaded.
        }
    }

    // Optional: jQuery plugin wrapper
    if (window.jQuery) {
        const $ = window.jQuery;
        $.fn.lazyload = function (options) {
            const elements = this.toArray(); // Get plain DOM elements from jQuery object
            new LazyLoad(options, elements);
            return this; // Maintain chainability
        };
    }

    return LazyLoad;
});
