/**
 * Curseur personnalisé (review UI : B1 + Lot 4).
 * - Uniquement sur `pointer: fine` (souris, trackpad) : jamais au tactile.
 * - Invisible tant que la souris n'a pas bougé (plus de pastille figée en 0,0 au chargement),
 *   masqué quand elle quitte la fenêtre.
 * - Point discret par défaut, agrandi sur les éléments cliquables.
 * - Loupe sur les photos ([data-loupe] ou photos de réalisations) : la zone sous le curseur est
 *   agrandie, pour voir le grain du bois et les soudures.
 */
import { prefersReducedMotion } from './motion';

const LOUPE_SIZE = 140;
const LOUPE_ZOOM = 2;
const PHOTO_SELECTOR = 'img[data-loupe], [data-loupe] img, .card-link img, .index-card img, .gallery img';

export function initCursor(): void {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursor);
    document.documentElement.classList.add('has-custom-cursor');

    const smooth = !prefersReducedMotion();
    let x = 0;
    let y = 0;
    let cx = 0;
    let cy = 0;
    let visible = false;
    let frame = 0;
    let photo: HTMLImageElement | null = null;

    const render = () => {
        frame = 0;
        // Léger retard (lissage) sauf en « réduire les animations ».
        cx += (x - cx) * (smooth ? 0.35 : 1);
        cy += (y - cy) * (smooth ? 0.35 : 1);
        cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
        if (photo) updateLoupe(photo);
        if (Math.abs(x - cx) > 0.1 || Math.abs(y - cy) > 0.1) frame = requestAnimationFrame(render);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(render); };

    const updateLoupe = (img: HTMLImageElement) => {
        const rect = img.getBoundingClientRect();
        // Taille de l'image rendue (object-fit: cover) puis agrandie.
        const natural = img.naturalWidth / Math.max(img.naturalHeight, 1);
        const box = rect.width / Math.max(rect.height, 1);
        const renderedW = natural > box ? rect.height * natural : rect.width;
        const renderedH = natural > box ? rect.height : rect.width / natural;
        const offsetX = (rect.width - renderedW) / 2;
        const offsetY = (rect.height - renderedH) / 2;
        const px = cx - rect.left - offsetX;
        const py = cy - rect.top - offsetY;
        cursor.style.backgroundSize = `${renderedW * LOUPE_ZOOM}px ${renderedH * LOUPE_ZOOM}px`;
        cursor.style.backgroundPosition = `${LOUPE_SIZE / 2 - px * LOUPE_ZOOM}px ${LOUPE_SIZE / 2 - py * LOUPE_ZOOM}px`;
    };

    const setPhoto = (img: HTMLImageElement | null) => {
        if (img === photo) return;
        photo = img;
        cursor.classList.toggle('is-loupe', Boolean(img));
        cursor.style.backgroundImage = img ? `url("${img.currentSrc || img.src}")` : '';
        schedule();
    };

    document.addEventListener('pointermove', (event) => {
        if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
        x = event.clientX;
        y = event.clientY;
        if (!visible) {
            visible = true;
            cx = x;
            cy = y;
            cursor.classList.add('is-visible');
        }
        schedule();
    }, { passive: true });

    document.documentElement.addEventListener('pointerleave', () => {
        visible = false;
        cursor.classList.remove('is-visible');
    });

    const interactive = (target: EventTarget | null) =>
        target instanceof Element ? target.closest('a, button:not(:disabled), select, input, textarea, summary, [role="button"]') : null;
    const photoOf = (target: EventTarget | null) =>
        target instanceof HTMLImageElement && target.matches(PHOTO_SELECTOR) && target.complete && target.naturalWidth ? target : null;

    document.addEventListener('pointerover', (event) => {
        const img = photoOf(event.target);
        setPhoto(img);
        cursor.classList.toggle('is-hover', !img && Boolean(interactive(event.target)));
    }, { passive: true });

    // Le défilement déplace la photo sous le curseur : on recalcule la loupe.
    window.addEventListener('scroll', () => { if (photo) schedule(); }, { passive: true });
}
