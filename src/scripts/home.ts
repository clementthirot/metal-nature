import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './motion';
import { setupLazyStage, type SplineStage } from './spline';
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

/* ---------- Notre démarche (lot 1.1) : section épinglée, 3 messages, durée liée à l'écran ---------- */
/** Longueur de défilement pour laquelle la scène 3D de cette section a été animée dans Spline. */
const ABOUT_SCENE_SCROLL_LENGTH = 11000;

function animateAbout(stage: SplineStage | null): void {
    const pin = document.querySelector<HTMLElement>('.about-pin');
    const steps = gsap.utils.toArray<HTMLElement>('.about-step');
    const bar = document.querySelector<HTMLElement>('.about-progress-bar');
    if (!pin || !steps.length) return;

    gsap.set(steps, { autoAlpha: 0, y: 24 });
    gsap.set(steps[0], { autoAlpha: 1, y: 0 });

    const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
            trigger: pin,
            start: 'top top',
            end: () => `+=${window.innerHeight * steps.length}`,
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

    // La scène Spline a été réglée pour l'ancienne section de 12 000 px : on étire la progression
    // de la section épinglée (≈ 3 écrans) sur la plage de défilement attendue par la scène.
    const trigger = timeline.scrollTrigger;
    stage?.ready.then(() => {
        stage.remapScroll((scrollY) => {
            if (!trigger || scrollY <= trigger.start) return scrollY;
            const length = Math.max(trigger.end - trigger.start, 1);
            const progress = Math.min((scrollY - trigger.start) / length, 1);
            return trigger.start + progress * ABOUT_SCENE_SCROLL_LENGTH + Math.max(scrollY - trigger.end, 0);
        });
    });
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
