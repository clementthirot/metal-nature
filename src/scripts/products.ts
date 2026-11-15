import { gsap } from 'gsap';
import { motionDuration, prefersReducedMotion } from './motion';
import { mountSpline, splineSceneUrl } from './spline';

/* ------------------------------------------------------------------ */
/* Fenêtre de détail d'une réalisation (modale)                         */
/* Les cartes sont de vrais liens vers /realisations/<slug>/ : sans JS, */
/* ou avec Ctrl/Cmd+clic, on arrive sur la fiche complète.              */
/* ------------------------------------------------------------------ */

export function initProductDetails(): void {
    const cards = Array.from(document.querySelectorAll<HTMLAnchorElement>('.carousel-item-button'));
    const dialog = document.querySelector<HTMLElement>('.product-details-container');
    if (!cards.length || !dialog) return;

    const closeButton = dialog.querySelector<HTMLButtonElement>('.product-details-close-button')!;
    const renderContainer = dialog.querySelector<HTMLElement>('.render-container')!;
    const renderSlots = Array.from(renderContainer.querySelectorAll<HTMLElement>('.product-render'));
    const detailsName = dialog.querySelector<HTMLElement>('#details-name')!;
    const detailsCaption = dialog.querySelector<HTMLElement>('#details-caption')!;
    const detailsLink = dialog.querySelector<HTMLAnchorElement>('#details-link')!;
    const detailsPrevious = dialog.querySelector<HTMLButtonElement>('.details-previous')!;
    const detailsNext = dialog.querySelector<HTMLButtonElement>('.details-next')!;
    const pageRegions = () => document.querySelectorAll<HTMLElement>('.site-nav, main, footer, .skip-link');
    const lastIndex = cards.length - 1;

    let currentIndex = 0;
    let lastFocused: HTMLElement | null = null;

    function showProduct(index: number, animate = true): void {
        currentIndex = index;
        const card = cards[index];
        const { title = '', caption = '', spline } = card.dataset;
        if (spline) mountSpline(renderSlots[index], splineSceneUrl(spline));

        gsap.to(renderContainer, {
            x: `-${index * 100}vw`,
            duration: animate ? motionDuration(1.5) : 0,
            ease: 'power2.inOut',
        });

        const setText = () => {
            detailsName.textContent = title;
            detailsCaption.textContent = caption;
            detailsLink.href = card.href;
            detailsLink.setAttribute('aria-label', `Voir la fiche complète : ${title}`);
        };

        if (!animate || prefersReducedMotion()) {
            setText();
        } else {
            gsap.to([detailsName, detailsCaption], {
                opacity: 0, y: 20, duration: 0.5, stagger: 0.1,
                onComplete: () => {
                    setText();
                    gsap.to([detailsName, detailsCaption], { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 });
                },
            });
        }

        detailsPrevious.disabled = index === 0;
        detailsNext.disabled = index === lastIndex;
    }

    function openDetails(index: number): void {
        lastFocused = document.activeElement as HTMLElement | null;
        document.body.style.overflow = 'hidden';
        pageRegions().forEach((el) => { el.inert = true; });
        dialog!.hidden = false;
        showProduct(index, false);
        gsap.to(dialog, { height: '100vh', duration: motionDuration(1.5), ease: 'expo.inOut' });
        closeButton.focus();
    }

    function closeDetails(): void {
        document.body.style.overflow = '';
        pageRegions().forEach((el) => { el.inert = false; });
        gsap.to(dialog, {
            height: 0,
            duration: motionDuration(1.5),
            ease: 'expo.inOut',
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
        const padding = parseFloat(style.paddingLeft) || 0;
        const itemWidth = items[0].getBoundingClientRect().width;
        const containerWidth = carousel.parentElement?.clientWidth ?? window.innerWidth;
        const visible = Math.max(1, Math.floor((containerWidth - padding + gap) / (itemWidth + gap)));
        return { gap, itemWidth, visible, maxIndex: Math.max(0, items.length - visible) };
    };

    function update(animate = true): void {
        const { gap, itemWidth, maxIndex } = metrics();
        currentIndex = Math.min(currentIndex, maxIndex);
        gsap.to(carousel, {
            x: -currentIndex * (itemWidth + gap),
            duration: animate ? motionDuration(0.5) : 0,
            ease: 'power2.out',
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
    });

    let resizeTimer: number | undefined;
    window.addEventListener('resize', () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => update(false), 150);
    });

    update(false);
}
