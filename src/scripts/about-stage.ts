/**
 * Chargement paresseux de la scène 3D de « Notre démarche » (Three.js, lot G).
 * - Le code 3D (~150 Ko gzip) et les modèles ne sont chargés qu'à l'approche de la section.
 * - Mobile, économie de données ou appareil modeste : image fixe + bouton « Voir en 3D » (lot H4.7).
 * - L'effet « arêtes puis matière » est coupé sur les appareils modestes.
 * - La progression demandée avant la fin du chargement est conservée et appliquée ensuite.
 */
import type { AboutScene } from './about-scene';

export interface AboutStage {
    setProgress(progress: number): void;
}

export function setupAboutStage(container: HTMLElement): AboutStage {
    let scene: AboutScene | null = null;
    let progress = 0;
    let started = false;

    const start = async () => {
        if (started) return;
        started = true;
        container.dataset.sceneState = 'loading';
        try {
            const { AboutScene } = await import('./about-scene');
            const instance = new AboutScene(container, { edges: !modestDevice });
            container.appendChild(instance.canvas);
            await instance.load();
            instance.setProgress(progress);
            scene = instance;
            container.dataset.sceneState = 'ready';

            let resizeTimer: number | undefined;
            new ResizeObserver(() => {
                window.clearTimeout(resizeTimer);
                resizeTimer = window.setTimeout(() => instance.resize(), 100);
            }).observe(container);
        } catch (error) {
            container.dataset.sceneState = 'error';
            console.error('Scène 3D indisponible', error);
        }
    };

    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    const modestDevice = (navigator.hardwareConcurrency ?? 8) <= 4;
    const onDemand = saveData || modestDevice || window.matchMedia('(max-width: 768px)').matches;
    const trigger = container.querySelector<HTMLButtonElement>('.model-trigger');
    if (onDemand && trigger) {
        trigger.hidden = false;
        trigger.addEventListener('click', () => { trigger.hidden = true; start(); }, { once: true });
    } else {
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                observer.disconnect();
                start();
            }
        }, { rootMargin: '600px 0px' });
        observer.observe(container);
    }

    return {
        setProgress(value: number) {
            progress = value;
            scene?.setProgress(value);
        },
    };
}
