/**
 * Lot H3 — « Croquis puis apparition ».
 * À la première apparition d'un visuel [data-sketch] :
 *   1. un contour fin se trace autour du cadre (SVG rect, stroke-dashoffset, 500 ms) ;
 *   2. la photo se révèle de bas en haut (clip-path, 600 ms) ;
 *   3. le trait s'efface en fondu.
 * Décalage de 80 ms entre visuels apparus ensemble, une seule fois.
 * Sans animation (prefers-reduced-motion) : rien n'est masqué, rien n'est joué.
 *
 * Lot H3.4 — Les filets [data-rule-draw] se tracent de gauche à droite (scaleX) à l'apparition.
 */
import { prefersReducedMotion } from './motion';

const SVG_NS = 'http://www.w3.org/2000/svg';
const STAGGER = 80;
const EASE = 'cubic-bezier(.22, 1, .36, 1)';

function addFrame(element: HTMLElement): SVGRectElement {
    // Le rayon peut être porté par l'image ou par son <picture> (overflow: hidden).
    const radius = Math.max(0, ...[element.querySelector('img'), element.querySelector('picture')]
        .filter((node): node is HTMLElement => Boolean(node))
        .map((node) => parseFloat(getComputedStyle(node).borderTopLeftRadius) || 0));
    const { width, height } = element.getBoundingClientRect();

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'sketch-frame');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', '0.5');
    rect.setAttribute('y', '0.5');
    rect.setAttribute('width', String(Math.max(width - 1, 0)));
    rect.setAttribute('height', String(Math.max(height - 1, 0)));
    rect.setAttribute('rx', String(radius));
    rect.setAttribute('pathLength', '1');
    rect.style.strokeDasharray = '1';
    rect.style.strokeDashoffset = '1';
    svg.appendChild(rect);
    element.appendChild(svg);
    return rect;
}

function play(element: HTMLElement, delay: number): void {
    const img = element.querySelector<HTMLElement>('img');
    const rect = addFrame(element);
    const svg = rect.ownerSVGElement!;

    const draw = rect.animate(
        [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
        { duration: 500, delay, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'forwards' },
    );
    const outlineOnly = element.dataset.sketch === 'outline';
    draw.finished.then(() => {
        const reveal = outlineOnly ? undefined : img?.animate(
            [{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
            { duration: 600, easing: EASE, fill: 'forwards' },
        );
        element.classList.add('is-sketched');
        const fade = svg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: 350, fill: 'forwards' });
        Promise.all([reveal?.finished, fade.finished]).then(() => {
            svg.remove();
            reveal?.cancel(); // l'état final est porté par la classe .is-sketched
        });
    }).catch(() => element.classList.add('is-sketched'));
}

export function initSketches(root: ParentNode = document): void {
    const sketches = Array.from(root.querySelectorAll<HTMLElement>('[data-sketch]'));
    const rules = Array.from(root.querySelectorAll<HTMLElement>('[data-rule-draw]'));

    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
        sketches.forEach((element) => element.classList.add('is-sketched'));
        rules.forEach((element) => element.classList.add('is-drawn'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        // Les visuels apparus dans le même lot sont décalés de 80 ms, de gauche à droite.
        const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => a.boundingClientRect.left - b.boundingClientRect.left || a.boundingClientRect.top - b.boundingClientRect.top);
        visible.forEach((entry, index) => {
            const element = entry.target as HTMLElement;
            observer.unobserve(element);
            if (element.hasAttribute('data-rule-draw')) element.classList.add('is-drawn');
            else play(element, index * STAGGER);
        });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });

    sketches.forEach((element) => observer.observe(element));
    rules.forEach((element) => observer.observe(element));
}
