const SPLINE_VIEWER_SRC = 'https://unpkg.com/@splinetool/viewer@1.9.26/build/spline-viewer.js';
let splineScriptPromise = null;

/** Vrai si l'utilisateur a demandé à réduire les animations (réglage système). */
function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Charge le script du viewer Spline une seule fois, et seulement quand une scène 3D est réellement affichée. */
function loadSplineViewer() {
    if (!splineScriptPromise) {
        splineScriptPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'module';
            script.src = SPLINE_VIEWER_SRC;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    return splineScriptPromise;
}

/** Crée un <spline-viewer> dans `container` (une seule fois par conteneur). */
function mountSpline(container, url) {
    if (!container || container.dataset.splineMounted) return;
    container.dataset.splineMounted = 'true';
    loadSplineViewer()
        .then(() => {
            const viewer = document.createElement('spline-viewer');
            viewer.setAttribute('url', url);
            viewer.setAttribute('loading-anim-type', 'none');
            container.appendChild(viewer);
        })
        .catch(() => {
            container.dataset.splineMounted = '';
        });
}

/** Monte la scène Spline quand le conteneur approche de l'écran. */
function mountSplineWhenVisible(container, url) {
    if (!container) return;
    if (!('IntersectionObserver' in window)) {
        mountSpline(container, url);
        return;
    }
    const observer = new IntersectionObserver((entries) => {
        if (entries.some(entry => entry.isIntersecting)) {
            mountSpline(container, url);
            observer.disconnect();
        }
    }, {rootMargin: '100% 0px'});
    observer.observe(container);
}

function simpleTrigger(element, params) {
    gsap.to(element, {
        scrollTrigger: {
            trigger: element,
            start: triggerStart,
            toggleActions: 'play none none none',
        },
        ...params
    });
}

function buildScrollTimeline(trigger, scrub = false) {
    return gsap.timeline({
        scrollTrigger: {
            trigger: trigger,
            start: scrollTriggerStart,
            scrub: scrub,
        }
    });
}

/**
 * Découpe le texte d'un élément en mots animables.
 * Le texte intégral reste lisible par les lecteurs d'écran (span .sr-only),
 * les mots découpés sont masqués des technologies d'assistance.
 */
function splitParagraphToWords(element) {
    const text = element.textContent.trim().replace(/\s+/g, ' ');
    const srText = document.createElement('span');
    srText.className = 'sr-only';
    srText.textContent = text;

    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');

    const words = [];
    text.split(' ').forEach((word, index) => {
        const container = document.createElement('span');
        container.className = 'animate-word-container';
        const inner = document.createElement('span');
        inner.className = 'animate-word';
        inner.textContent = word;
        container.appendChild(inner);
        if (index > 0) visual.appendChild(document.createTextNode(' '));
        visual.appendChild(container);
        words.push(inner);
    });

    element.replaceChildren(srText, visual);
    return words;
}
