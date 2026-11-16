/**
 * Emplacements 3D des réalisations (fiche et fenêtre de détail).
 * - La visionneuse Three.js (~150 Ko gzip, partagée avec « Notre démarche ») est chargée en import() dynamique.
 * - Un seul canvas par emplacement : la fenêtre de détail change simplement de meuble.
 * - Sur mobile / appareil modeste / économie de données : image + bouton « Voir en 3D ».
 */
import type { ModelViewer } from './model-viewer';
import { prefersReducedMotion } from './motion';

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
    // Safari ne connaît pas requestIdleCallback : repli sur un court délai.
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(task, { timeout });
    else setTimeout(task, 200);
}

type StageState = 'idle' | 'loading' | 'ready' | 'error';

export class ModelStage {
    readonly container: HTMLElement;
    private viewer: Promise<ModelViewer> | null = null;
    private requested: string | null = null;

    constructor(container: HTMLElement) {
        this.container = container;
        this.setState('idle');
    }

    private setState(state: StageState): void {
        this.container.dataset.modelState = state;
    }

    private getViewer(): Promise<ModelViewer> {
        return (this.viewer ??= import('./model-viewer').then(({ ModelViewer }) => {
            const viewer = new ModelViewer(this.container);
            this.container.appendChild(viewer.canvas);
            return viewer;
        }));
    }

    /** Affiche (ou remplace) le meuble présenté. */
    async load(model: string): Promise<void> {
        if (model === this.requested) return;
        this.requested = model;
        this.setState('loading');
        try {
            const viewer = await this.getViewer();
            await viewer.show(model);
            if (this.requested === model) this.setState('ready');
        } catch (error) {
            if (this.requested !== model) return;
            this.requested = null;
            this.setState('error');
            console.error('Modèle 3D indisponible', error);
        }
    }

    /** Télécharge un meuble à l'avance, seulement si la visionneuse est déjà en place. */
    preload(model: string): void {
        this.viewer?.then((viewer) => viewer.preload(model)).catch(() => {});
    }

    setActive(active: boolean): void {
        this.viewer?.then((viewer) => viewer.setActive(active)).catch(() => {});
    }
}

/**
 * Prépare un emplacement 3D avec son image de repli :
 * chargement automatique à l'approche de l'écran, ou bouton « Voir en 3D » sur appareil léger.
 */
export function setupLazyStage(container: HTMLElement, model: string): ModelStage {
    const stage = new ModelStage(container);
    const trigger = container.querySelector<HTMLButtonElement>('.model-trigger');

    if (isLightDevice()) {
        if (trigger) {
            trigger.hidden = false;
            trigger.addEventListener('click', () => {
                trigger.hidden = true;
                stage.load(model);
            }, { once: true });
        }
        return stage;
    }

    const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
            observer.disconnect();
            whenIdle(() => stage.load(model));
        }
    }, { rootMargin: '600px 0px' });
    observer.observe(container);
    return stage;
}
