import { gsap } from 'gsap';
import { motionDuration, prefersReducedMotion } from './motion';
import { ModelStage, isLightDevice, whenIdle } from './model-stage';

/* ------------------------------------------------------------------ */
/* Fenêtre de détail d'une réalisation (lot 2.2)                        */
/* Les cartes sont de vrais liens vers /realisations/<slug>/ : sans JS, */
/* ou avec Ctrl/Cmd+clic, on arrive sur la fiche complète.              */
/* ------------------------------------------------------------------ */

export function initProductDetails(): void {
    const cards = Array.from(document.querySelectorAll<HTMLAnchorElement>('.carousel-item-button'));
    const dialog = document.querySelector<HTMLElement>('.product-details-container');
    if (!cards.length || !dialog) return;

    const closeButton = dialog.querySelector<HTMLButtonElement>('.product-details-close-button')!;
    const stageEl = dialog.querySelector<HTMLElement>('.product-stage')!;
    const poster = dialog.querySelector<HTMLImageElement>('.product-poster')!;
    const trigger = dialog.querySelector<HTMLButtonElement>('.model-trigger')!;
    const detailsName = dialog.querySelector<HTMLElement>('#details-name')!;
    const detailsCaption = dialog.querySelector<HTMLElement>('#details-caption')!;
    const detailsLink = dialog.querySelector<HTMLAnchorElement>('#details-link')!;
    const detailsPrevious = dialog.querySelector<HTMLButtonElement>('.details-previous')!;
    const detailsNext = dialog.querySelector<HTMLButtonElement>('.details-next')!;
    const pageRegions = () => document.querySelectorAll<HTMLElement>('.site-nav, main, footer, .skip-link');
    const lastIndex = cards.length - 1;

    // Un seul canvas 3D pour toutes les réalisations (lot 5.2.4).
    const stage = new ModelStage(stageEl);
    const lightDevice = isLightDevice();
    let currentIndex = 0;
    let lastFocused: HTMLElement | null = null;
    let open = false;

    const modelOf = (index: number) => cards[index]?.dataset.model || null;

    function loadScene(index: number): void {
        const model = modelOf(index);
        stageEl.classList.toggle('has-scene', Boolean(model));
        if (!model) return;
        if (lightDevice && !stageEl.dataset.userWants3d) {
            trigger.hidden = false;
            return;
        }
        trigger.hidden = true;
        stage.load(model);
    }

    trigger.addEventListener('click', () => {
        stageEl.dataset.userWants3d = 'true';
        loadScene(currentIndex);
    });

    function showProduct(index: number, animate = true): void {
        currentIndex = index;
        const card = cards[index];
        const { title = '', caption = '', poster: posterSrc = '', posterAlt = '' } = card.dataset;

        poster.src = posterSrc;
        poster.alt = posterAlt;
        loadScene(index);

        const setText = () => {
            detailsName.textContent = title;
            detailsCaption.textContent = caption;
            detailsLink.href = card.href;
            detailsLink.setAttribute('aria-label', `Voir la fiche complète : ${title}`);
        };

        if (!animate || prefersReducedMotion()) {
            setText();
        } else {
            gsap.timeline()
                .to([detailsName, detailsCaption], { opacity: 0, y: 12, duration: 0.2, stagger: 0.05 })
                .add(setText)
                .to([detailsName, detailsCaption], { opacity: 1, y: 0, duration: 0.35, stagger: 0.05, ease: 'power3.out' });
        }

        detailsPrevious.disabled = index === 0;
        detailsNext.disabled = index === lastIndex;
    }

    function openDetails(index: number): void {
        lastFocused = document.activeElement as HTMLElement | null;
        open = true;
        document.body.style.overflow = 'hidden';
        pageRegions().forEach((el) => { el.inert = true; });
        dialog!.hidden = false;
        stage.setActive(true);
        showProduct(index, false);
        // Ouverture rapide, uniquement en clip-path (pas de recalcul de mise en page) — lot 2.2 / 5.3
        gsap.fromTo(dialog, { clipPath: 'inset(100% 0% 0% 0%)' }, {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: motionDuration(0.7),
            ease: 'power3.out',
        });
        closeButton.focus();
        // Précharge le meuble suivant quand le navigateur est inactif.
        whenIdle(() => {
            const next = modelOf(index + 1);
            if (next) stage.preload(next);
        });
    }

    function closeDetails(): void {
        if (!open) return;
        open = false;
        document.body.style.overflow = '';
        pageRegions().forEach((el) => { el.inert = false; });
        stage.setActive(false);
        gsap.to(dialog, {
            clipPath: 'inset(100% 0% 0% 0%)',
            duration: motionDuration(0.5),
            ease: 'power3.in',
            onComplete: () => { dialog!.hidden = true; },
        });
        lastFocused?.focus();
    }

    cards.forEach((card, index) => {
        card.addEventListener('click', (event) => {
            // Laisse le navigateur gérer l'ouverture dans un nouvel onglet.
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
            event.preventDefault();
            openDetails(index);
        });
    });

    closeButton.addEventListener('click', closeDetails);
    detailsPrevious.addEventListener('click', () => { if (currentIndex > 0) showProduct(currentIndex - 1); });
    detailsNext.addEventListener('click', () => { if (currentIndex < lastIndex) showProduct(currentIndex + 1); });

    dialog.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeDetails();
        } else if (event.key === 'ArrowLeft' && currentIndex > 0) {
            showProduct(currentIndex - 1);
        } else if (event.key === 'ArrowRight' && currentIndex < lastIndex) {
            showProduct(currentIndex + 1);
        }
    });
}

/* ------------------------------------------------------------------ */
/* Défilement du carrousel : boutons, clavier, glisser au doigt         */
/* ------------------------------------------------------------------ */

export function initCarousel(): void {
    const carousel = document.querySelector<HTMLElement>('.carousel');
    const prevBtn = document.querySelector<HTMLButtonElement>('#carouselPrevious');
    const nextBtn = document.querySelector<HTMLButtonElement>('#carouselNext');
    if (!carousel || !prevBtn || !nextBtn) return;
    const items = Array.from(carousel.querySelectorAll<HTMLElement>('.carousel-item'));
    if (!items.length) return;

    let currentIndex = 0;

    const metrics = () => {
        const style = getComputedStyle(carousel);
        const gap = parseFloat(style.columnGap) || 0;
        const itemWidth = items[0].getBoundingClientRect().width;
        // Zone visible = largeur du carrousel, calée entre la première et la dernière ligne de la grille.
        const visible = Math.max(1, Math.round((carousel.clientWidth + gap) / (itemWidth + gap)));
        return { gap, itemWidth, visible, maxIndex: Math.max(0, items.length - visible) };
    };

    function update(animate = true): void {
        const { gap, itemWidth, maxIndex } = metrics();
        currentIndex = Math.min(currentIndex, maxIndex);
        // Défilement posé : 0,9 s, accélération et freinage doux.
        gsap.to(carousel, {
            x: -currentIndex * (itemWidth + gap),
            duration: animate ? motionDuration(0.9) : 0,
            ease: 'power2.inOut',
        });
        prevBtn!.disabled = currentIndex === 0;
        nextBtn!.disabled = currentIndex >= maxIndex;
    }

    const go = (delta: number) => {
        currentIndex = Math.max(0, Math.min(currentIndex + delta, metrics().maxIndex));
        update();
    };

    prevBtn.addEventListener('click', () => go(-1));
    nextBtn.addEventListener('click', () => go(1));

    // Quand une carte reçoit le focus clavier, on la fait entrer dans la zone visible.
    items.forEach((item, index) => {
        item.addEventListener('focusin', () => {
            const { visible, maxIndex } = metrics();
            if (index < currentIndex || index >= currentIndex + visible) {
                currentIndex = Math.min(index, maxIndex);
                update();
            }
        });
    });

    // Glisser horizontal sur écran tactile.
    let touchStartX: number | null = null;
    carousel.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    carousel.addEventListener('touchend', (e) => {
        if (touchStartX === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touchStartX = null;
    }, { passive: true });

    let resizeTimer: number | undefined;
    window.addEventListener('resize', () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => update(false), 150);
    });

    update(false);
}
