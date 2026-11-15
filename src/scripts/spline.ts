/**
 * Scènes 3D Spline (lot 5.2).
 * - Runtime installé via npm et chargé en import() dynamique (plus de CDN unpkg).
 * - Un seul canvas par emplacement : la fenêtre de détail recharge la scène active.
 * - Résolution plafonnée (DPR 1,5) et rendu stoppé hors écran.
 * - Sur mobile / appareil modeste / économie de données : image + bouton « Voir en 3D ».
 */
import type { Application } from '@splinetool/runtime';
import { prefersReducedMotion } from './motion';

const MAX_PIXEL_RATIO = 1.5;

export function splineSceneUrl(token: string): string {
    return `https://prod.spline.design/${token}/scene.splinecode`;
}

/** Vrai quand il vaut mieux ne pas charger la 3D automatiquement. */
export function isLightDevice(): boolean {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    return window.matchMedia('(max-width: 768px)').matches
        || Boolean(connection?.saveData)
        || (navigator.hardwareConcurrency ?? 8) <= 4
        || prefersReducedMotion();
}

/** Exécute `task` quand le navigateur est disponible, pour ne pas bloquer l'interface. */
export function whenIdle(task: () => void, timeout = 1500): void {
    if ('requestIdleCallback' in window) window.requestIdleCallback(task, { timeout });
    else window.setTimeout(task, 200);
}

/** Laisse le navigateur souffler entre deux étapes coûteuses (découpe les tâches longues). */
const nextIdle = () => new Promise<void>((resolve) => whenIdle(() => resolve(), 500));

let runtimePromise: Promise<typeof import('@splinetool/runtime')> | null = null;
const loadRuntime = () => (runtimePromise ??= import('@splinetool/runtime'));

type StageState = 'idle' | 'loading' | 'ready' | 'error';

export class SplineStage {
    readonly container: HTMLElement;
    private canvas: HTMLCanvasElement | null = null;
    private app: Application | null = null;
    private currentUrl: string | null = null;
    private pendingUrl: string | null = null;
    private visible = true;
    private active = true;
    private observer: IntersectionObserver | null = null;
    private resolveReady!: (app: Application) => void;
    /** Résolue au premier chargement réussi d'une scène. */
    readonly ready: Promise<Application> = new Promise((resolve) => { this.resolveReady = resolve; });

    constructor(container: HTMLElement) {
        this.container = container;
        this.setState('idle');
    }

    private setState(state: StageState): void {
        this.container.dataset.splineState = state;
    }

    get isReady(): boolean {
        return this.container.dataset.splineState === 'ready';
    }

    /** Charge (ou remplace) la scène affichée. */
    async load(url: string): Promise<void> {
        if (url === this.currentUrl || url === this.pendingUrl) return;
        this.pendingUrl = url;
        this.setState('loading');
        try {
            const { Application } = await loadRuntime();
            await nextIdle();
            if (!this.app) {
                this.capPixelRatio();
                this.canvas = document.createElement('canvas');
                this.canvas.className = 'spline-canvas';
                this.container.appendChild(this.canvas);
                this.app = new Application(this.canvas, { renderMode: 'auto' });
                // Référence accessible depuis la console pour le débogage.
                (this.container as HTMLElement & { splineApp?: Application }).splineApp = this.app;
            }
            await nextIdle();
            await this.app.load(url);
            if (this.pendingUrl !== url) return; // une autre scène a été demandée entre-temps
            this.currentUrl = url;
            this.pendingUrl = null;
            this.setState('ready');
            this.resolveReady(this.app);
            this.sync();
        } catch {
            this.pendingUrl = null;
            this.setState('error');
        }
    }

    /**
     * Le runtime Spline relit window.devicePixelRatio à chaque redimensionnement
     * (via son pipeline de rendu). On plafonne donc la valeur lue en JavaScript.
     * Sans effet sur le CSS ni sur le choix des images (srcset), gérés par le navigateur.
     */
    private capPixelRatio(): void {
        if ((window as Window & { __dprCapped?: boolean }).__dprCapped) return;
        const descriptor = Object.getOwnPropertyDescriptor(Window.prototype, 'devicePixelRatio')
            ?? Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
        const read = descriptor?.get;
        if (!read) return;
        try {
            Object.defineProperty(window, 'devicePixelRatio', {
                configurable: true,
                get: () => Math.min(read.call(window), MAX_PIXEL_RATIO),
            });
            (window as Window & { __dprCapped?: boolean }).__dprCapped = true;
        } catch {
            /* navigateur qui refuse la redéfinition : on garde la résolution native */
        }
    }

    /** Joue la scène seulement si elle est visible et active. */
    private sync(): void {
        if (!this.app || !this.isReady) return;
        if (this.visible && this.active) this.app.play();
        else this.app.stop();
    }

    /**
     * Les événements « Scroll » d'une scène Spline lisent window.scrollY en pixels absolus.
     * `mapY` convertit la position réelle en position « virtuelle » attendue par la scène,
     * ce qui permet de jouer une scène prévue pour un long défilement sur une piste plus courte.
     */
    remapScroll(mapY: (scrollY: number) => number): boolean {
        const handler = (this.app as unknown as {
            _eventManager?: { handlers?: { Scroll?: {
                onScroll: EventListener;
                isInview: boolean;
                scrollEventsPerObject: Map<{ dispatchEvent: (e: object) => void }, { dispatch: (t: object) => void }[]>;
            } } };
        } | null)?._eventManager?.handlers?.Scroll;
        if (!handler?.scrollEventsPerObject || typeof handler.onScroll !== 'function') return false;

        const original = handler.onScroll;
        window.removeEventListener('scroll', original);
        window.removeEventListener('scroll', original, true);
        document.removeEventListener('scroll', original);

        const onScroll = () => {
            if (!handler.isInview) return;
            const position = { y: mapY(window.scrollY), x: window.scrollX };
            handler.scrollEventsPerObject.forEach((events, object) => {
                object.dispatchEvent({ type: 'beginEvent', eventName: 'Scroll', scroll: position });
                events.forEach((event) => event.dispatch(position));
            });
        };
        handler.onScroll = onScroll;
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return true;
    }

    setActive(active: boolean): void {
        this.active = active;
        this.sync();
    }

    /** Stoppe le rendu quand l'emplacement sort de l'écran. */
    pauseWhenHidden(): void {
        if (this.observer || !('IntersectionObserver' in window)) return;
        this.observer = new IntersectionObserver((entries) => {
            this.visible = entries.some((entry) => entry.isIntersecting);
            this.sync();
        });
        this.observer.observe(this.container);
    }
}

/**
 * Prépare un emplacement 3D avec son image de repli :
 * chargement automatique à l'approche de l'écran, ou bouton « Voir en 3D » sur appareil léger.
 */
export function setupLazyStage(container: HTMLElement, url: string): SplineStage {
    const stage = new SplineStage(container);
    stage.pauseWhenHidden();
    const trigger = container.querySelector<HTMLButtonElement>('.spline-trigger');

    if (isLightDevice()) {
        if (trigger) {
            trigger.hidden = false;
            trigger.addEventListener('click', () => {
                trigger.hidden = true;
                stage.load(url);
            }, { once: true });
        }
        return stage;
    }

    const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
            observer.disconnect();
            whenIdle(() => stage.load(url));
        }
    }, { rootMargin: '50% 0px' });
    observer.observe(container);
    return stage;
}
