/**
 * Chargement paresseux de la scène 3D de « Notre démarche » (Three.js, lot G).
 * - Le code 3D (~150 Ko gzip) et les modèles ne sont chargés qu'à l'approche de la section.
 * - Review UI (B11, Lot 3) : la 3D se lance automatiquement au scroll, sur mobile comme sur desktop.
 *   Plus d'image statique ni de bouton « Voir en 3D ». Seuls « réduire les animations » (géré par home.ts)
 *   et une erreur WebGL laissent l'image fixe.
 * - L'effet « arêtes puis matière » est coupé sur les appareils modestes (pixel ratio plafonné à 1,5).
 * - La progression demandée avant la fin du chargement est conservée et appliquée ensuite.
 */
import type { AboutScene, PieceDimensions } from './about-scene';

export interface AboutStage {
    setProgress(progress: number): void;
}

export function setupAboutStage(container: HTMLElement): AboutStage {
    let scene: AboutScene | null = null;
    let progress = 0;
    let started = false;

    // Bord droit de la colonne de texte : la scène cadre les meubles à droite de cette limite.
    const steps = container.closest('.about-pin')?.querySelector<HTMLElement>('.about-steps');
    const measure = () => {
        if (!steps) return;
        const box = container.getBoundingClientRect();
        container.dataset.textColumn = String(Math.round(steps.getBoundingClientRect().right - box.left + 24));
    };

    const start = async () => {
        if (started) return;
        started = true;
        container.dataset.sceneState = 'loading';
        try {
            const { AboutScene } = await import('./about-scene');
            const sizes = JSON.parse(container.dataset.sizes ?? '{}') as Record<string, PieceDimensions>;
            measure();
            const instance = new AboutScene(container, {
                edges: !modestDevice,
                dimensions: container.querySelector<SVGSVGElement>('.about-dims'),
                sizes,
            });
            container.prepend(instance.canvas);
            await instance.load();
            instance.setProgress(progress);
            scene = instance;
            container.dataset.sceneState = 'ready';

            let resizeTimer: number | undefined;
            new ResizeObserver(() => {
                window.clearTimeout(resizeTimer);
                resizeTimer = window.setTimeout(() => { measure(); instance.resize(); }, 100);
            }).observe(container);
        } catch (error) {
            container.dataset.sceneState = 'error';
            console.error('Scène 3D indisponible', error);
        }
    };

    const modestDevice = (navigator.hardwareConcurrency ?? 8) <= 4;
    const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
            observer.disconnect();
            start();
        }
    }, { rootMargin: '800px 0px' });
    observer.observe(container);

    return {
        setProgress(value: number) {
            progress = value;
            scene?.setProgress(value);
        },
    };
}
