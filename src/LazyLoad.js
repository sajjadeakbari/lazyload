/*!
 * LazyLoad Plus - JavaScript plugin for lazy loading images and other media
 *
 * Copyright (c) 2023-2025 Sajjad Akbari (sajjadakbari.ir)
 * Based on the original work by Mika Tuupola (2007-2019)
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Project home:
 *   https://github.com/sajjadeakbari/lazyload-plus
 *   https://sajjadakbari.ir
 *
 * Version: 4.3.0
 * __VERSION__  // This will be replaced by rollup-plugin-replace
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
        poster: 'data-poster',
        elements_selector: '.lazyload',
        class_loading: 'lazyloading',
        class_loaded: 'lazyloaded',
        class_error: 'lazyerror',
        // IntersectionObserver settings
        root: null,
        rootMargin: '0px',
        threshold: 0,
        // IntersectionObserver v2 settings (optional, browser-dependent)
        track_visibility_v2: false, // Enable IOv2 visibility tracking if supported
        delay_v2: 100,              // IOv2 specific delay for visibility calculation (ms)
        // Behavior settings
        load_delay: 0,
        skip_invisible: false,
        retry_on_online: true,
        retry_backoff_base_ms: 1000, // Base delay for the first retry attempt (ms)
        retry_max_attempts: 5,       // Maximum number of automatic retry attempts
        // Callbacks & Events
        dispatch_events: false, // Dispatch custom events on elements
        callback_enter: null,
        callback_load: null,
        callback_error: null,
        callback_finish: null,
        // Debug
        debug: false,
    };

    /**
     * Merges user-provided options with default options.
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
    
    const _getAttribute = (element, attributeName) => element.getAttribute(attributeName);
    const _removeAttribute = (element, attributeName) => element.removeAttribute(attributeName);

    const _addClass = (element, className) => {
        if (!className || !element) return;
        if (IS_BROWSER) {
            window.requestAnimationFrame(() => {
                element.classList.add(className);
            });
        } else {
            element.classList.add(className);
        }
    };

    const _removeClass = (element, className) => {
        if (!className || !element) return;
        if (IS_BROWSER) {
            window.requestAnimationFrame(() => {
                element.classList.remove(className);
            });
        } else {
            element.classList.remove(className);
        }
    };

    const _dispatchEvent = (element, eventName, detail = {}) => {
        if (!IS_BROWSER || !element || typeof CustomEvent !== 'function') return;
        // Ensure element is part of the detail for easy access
        const eventDetail = { element, ...detail };
        const event = new CustomEvent(eventName, { bubbles: true, cancelable: true, detail: eventDetail });
        element.dispatchEvent(event);
    };


    class LazyLoad {
        constructor(options = {}, elements) {
            this.settings = _extend({}, defaults, options);
            this._observer = null;
            this._elementsToObserve = new Set();
            this._observedByIO = new Set();
            this._errorElements = new Set();
            this._retryData = IS_BROWSER && typeof WeakMap !== 'undefined' ? new WeakMap() : new Map();
            this._onlineHandler = null;
            
            this._logDebug(`Instance created with settings:`, this.settings, `Version: ${typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'N/A'}`);
            
            if (this.settings.retry_on_online) {
                this._setupOnlineListener();
            }
            
            const initialElements = elements || (IS_BROWSER ? Array.from(window.document.querySelectorAll(this.settings.elements_selector)) : []);
            this.addElements(initialElements);
            this.init();
        }

        _logDebug(message, ...args) {
            if (this.settings.debug && typeof console !== 'undefined') {
                console.log('%c[LazyLoad DEBUG]', 'color: #4CAF50; font-weight: bold;', message, ...args);
            }
        }

        _isElementVisible(element) {
            if (!IS_BROWSER || !element || typeof element.getBoundingClientRect !== 'function') return false;
            const rect = element.getBoundingClientRect();
            return (
                rect.top < window.innerHeight && rect.bottom > 0 &&
                rect.left < window.innerWidth && rect.right > 0
            );
        }

        _setupOnlineListener() {
            if (!IS_BROWSER || !window.addEventListener) return;
            this._onlineHandler = () => {
                this._logDebug('Browser came online. Evaluating failed elements for retry.');
                this.retryFailedLoads();
            };
            window.addEventListener('online', this._onlineHandler);
            this._logDebug('Online event listener set up.');
        }

        _removeOnlineListener() {
            if (!IS_BROWSER || !this._onlineHandler || !window.removeEventListener) return;
            window.removeEventListener('online', this._onlineHandler);
            this._onlineHandler = null;
            this._logDebug('Online event listener removed.');
        }
        
        _revealElement(element) {
            const settings = this.settings;
            this._logDebug('Revealing element:', element);
            
            if (typeof settings.callback_enter === 'function') settings.callback_enter(element);
            if (settings.dispatch_events) _dispatchEvent(element, 'lazyload:enter');

            const actualLoad = () => {
                this._logDebug('Starting actual load for:', element);
                if (element.classList.contains(settings.class_error)) {
                    _removeClass(element, settings.class_error);
                }
                this._errorElements.delete(element);
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
                } else { // Background images
                    const loadBgImage = () => {
                        if (src) {
                            element.style.backgroundImage = `url("${src}")`;
                            _removeAttribute(element, settings.src);
                        } else {
                            this._logDebug('Element for background image has no data-src:', element);
                        }
                        this._finishLoading(element, !!src); // Success if src was present
                    };
                    if (IS_BROWSER) window.requestAnimationFrame(loadBgImage); else loadBgImage();
                }
            };

            if (settings.load_delay > 0 && IS_BROWSER && typeof setTimeout === 'function') {
                setTimeout(actualLoad, settings.load_delay);
            } else {
                actualLoad();
            }
        }
        
        _loadImage(imgElement, src, srcset, sizes) {
            const settings = this.settings;
            let hasFired = false;

            const completeLoad = (success, eventOrMessage) => {
                if (hasFired) return; hasFired = true;
                const error = success ? null : (eventOrMessage instanceof Event ? eventOrMessage : new Error(eventOrMessage || "Image failed to load"));
                this._finishLoading(imgElement, success, error);
                imgElement.removeEventListener('load', onImageLoad);
                imgElement.removeEventListener('error', onImageError);
            };

            const onImageLoad = () => completeLoad(true, null);
            const onImageError = (event) => completeLoad(false, event);

            imgElement.addEventListener('load', onImageLoad);
            imgElement.addEventListener('error', onImageError);
            
            const applyImageAttributes = () => {
                this._logDebug('Applying src/srcset to img:', imgElement, {src, srcset, sizes});
                if (sizes) { imgElement.sizes = sizes; _removeAttribute(imgElement, settings.sizes); }
                if (srcset) { imgElement.srcset = srcset; _removeAttribute(imgElement, settings.srcset); }
                if (src) { imgElement.src = src; _removeAttribute(imgElement, settings.src); }
                
                if (!src && !srcset) { // No data attributes were provided to begin with
                    this._logDebug('Img tag was provided with no data-src or data-srcset:', imgElement);
                    // Directly call error handler as there's nothing to load
                    onImageError("Image has no source data (data-src or data-srcset)");
                }
                // If src or srcset were set, the browser will attempt to load and fire 'load' or 'error'
            };

            if (IS_BROWSER) { window.requestAnimationFrame(applyImageAttributes); }
            else { applyImageAttributes(); }
        }

        _loadPicture(pictureElement) {
            const settings = this.settings;
            const imgElement = pictureElement.querySelector('img');
            this._logDebug('Loading <picture> element:', pictureElement);

            if (!imgElement) {
                this._finishLoading(pictureElement, false, new Error("LazyLoad: No <img> tag found in <picture>."));
                return;
            }
            
            const applyPictureAttributes = () => {
                this._logDebug('Applying sources to <picture>:', pictureElement);
                Array.from(pictureElement.querySelectorAll('source')).forEach(source => {
                    const srcsetVal = _getAttribute(source, settings.srcset);
                    const sizesVal = _getAttribute(source, settings.sizes);
                    const mediaVal = _getAttribute(source, 'data-media');

                    if (mediaVal) { source.media = mediaVal; _removeAttribute(source, 'data-media'); }
                    if (sizesVal) { source.sizes = sizesVal; _removeAttribute(source, settings.sizes); }
                    if (srcsetVal) { source.srcset = srcsetVal; _removeAttribute(source, settings.srcset); }
                });
                
                const imgSrc = _getAttribute(imgElement, settings.src);
                const imgSrcset = _getAttribute(imgElement, settings.srcset);
                const imgSizes = _getAttribute(imgElement, settings.sizes);
                this._loadImage(imgElement, imgSrc, imgSrcset, imgSizes); // Delegate to _loadImage for the <img>
            };

            if (IS_BROWSER) { window.requestAnimationFrame(applyPictureAttributes); }
            else { applyPictureAttributes(); }
        }

        _loadVideo(videoElement, poster) {
            const settings = this.settings;
            this._logDebug('Loading <video> element:', videoElement, {poster});
            let hasFired = false;
            
            const completeLoad = (success, event) => {
                if (hasFired) return; hasFired = true;
                this._finishLoading(videoElement, success, event);
                videoElement.removeEventListener('canplaythrough', onCanPlay);
                videoElement.removeEventListener('error', onError);
            };

            const onCanPlay = () => completeLoad(true, null);
            const onError = (event) => completeLoad(false, event);

            videoElement.addEventListener('canplaythrough', onCanPlay);
            videoElement.addEventListener('error', onError);

            const applyVideoAttributes = () => {
                this._logDebug('Applying sources/poster to <video>:', videoElement);
                let hasVideoSources = false;
                Array.from(videoElement.querySelectorAll('source')).forEach(source => {
                    const src = _getAttribute(source, settings.src);
                    if (src) { source.src = src; _removeAttribute(source, settings.src); hasVideoSources = true;}
                });
                if (poster) { videoElement.poster = poster; _removeAttribute(videoElement, settings.poster); }
                
                if (hasVideoSources) {
                    videoElement.load(); // Tell browser to load the sources
                } else {
                    this._logDebug('Video tag has no source elements with data-src:', videoElement);
                    onError(new Error("Video has no valid sources")); // Trigger error if no sources found
                }
            };
            
            if (IS_BROWSER) { window.requestAnimationFrame(applyVideoAttributes); }
            else { applyVideoAttributes(); }
        }

        _loadIframe(iframeElement, src) {
            const settings = this.settings;
            this._logDebug('Loading <iframe> element:', iframeElement, {src});
            let hasFired = false;

            const onIframeLoad = () => {
                if (hasFired) return; hasFired = true;
                this._finishLoading(iframeElement, true);
                iframeElement.removeEventListener('load', onIframeLoad);
                // Note: iframe 'error' event is unreliable for src loading issues
            };
            
            iframeElement.addEventListener('load', onIframeLoad);
            
            const applyIframeAttributes = () => {
                if (src) {
                    iframeElement.src = src;
                    _removeAttribute(iframeElement, settings.src);
                } else {
                    if (hasFired) return; hasFired = true; // Prevent multiple calls to _finishLoading
                    this._logDebug('Iframe tag has no src (from data-src) to load:', iframeElement);
                    this._finishLoading(iframeElement, false, new Error("Iframe has no source (data-src)"));
                    iframeElement.removeEventListener('load', onIframeLoad); // Clean up if erroring early
                }
            };

            if (IS_BROWSER) { window.requestAnimationFrame(applyIframeAttributes); }
            else { applyIframeAttributes(); }
        }
        
        _finishLoading(element, success, errorEvent = null) {
            const settings = this.settings;
            const eventDetail = success ? {} : { error: errorEvent instanceof Error ? errorEvent.message : (errorEvent ? String(errorEvent.type || errorEvent) : 'Unknown error') };
            
            const performFinishActions = () => {
                _removeClass(element, settings.class_loading);
                if (success) {
                    _addClass(element, settings.class_loaded);
                    this._errorElements.delete(element);
                    this._retryData.delete(element);
                    this._logDebug('Successfully loaded:', element);
                    if (typeof settings.callback_load === 'function') settings.callback_load(element);
                    if (settings.dispatch_events) _dispatchEvent(element, 'lazyload:load');
                } else {
                    _addClass(element, settings.class_error);
                    this._errorElements.add(element);
                    // Retry data (count, nextAttemptAt) is managed/updated in retryFailedLoads
                    this._logDebug('Error loading element:', element, 'Error Details:', errorEvent);
                    if (typeof settings.callback_error === 'function') settings.callback_error(element, errorEvent);
                    if (settings.dispatch_events) _dispatchEvent(element, 'lazyload:error', eventDetail);
                }
                if (typeof settings.callback_finish === 'function') settings.callback_finish(element);
                if (settings.dispatch_events) _dispatchEvent(element, 'lazyload:finish', eventDetail);

                _removeAttribute(element, settings.src);
                _removeAttribute(element, settings.srcset);
                _removeAttribute(element, settings.sizes);
                _removeAttribute(element, settings.poster);
                _removeAttribute(element, 'data-media');
            };

            if(IS_BROWSER) window.requestAnimationFrame(performFinishActions); else performFinishActions();
        }

        init() {
            if (this._observer && IS_BROWSER) {
                this._observer.disconnect();
                this._observedByIO.clear();
                this._logDebug('Re-initializing observer.');
            }
            
            const settings = this.settings;
            
            if (!IS_BROWSER || typeof window.IntersectionObserver !== 'function') {
                this._logDebug('IntersectionObserver not supported or not in a browser environment. Loading all elements now.');
                this.loadAllNow();
                return;
            }
            
            const observerOptions = {
                root: settings.root,
                rootMargin: settings.rootMargin,
                threshold: settings.threshold,
            };

            if (settings.track_visibility_v2 && 'isVisible' in IntersectionObserverEntry.prototype) {
                observerOptions.trackVisibility = true;
                observerOptions.delay = parseInt(String(settings.delay_v2), 10) || 100;
                this._logDebug('IntersectionObserver v2 features (trackVisibility, delay) enabled with delay:', observerOptions.delay);
            } else if (settings.track_visibility_v2) {
                this._logDebug('IntersectionObserver v2 (track_visibility_v2) requested but not supported by browser.');
            }
            
            this._observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const targetElement = entry.target;
                    if (!this._elementsToObserve.has(targetElement) && !this._observedByIO.has(targetElement)) {
                        if(this._observer) this._observer.unobserve(targetElement);
                        this._observedByIO.delete(targetElement);
                        return;
                    }

                    let isEffectivelyIntersecting = entry.isIntersecting;
                    if (observerOptions.trackVisibility && 'isVisible' in entry) { // Check if v2 features were active
                        if (entry.isIntersecting && !entry.isVisible) {
                            this._logDebug('Element intersected but is not "visible" (IOv2):', targetElement);
                            isEffectivelyIntersecting = false;
                        } else if (entry.isVisible) { // If IOv2 says it's visible, trust it
                            isEffectivelyIntersecting = true;
                        }
                    }
                    
                    if (isEffectivelyIntersecting || (settings.skip_invisible && this._isElementVisible(targetElement))) {
                        this._logDebug('Element is effectively intersecting or skip_invisible allows:', targetElement);
                        if(this._observer) this._observer.unobserve(targetElement);
                        this._observedByIO.delete(targetElement);
                        this._elementsToObserve.delete(targetElement);
                        this._revealElement(targetElement);
                    }
                });
            }, observerOptions);

            this._logDebug(`Attempting to observe ${this._elementsToObserve.size} elements in queue.`);
            this._elementsToObserve.forEach(element => {
                if (!this._observedByIO.has(element)) {
                    if (settings.skip_invisible && this._isElementVisible(element)) {
                        this._logDebug('Element already visible (skip_invisible), revealing immediately:', element);
                        this._elementsToObserve.delete(element);
                        this._revealElement(element);
                    } else {
                        if(this._observer) this._observer.observe(element);
                        this._observedByIO.add(element);
                    }
                }
            });
        }

        addElements(elementsToAdd) {
            if (!elementsToAdd) return;
            
            const elementsArray = NodeList.prototype.isPrototypeOf(elementsToAdd) ? Array.from(elementsToAdd) :
                                  Array.isArray(elementsToAdd) ? elementsToAdd : [elementsToAdd];

            let newElementsAddedCount = 0;
            let reQueuedErrorCount = 0;

            elementsArray.forEach(element => {
                if (!(element instanceof HTMLElement)) return;

                const isLoaded = element.classList.contains(this.settings.class_loaded);
                const isKnownError = this._errorElements.has(element); // Error tracked by this instance
                const hasErrorClass = element.classList.contains(this.settings.class_error);

                // Conditions to add to _elementsToObserve:
                // 1. Not already in the queue for observation.
                // 2. Not currently being watched by the IntersectionObserver instance.
                // 3. Not already successfully loaded.
                // 4. Not an error that this instance is already tracking (retryFailedLoads handles these).
                if (!this._elementsToObserve.has(element) &&
                    !this._observedByIO.has(element) &&
                    !isLoaded &&
                    !isKnownError) {
                    
                    // If it has an error class but not tracked by this instance, it's an old/external error.
                    // Clean it and prepare for a new observation attempt.
                    if (hasErrorClass) {
                        _removeClass(element, this.settings.class_error);
                        reQueuedErrorCount++;
                    }
                    this._elementsToObserve.add(element);
                    newElementsAddedCount++;
                }
            });

            if (newElementsAddedCount > 0) {
                this._logDebug(`Added ${newElementsAddedCount - reQueuedErrorCount} new elements. Re-queued ${reQueuedErrorCount} elements with previous errors.`);
                if (this._observer) {
                    this._elementsToObserve.forEach(element => {
                        if (!this._observedByIO.has(element)) {
                             if (this.settings.skip_invisible && this._isElementVisible(element)) {
                                this._logDebug('Newly added/re-queued element already visible, revealing immediately:', element);
                                this._elementsToObserve.delete(element); // Processed, remove from queue
                                this._revealElement(element);
                            } else {
                                this._observer.observe(element);
                                this._observedByIO.add(element);
                            }
                        }
                    });
                } else if (IS_BROWSER && typeof window.IntersectionObserver === 'function' && this._elementsToObserve.size > 0) {
                    this.init();
                }
            }
        }

        retryFailedLoads() {
            if (!IS_BROWSER) return;
            
            const elementsToActuallyRetryNow = [];
            const now = Date.now();

            this._logDebug(`Evaluating ${this._errorElements.size} elements for retry (max attempts: ${this.settings.retry_max_attempts}).`);

            if (this._errorElements.size === 0) {
                this._logDebug('No failed elements tracked by this instance to retry.');
                return;
            }

            const elementsPreviouslyInError = Array.from(this._errorElements);
            
            elementsPreviouslyInError.forEach(element => {
                let retryInfo = this._retryData.get(element) || { count: 0, nextAttemptAt: 0 };

                if (retryInfo.count >= this.settings.retry_max_attempts) {
                    this._logDebug('Max retry attempts reached for element:', element, `Attempt count: ${retryInfo.count}`);
                    return; // Element remains in _errorElements, no further auto-retries
                }

                if (now < retryInfo.nextAttemptAt) {
                    const remainingDelay = retryInfo.nextAttemptAt - now;
                    this._logDebug(`Element ${element.tagName} is in backoff. Next attempt in ${remainingDelay}ms.`);
                    return; // Element remains in _errorElements, will be checked on next call
                }

                this._logDebug(`Element ${element.tagName} qualifies for retry attempt #${retryInfo.count + 1}.`);
                // We don't remove from _errorElements here; _revealElement will do it upon starting the load.
                // _removeClass(element, this.settings.class_error) is also handled by _revealElement.
                
                elementsToActuallyRetryNow.push(element);

                retryInfo.count++;
                const backoffDelayForNext = this.settings.retry_backoff_base_ms * (2 ** (retryInfo.count - 1));
                retryInfo.nextAttemptAt = now + backoffDelayForNext;
                this._retryData.set(element, retryInfo);
            });

            if (elementsToActuallyRetryNow.length > 0) {
                this._logDebug(`Re-queuing ${elementsToActuallyRetryNow.length} elements for immediate loading attempt.`);
                // These elements will go through the normal observation flow again via addElements -> init/observe -> _revealElement
                // _revealElement will handle removing class_error and from _errorElements set.
                this.addElements(elementsToActuallyRetryNow);
            } else {
                 this._logDebug('No elements were eligible for immediate retry (all in backoff or max attempts reached).');
            }
        }
        
        loadAllNow() {
            this._logDebug('loadAllNow called. Processing all queued elements.');
            const elementsToProcessImmediately = Array.from(this._elementsToObserve);
            elementsToProcessImmediately.forEach(element => {
                if (this._elementsToObserve.has(element)) { // Check if still in queue
                    if (this._observer && this._observedByIO.has(element)) {
                         this._observer.unobserve(element);
                         this._observedByIO.delete(element);
                    }
                    this._elementsToObserve.delete(element);
                    this._revealElement(element);
                }
            });
        }

        update(newElements) {
            this._logDebug('update called. Re-evaluating elements.');
            if (this._observer && IS_BROWSER) {
                this._observer.disconnect();
            }
            this._elementsToObserve.clear();
            this._observedByIO.clear();
            this._errorElements.clear();
            this._retryData = IS_BROWSER && typeof WeakMap !== 'undefined' ? new WeakMap() : new Map();

            const elementsToProcess = newElements || (IS_BROWSER ? Array.from(window.document.querySelectorAll(this.settings.elements_selector)) : []);
            this.addElements(elementsToProcess);
            
            if (this._elementsToObserve.size > 0) {
                this.init();
            } else {
                 this._logDebug('Update: No elements found or added to observe.');
            }
        }

        destroy() {
            this._logDebug('destroy called. Cleaning up observer and element sets.');
            this._removeOnlineListener();
            if (this._observer && IS_BROWSER) {
                this._observer.disconnect();
                this._observer = null;
            }
            this._elementsToObserve.clear();
            this._observedByIO.clear();
            this._errorElements.clear();
            this._retryData = IS_BROWSER && typeof WeakMap !== 'undefined' ? new WeakMap() : new Map();
        }
    }

    // jQuery plugin wrapper
    if (IS_BROWSER && typeof window.jQuery === 'function') {
        const $ = window.jQuery;
        const JQ_INSTANCE_KEY = 'sajjadAkbariLazyLoadInstance';

        $.fn.lazyload = function (optionsOrMethod) {
            if (typeof optionsOrMethod === 'string') {
                const methodName = optionsOrMethod;
                const args = Array.prototype.slice.call(arguments, 1);
                let returnValue = this;

                this.each(function() {
                    const instance = $(this).data(JQ_INSTANCE_KEY);
                    if (instance && typeof instance[methodName] === 'function') {
                        const result = instance[methodName].apply(instance, args);
                        if (result !== undefined && !['addElements', 'update', 'destroy', 'loadAllNow', 'retryFailedLoads'].includes(methodName) ) {
                            returnValue = result;
                            return false; 
                        }
                    } else {
                        console.warn(`LazyLoad jQuery: Method '${methodName}' not found or instance not initialized on element:`, this);
                    }
                });
                return returnValue;

            } else {
                const elements = this.toArray();
                if (elements.length > 0) {
                    let groupInstance = $(elements[0]).data(JQ_INSTANCE_KEY);
                    if (groupInstance) {
                        groupInstance.addElements(elements);
                         if (groupInstance.settings.debug) console.log('[LazyLoad jQuery] Added elements to existing instance for group starting with:', elements[0]);
                    } else {
                        groupInstance = new LazyLoad(optionsOrMethod, elements);
                        $(elements[0]).data(JQ_INSTANCE_KEY, groupInstance); // Store instance on the first element
                         if (groupInstance.settings.debug) console.log('[LazyLoad jQuery] Created new instance for elements starting with:', elements[0]);
                    }
                }
                return this;
            }
        };
    }

    return LazyLoad;
}));
