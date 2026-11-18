/**
 * Navigation fixe :
 * - fond flouté dès que la page défile ;
 * - thème clair/sombre recalculé d'après la section réellement sous la barre (B7) : pas d'état
 *   intermédiaire, y compris après une section épinglée ou un carrousel ;
 * - menu mobile (B14) : panneau plein écran, aria-expanded, focus piégé, fermeture par Échap.
 */
export function initNav(): void {
    const nav = document.querySelector<HTMLElement>('.site-nav');
    if (!nav) return;
    initTheme(nav);
    initMenu(nav);
}

function initTheme(nav: HTMLElement): void {
    let frame = 0;
    const update = () => {
        frame = 0;
        nav.classList.toggle('is-scrolled', window.scrollY > 0);
        // Élément sous le milieu de la barre, en ignorant la barre elle-même.
        const y = Math.max(1, nav.offsetHeight / 2);
        const under = document.elementsFromPoint(window.innerWidth / 2, y)
            .find((element) => !nav.contains(element) && !element.classList.contains('custom-cursor'));
        const dark = Boolean(under?.closest('.dark-theme'));
        nav.classList.toggle('on-dark', dark);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    // Les sections épinglées (GSAP) modifient la mise en page après le chargement.
    window.addEventListener('load', schedule);
}

function initMenu(nav: HTMLElement): void {
    const toggle = nav.querySelector<HTMLButtonElement>('.nav-toggle');
    const panel = nav.querySelector<HTMLElement>('.nav-panel');
    const label = nav.querySelector<HTMLElement>('.nav-toggle-label');
    if (!toggle || !panel) return;

    const outside = () => document.querySelectorAll<HTMLElement>('main, footer, .skip-link');
    const focusables = () => [
        toggle,
        ...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
    ];

    const setOpen = (open: boolean, restoreFocus = true) => {
        toggle.setAttribute('aria-expanded', String(open));
        if (label) label.textContent = open ? 'Fermer' : 'Menu';
        panel.hidden = !open;
        document.documentElement.classList.toggle('nav-open', open);
        outside().forEach((element) => { element.inert = open; });
        if (open) panel.querySelector<HTMLElement>('a[href]')?.focus();
        else if (restoreFocus) toggle.focus();
    };

    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));

    nav.addEventListener('keydown', (event) => {
        if (panel.hidden) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            setOpen(false);
        } else if (event.key === 'Tab') {
            // Focus piégé entre le bouton et les liens du panneau.
            const items = focusables();
            const first = items[0];
            const last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
    });

    // Un lien vers une ancre de la page courante ferme le panneau.
    panel.addEventListener('click', (event) => {
        if ((event.target as Element).closest('a')) setOpen(false, false);
    });

    // Retour en desktop : le panneau se referme.
    window.matchMedia('(min-width: 1025px)').addEventListener('change', (event) => {
        if (event.matches && !panel.hidden) setOpen(false, false);
    });
}
