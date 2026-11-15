import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './motion';
import { isLightDevice, setupLazyStage, type SplineStage } from './spline';
import { splitIntoLines } from './split-words';
import { initCarousel, initProductDetails } from './products';

export function initHomePage(): void {
    initProductDetails();
    initCarousel();

    // Scène 3D de « Notre démarche » : chargée à l'approche, ou à la demande sur appareil léger.
    const aboutVisual = document.querySelector<HTMLElement>('.about-visual');
    const aboutStage = aboutVisual?.dataset.splineUrl ? setupLazyStage(aboutVisual, aboutVisual.dataset.splineUrl) : null;

    if (prefersReducedMotion()) {
        document.documentElement.classList.replace('motion', 'no-motion');
        return;
    }

    gsap.registerPlugin(ScrollTrigger);
    customCursor();
    animateHero();
    animateTextReveals();
    animateAbout(aboutStage);
    animateProducts();
    animateAuthor();
    animateProposal();

    // Les positions dépendent de la hauteur des textes : on recalcule une fois les polices chargées.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

/** Ajoute will-change seulement pendant qu'une animation au scroll est active (lot 5.3). */
const willChange = (targets: gsap.TweenTarget) => (self: ScrollTrigger) =>
    gsap.set(targets, { willChange: self.isActive ? 'transform' : 'auto' });

/* ---------- Hero (lot 5.1) : image visible dès le premier rendu, transform seulement, < 1,2 s ---------- */
function animateHero(): void {
    gsap.timeline({ defaults: { ease: 'power3.out' } })
        .to('#headerImage', { y: 0, scale: 1, duration: 1.1 }, 0)
        .to('.title-line', { y: 0, duration: 0.9, stagger: 0.1 }, 0.05)
        .to('.hero-caption', { opacity: 1, duration: 0.6 }, 0.4)
        .to('.page-home .site-nav', { y: 0, duration: 0.7 }, 0.3);
}

/* ---------- Paragraphes révélés ligne par ligne (lot 5.4) ---------- */
function animateTextReveals(): void {
    document.querySelectorAll<HTMLElement>('.split-lines').forEach((paragraph) => {
        const lines = splitIntoLines(paragraph);
        gsap.set(lines.flat(), { yPercent: 110 });
        const timeline = gsap.timeline({
            scrollTrigger: { trigger: paragraph, start: 'top 85%', once: true },
        });
        lines.forEach((words, index) => {
            timeline.to(words, { yPercent: 0, duration: 0.8, ease: 'power3.out' }, index * 0.08);
        });
    });

    gsap.to('.separator', {
        scaleX: 1,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.separator', start: 'top 90%', once: true },
    });
}

/* ---------- Notre démarche : section épinglée, messages synchronisés avec la scène 3D ---------- */
/**
 * Longueur de défilement (px) pour laquelle la scène Spline de cette section a été animée
 * (ancienne section de 12 000 px : 11 000 px épinglés + l'intro). Valeur fixe tant que la scène
 * vient de Spline : ses caméras sont liées à des positions de défilement absolues.
 */
const ABOUT_SCENE_SCROLL_LENGTH = 11000;
const FADE = 300; // px de fondu à l'entrée et à la sortie de chaque message (piste longue)

function animateAbout(stage: SplineStage | null): void {
    const pin = document.querySelector<HTMLElement>('.about-pin');
    const steps = gsap.utils.toArray<HTMLElement>('.about-step');
    const bar = document.querySelector<HTMLElement>('.about-progress-bar');
    if (!pin || !steps.length) return;

    const mm = gsap.matchMedia();

    // Desktop avec scène chargée : piste longue, chaque message suit sa plage de la scène.
    mm.add('(min-width: 769px)', () => {
        if (!stage || isLightDevice()) return shortTrack(pin, steps, bar);

        gsap.set(steps, { autoAlpha: 0, y: 24 });
        const timeline = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
                trigger: pin,
                start: 'top top',
                end: `+=${ABOUT_SCENE_SCROLL_LENGTH}`,
                pin: true,
                scrub: 0.3,
                onToggle: willChange(steps),
            },
        });
        // 1 unité de timeline = 1 px de défilement.
        timeline.set({}, {}, ABOUT_SCENE_SCROLL_LENGTH);
        if (bar) timeline.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: ABOUT_SCENE_SCROLL_LENGTH }, 0);

        steps.forEach((step, index) => {
            const start = Number(step.dataset.sceneStart ?? 0);
            const end = Number(step.dataset.sceneEnd ?? ABOUT_SCENE_SCROLL_LENGTH);
            if (index === 0 && start === 0) gsap.set(step, { autoAlpha: 1, y: 0 });
            else timeline.to(step, { autoAlpha: 1, y: 0, duration: FADE }, start);
            if (end < ABOUT_SCENE_SCROLL_LENGTH) {
                timeline.to(step, { autoAlpha: 0, y: -24, duration: FADE }, end - FADE);
            }
        });
        // La piste fait la longueur attendue par la scène : pas de remappage du défilement.
        // Si la scène finit de charger en cours de section, on la cale tout de suite sur la position.
        stage.ready.then(() => window.dispatchEvent(new Event('scroll')));
    });

    // Mobile : la scène n'est pas chargée d'office, piste courte (un écran par message).
    mm.add('(max-width: 768px)', () => shortTrack(pin, steps, bar));
}

function shortTrack(pin: HTMLElement, steps: HTMLElement[], bar: HTMLElement | null): void {
    gsap.set(steps, { autoAlpha: 0, y: 24 });
    gsap.set(steps[0], { autoAlpha: 1, y: 0 });

    const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
            trigger: pin,
            start: 'top top',
            end: () => `+=${window.innerHeight * steps.length * 0.8}`,
            pin: true,
            scrub: 0.5,
            invalidateOnRefresh: true,
            onToggle: willChange(steps),
        },
    });

    if (bar) timeline.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: steps.length }, 0);

    steps.forEach((step, index) => {
        if (index === 0) return;
        // Fondu séquentiel : le message précédent disparaît avant que le suivant n'apparaisse.
        const at = index - 0.3;
        timeline
            .to(steps[index - 1], { autoAlpha: 0, y: -24, duration: 0.25 }, at)
            .to(step, { autoAlpha: 1, y: 0, duration: 0.3 }, at + 0.3);
    });
    // Courte pause sur le dernier message avant de libérer la section.
    timeline.to({}, { duration: 0.4 });
}

/* ---------- Réalisations ---------- */
function animateProducts(): void {
    ScrollTrigger.batch('.carousel-item', {
        start: 'top 90%',
        once: true,
        onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' }),
    });
}

/* ---------- Artisan / Créateur ---------- */
function animateAuthor(): void {
    const title = document.querySelector<HTMLElement>('.scroll-title');
    if (!title) return;
    const parts = title.querySelectorAll('span');
    gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
            trigger: title,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
            onToggle: willChange(parts),
        },
    })
        .fromTo('.part-1', { xPercent: -20 }, { xPercent: 20 }, 0)
        .fromTo('.part-2', { xPercent: 20 }, { xPercent: -20 }, 0);
}

/* ---------- Ce que nous fabriquons : un seul ScrollTrigger groupé pour la liste (lot 5.3) ---------- */
function animateProposal(): void {
    ScrollTrigger.batch('.list-group-item', {
        start: 'top 92%',
        once: true,
        onEnter: (batch) => gsap.to(batch, {
            autoAlpha: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.04,
            ease: 'power3.out',
            onStart: () => batch.forEach((item) => item.classList.add('is-drawn')),
        }),
    });
}

/* ---------- Curseur (lot 5.3) : quickTo + scale, écouteurs passifs ---------- */
function customCursor(): void {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches || window.innerWidth <= 1024) return;

    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursor);

    const moveX = gsap.quickTo(cursor, 'x', { duration: 0.15, ease: 'power3.out' });
    const moveY = gsap.quickTo(cursor, 'y', { duration: 0.15, ease: 'power3.out' });
    const grow = gsap.quickTo(cursor, 'scale', { duration: 0.2, ease: 'power3.out' });

    document.addEventListener('pointermove', (e) => { moveX(e.clientX); moveY(e.clientY); }, { passive: true });
    const isInteractive = (target: EventTarget | null) =>
        target instanceof Element && target.closest('a, button:not(:disabled), select, input, textarea');
    document.addEventListener('pointerover', (e) => { if (isInteractive(e.target)) grow(2); }, { passive: true });
    document.addEventListener('pointerout', (e) => { if (isInteractive(e.target)) grow(1); }, { passive: true });
}
