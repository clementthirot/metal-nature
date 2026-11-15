// Version testée avec les scènes actuelles. Le viewer est chargé depuis le CDN seulement
// quand une scène 3D doit réellement s'afficher.
const SPLINE_VIEWER_SRC = 'https://unpkg.com/@splinetool/viewer@1.9.26/build/spline-viewer.js';
let splineScriptPromise: Promise<void> | null = null;

export function splineSceneUrl(token: string): string {
    return `https://prod.spline.design/${token}/scene.splinecode`;
}

function loadSplineViewer(): Promise<void> {
    if (!splineScriptPromise) {
        splineScriptPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'module';
            script.src = SPLINE_VIEWER_SRC;
            script.onload = () => resolve();
            script.onerror = () => {
                splineScriptPromise = null;
                reject(new Error('Spline viewer indisponible'));
            };
            document.head.appendChild(script);
        });
    }
    return splineScriptPromise;
}

/** Crée un <spline-viewer> dans `container` (une seule fois par conteneur). */
export function mountSpline(container: HTMLElement | null | undefined, url: string | undefined): void {
    if (!container || !url || container.dataset.splineMounted) return;
    container.dataset.splineMounted = 'true';
    loadSplineViewer()
        .then(() => {
            const viewer = document.createElement('spline-viewer');
            viewer.setAttribute('url', url);
            viewer.setAttribute('loading-anim-type', 'none');
            container.appendChild(viewer);
        })
        .catch(() => {
            delete container.dataset.splineMounted;
        });
}

/** Monte la scène Spline quand le conteneur approche de l'écran. */
export function mountSplineWhenVisible(container: HTMLElement | null, url: string | undefined): void {
    if (!container || !url) return;
    if (!('IntersectionObserver' in window)) {
        mountSpline(container, url);
        return;
    }
    const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
            mountSpline(container, url);
            observer.disconnect();
        }
    }, { rootMargin: '100% 0px' });
    observer.observe(container);
}
