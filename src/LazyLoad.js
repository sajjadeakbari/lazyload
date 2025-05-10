/*!
 * LazyLoad.js - JavaScript plugin for lazy loading images and other media
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
 * Version: 4.2.0
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof exports === 'object' && typeof module !== 'undefined') {
        module.exports = factory();
    } else {
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
        root: null,
        rootMargin: '0px',
        threshold: 0,
        load_delay: 0,
        skip_invisible: false,
        retry_on_online: true,
        retry_backoff_base_ms: 1000, // Base delay for the first retry attempt (ms)
        retry_max_attempts: 5,       // Maximum number of automatic retry attempts
        callback_enter: null,
        callback_load: null,
        callback_error: null,
        callback_finish: null,
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

    // Helper to add class, wrapped in rAF if in browser
    const _addClass = (element, className) => {
        if (!className) return;
        if (IS_BROWSER) {
            window.requestAnimationFrame(() => {
                element.classList.add(className);
            });
        } else {
            element.classList.add(className);
        }
    };

    // Helper to remove class, wrapped in rAF if in browser
    const _removeClass = (element, className) => {
        if (!className) return;
        if (IS_BROWSER) {
            window.requestAnimationFrame(() => {
                element.classList.remove(className);
            });
        } else {
            element.classList.remove(className);
        }
    };

    class LazyLoad {
        constructor(options = {}, elements) {
            this.settings = _extend({}, defaults, options);
            this._observer = null;
            this._elementsToObserve = new Set();
            this._observedByIO = new Set();
            this._errorElements = new Set();
            // Use WeakMap in browser for element keys to allow garbage collection if elements are removed from DOM
            // Use Map as a fallback for non-browser environments (e.g., tests not fully mocking WeakMap or Node.js usage)
            this._retryData = IS_BROWSER && typeof WeakMap !== 'undefined' ? new WeakMap() : new Map();
            this._onlineHandler = null;
            
            this._logDebug('Instance created with settings:', this.settings);
            
            if (this.settings.retry_on_online) {
                this._setupOnlineListener();
            }
            
            const initialElements = elements || (IS_BROWSER ? Array.from(window.document.querySelectorAll(this.settings.elements_selector)) : []);
            this.addElements(initialElements);
            this.init();
        }

        _logDebug(message, ...args) {
            if (this.settings.debug) {
                console.log('%c[LazyLoad DEBUG]', 'color: #4CAF50; font-weight: bold;', message, ...args);
            }
        }

        _isElementVisible(element) {
            if (!IS_BROWSER || !element.getBoundingClientRect) return false;
            const rect = element.getBoundingClientRect();
            return (
                rect.top < window.innerHeight && rect.bottom > 0 &&
                rect.left < window.innerWidth && rect.right > 0
            );
        }

        _setupOnlineListener() {
            if (!IS_BROWSER) return;
            this._onlineHandler = () => {
                this._logDebug('Browser came online. Evaluating failed elements for retry.');
                this.retryFailedLoads();
            };
            window.addEventListener('online', this._onlineHandler);
            this._logDebug('Online event listener set up.');
        }

        _removeOnlineListener() {
            if (!IS_BROWSER || !this._onlineHandler) return;
            window.removeEventListener('online', this._onlineHandler);
            this._onlineHandler = null;
            this._logDebug('Online event listener removed.');
        }
        
        _revealElement(element) {
            const settings = this.settings;
            this._logDebug('Revealing element:', element);
            
            if (typeof settings.callback_enter === 'function') {
                settings.callback_enter(element);
            }

            const actualLoad = () => {
                this._logDebug('Starting actual load for:', element);
                // Ensure error class is removed and element is removed from error set as we are attempting to load/retry
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
                        }
                        this._finishLoading(element, true); // Assume success for backgrounds
                    };
                    if (IS_BROWSER) window.requestAnimationFrame(loadBgImage); else loadBgImage();
                }
            };

            if (settings.load_delay > 0 && IS_BROWSER) {
                setTimeout(actualLoad, settings.load_delay);
            } else {
                actualLoad();
            }
        }
        
        _loadImage(imgElement, src, srcset, sizes) {
            const settings = this.settings;
            let hasFired = false; // Prevent multiple firings of finishLoading

            const onImageLoad = () => {
                if (hasFired) return; hasFired = true;
                this._finishLoading(imgElement, true);
                imgElement.removeEventListener('load', onImageLoad);
                imgElement.removeEventListener('error', onImageError);
            };

            const onImageError = (event) => {
                if (hasFired) return; hasFired = true;
                this._finishLoading(imgElement, false, event instanceof Event ? event : new Error(event || "Image failed to load"));
                imgElement.removeEventListener('load', onImageLoad);
                imgElement.removeEventListener('error', onImageError);
            };

            imgElement.addEventListener('load', onImageLoad);
            imgElement.addEventListener('error', onImageError);
            
            const applyImageAttributes = () => {
                this._logDebug('Applying src/srcset to img:', imgElement, {src, srcset, sizes});
                if (sizes) { imgElement.sizes = sizes; _removeAttribute(imgElement, settings.sizes); }
                if (srcset) { imgElement.srcset = srcset; _removeAttribute(imgElement, settings.srcset); }
                if (src) { imgElement.src = src; _removeAttribute(imgElement, settings.src); }
                
                // If, after attempting to set, the img still has no effective source, trigger an error.
                // This check is crucial after attributes are applied.
                // Browsers might clear src if srcset is valid, or vice-versa. Check final state.
                // A more robust check might involve checking `imgElement.currentSrc` after a tick, but that's async.
                // For simplicity, if both data-src and data-srcset were initially null/empty, it's an issue.
                if (!src && !srcset) { // If no data attributes were provided to begin with
                    this._logDebug('Img tag was provided with no data-src or data-srcset:', imgElement);
                    onImageError("Image has no source data (data-src or data-srcset)");
                } else if (imgElement.getAttribute('src') === null && imgElement.getAttribute('srcset') === null && !imgElement.src && !imgElement.srcset) {
                    // This case is harder to detect reliably without async checks like currentSrc
                    // For now, rely on browser's own error event if src/srcset becomes invalid after processing.
                }
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
                    const srcset = _getAttribute(source, settings.srcset);
                    const sizes = _getAttribute(source, settings.sizes);
                    const media = _getAttribute(source, 'data-media');

                    if (media) { source.media = media; _removeAttribute(source, 'data-media'); }
                    if (sizes) { source.sizes = sizes; _removeAttribute(source, settings.sizes); }
                    if (srcset) { source.srcset = srcset; _removeAttribute(source, settings.srcset); }
                });
                
                const imgSrc = _getAttribute(imgElement, settings.src);
                const imgSrcset = _getAttribute(imgElement, settings.srcset);
                const imgSizes = _getAttribute(imgElement, settings.sizes);
                this._loadImage(imgElement, imgSrc, imgSrcset, imgSizes);
            };

            if (IS_BROWSER) { window.requestAnimationFrame(applyPictureAttributes); }
            else { applyPictureAttributes(); }
        }

        _loadVideo(videoElement, poster) {
            const settings = this.settings;
            this._logDebug('Loading <video> element:', videoElement, {poster});
            let hasFired = false;
            
            const onCanPlay = () => {
                if (hasFired) return; hasFired = true;
                this._finishLoading(videoElement, true);
                videoElement.removeEventListener('canplaythrough', onCanPlay);
                videoElement.removeEventListener('error', onError);
            };
            const onError = (event) => {
                if (hasFired) return; hasFired = true;
                this._finishLoading(videoElement, false, event);
                videoElement.removeEventListener('canplaythrough', onCanPlay);
                videoElement.removeEventListener('error', onError);
            };

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
                    videoElement.load();
                } else {
                    this._logDebug('Video tag has no source elements with data-src:', videoElement);
                    onError(new Error("Video has no sources"));
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
            };
            
            iframeElement.addEventListener('load', onIframeLoad);
            
            const applyIframeAttributes = () => {
                if (src) {
                    iframeElement.src = src;
                    _removeAttribute(iframeElement, settings.src);
                } else {
                    if (hasFired) return; hasFired = true;
                    this._logDebug('Iframe tag has no src to load:', iframeElement);
                    this._finishLoading(iframeElement, false, new Error("Iframe has no source (data-src)"));
                    iframeElement.removeEventListener('load', onIframeLoad); // Clean up if erroring early
                }
            };

            if (IS_BROWSER) { window.requestAnimationFrame(applyIframeAttributes); }
            else { applyIframeAttributes(); }
        }
        
        _finishLoading(element, success, errorEvent = null) {
            const settings = this.settings;
            // Ensure class changes happen in next frame to be consistent
            const performClassChanges = () => {
                _removeClass(element, settings.class_loading);
                if (success) {
                    _addClass(element, settings.class_loaded);
                    this._errorElements.delete(element);
                    this._retryData.delete(element);
                    this._logDebug('Successfully loaded:', element);
                    if (typeof settings.callback_load === 'function') settings.callback_load(element);
                } else {
                    _addClass(element, settings.class_error);
                    this._errorElements.add(element);
                    let retryInfo = this._retryData.get(element) || { count: 0, nextAttemptAt: 0 };
                    this._logDebug('Error loading element:', element, 'Error Details:', errorEvent, 'Retry info:', retryInfo);
                    if (typeof settings.callback_error === 'function') settings.callback_error(element, errorEvent);
                }
                if (typeof settings.callback_finish === 'function') settings.callback_finish(element);

                _removeAttribute(element, settings.src);
                _removeAttribute(element, settings.srcset);
                _removeAttribute(element, settings.sizes);
                _removeAttribute(element, settings.poster);
                _removeAttribute(element, 'data-media');
            };
            if(IS_BROWSER) window.requestAnimationFrame(performClassChanges); else performClassChanges();
        }

        init() {
            if (this._observer && IS_BROWSER) {
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
            
            this._observer = new IntersectionObserver((entries) => { // Removed 'observer' param as it's not used
                entries.forEach(entry => {
                    const targetElement = entry.target;
                    if (!this._elementsToObserve.has(targetElement) && !this._observedByIO.has(targetElement)) {
                        if(this._observer) this._observer.unobserve(targetElement); // Ensure unobserve if observer still exists
                        this._observedByIO.delete(targetElement);
                        return;
                    }

                    if (entry.isIntersecting || (settings.skip_invisible && this._isElementVisible(targetElement)) ) {
                        this._logDebug('Element is intersecting or skip_invisible allows:', targetElement);
                        if(this._observer) this._observer.unobserve(targetElement);
                        this._observedByIO.delete(targetElement);
                        this._elementsToObserve.delete(targetElement);
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
                if (!this._observedByIO.has(element)) {
                    if (settings.skip_invisible && this._isElementVisible(element)) {
                        this._logDebug('Element already visible (skip_invisible), revealing immediately:', element);
                        this._elementsToObserve.delete(element); // Remove from queue as it's processed
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

            let newElementsCount = 0;
            elementsArray.forEach(element => {
                const isAlreadyProcessed = element.classList.contains(this.settings.class_loaded) ||
                                         (element.classList.contains(this.settings.class_error) && this._errorElements.has(element)); // Check if it's an error we are already tracking for retry

                if (element instanceof HTMLElement &&
                    !this._elementsToObserve.has(element) &&
                    !this._observedByIO.has(element) &&
                    !isAlreadyProcessed) {
                    
                    // If it has an error class but not in our _errorElements, it might be an old error.
                    // We'll clear the class and let it be re-evaluated.
                    if (element.classList.contains(this.settings.class_error)) {
                        _removeClass(element, this.settings.class_error);
                    }

                    this._elementsToObserve.add(element);
                    newElementsCount++;
                }
            });

            if (newElementsCount > 0) {
                this._logDebug(`Added/Re-queued ${newElementsCount} elements.`);
                // If observer is active, new elements need to be observed or processed
                // If not active (e.g. IO not supported), init() or loadAllNow() will handle them.
                if (this._observer) {
                    this._elementsToObserve.forEach(element => {
                        if (!this._observedByIO.has(element)) { // Only act on elements not yet handed to the IO
                             if (this.settings.skip_invisible && this._isElementVisible(element)) {
                                this._logDebug('Newly added/re-queued element already visible, revealing immediately:', element);
                                this._revealElement(element);
                                this._elementsToObserve.delete(element); // Remove from queue as it's processed
                            } else {
                                this._observer.observe(element);
                                this._observedByIO.add(element);
                            }
                        }
                    });
                } else if (IS_BROWSER && window.IntersectionObserver && this._elementsToObserve.size > 0) {
                    // If observer wasn't initialized (e.g. no elements on first run, or IO not supported previously)
                    // and now we have elements and IO support, initialize.
                    this.init();
                }
            }
        }

        retryFailedLoads() {
            if (!IS_BROWSER) return;
            
            const elementsToActuallyRetryNow = [];
            const now = Date.now();
            // let minNextDelay = Infinity; // Not used for now, as we don't auto-reschedule

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
                    // Element remains in _errorElements to signify it's permanently failed for this instance's auto-retry logic
                    return;
                }

                if (now < retryInfo.nextAttemptAt) {
                    const remainingDelay = retryInfo.nextAttemptAt - now;
                    this._logDebug(`Element ${element.tagName} is in backoff. Next attempt in ${remainingDelay}ms.`);
                    // Element remains in _errorElements, will be checked on next call or online event
                    return;
                }

                // Qualified for retry attempt
                this._logDebug(`Element ${element.tagName} qualifies for retry attempt #${retryInfo.count + 1}.`);
                this._errorElements.delete(element); // Remove from current error set as we are attempting
                // _removeClass is handled in _revealElement
                
                elementsToActuallyRetryNow.push(element);

                retryInfo.count++;
                // Calculate delay for the *next* attempt if *this* one also fails
                const backoffDelayForNext = this.settings.retry_backoff_base_ms * (2 ** (retryInfo.count -1)); // count is already incremented
                retryInfo.nextAttemptAt = now + backoffDelayForNext;
                this._retryData.set(element, retryInfo);
            });

            if (elementsToActuallyRetryNow.length > 0) {
                this._logDebug(`Re-queuing ${elementsToActuallyRetryNow.length} elements for immediate loading attempt.`);
                // These elements will go through _revealElement, which clears class_error and _errorElements set again
                this.addElements(elementsToActuallyRetryNow);
            } else {
                 this._logDebug('No elements were eligible for immediate retry (all in backoff or max attempts reached).');
            }
        }
        
        loadAllNow() {
            this._logDebug('loadAllNow called. Processing all queued elements.');
            const elementsToProcessImmediately = Array.from(this._elementsToObserve); // Iterate over a copy
            elementsToProcessImmediately.forEach(element => {
                // Check if still in queue, as _revealElement modifies the set
                if (this._elementsToObserve.has(element)) {
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
            // For _retryData (WeakMap), entries for elements no longer relevant will be GC'd.
            // If it were a Map, we might need to selectively clear it or clear it entirely.
            // Since it's a WeakMap, direct clearing of all entries isn't standard.
            // Re-instantiating it is one way if a full reset of retry state is desired on update.
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
            this._retryData = IS_BROWSER && typeof WeakMap !== 'undefined' ? new WeakMap() : new Map(); // Reset retry data
        }
    }

    // jQuery plugin wrapper
    if (IS_BROWSER && window.jQuery) {
        const $ = window.jQuery;
        const JQ_INSTANCE_KEY = 'sajjadAkbariLazyLoadInstance';

        $.fn.lazyload = function (optionsOrMethod) {
            // ... (کد پلاگین jQuery بدون تغییر باقی می‌ماند)
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
                    // Check if an instance is already associated with the *first* element of the collection.
                    // This assumes one LazyLoad instance manages the group.
                    let groupInstance = $(elements[0]).data(JQ_INSTANCE_KEY);
                    if (groupInstance) {
                        // If instance exists, update it with the current set of elements
                        groupInstance.addElements(elements);
                        // Ensure all elements in the current jQuery collection point to this instance if needed,
                        // though typically only the first element might hold the primary reference.
                        // For simplicity, we assume the first element's instance is the group's instance.
                         if (groupInstance.settings.debug) console.log('[LazyLoad jQuery] Added elements to existing instance for group starting with:', elements[0]);
                    } else {
                        groupInstance = new LazyLoad(optionsOrMethod, elements);
                        // Store the instance on the first element of the collection.
                        $(elements[0]).data(JQ_INSTANCE_KEY, groupInstance);
                         if (groupInstance.settings.debug) console.log('[LazyLoad jQuery] Created new instance for elements starting with:', elements[0]);
                    }
                }
                return this;
            }
        };
    }

    return LazyLoad;
}));
