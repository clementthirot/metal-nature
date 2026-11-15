/**
 * Navigation fixe (lot 0.3) :
 * - fond flouté dès que la page défile ;
 * - bascule clair/sombre quand la barre passe au-dessus d'une section .dark-theme.
 */
export function initNavTheme(): void {
    const nav = document.querySelector<HTMLElement>('.site-nav');
    if (!nav) return;

    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 0);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const darkSections = document.querySelectorAll<HTMLElement>('main .dark-theme, footer.dark-theme');
    if (!darkSections.length || !('IntersectionObserver' in window)) return;

    // Zone observée : une bande de la hauteur de la barre, en haut de l'écran.
    const visible = new Set<Element>();
    let observer: IntersectionObserver | null = null;

    const observe = () => {
        observer?.disconnect();
        const navHeight = nav.offsetHeight || 72;
        observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) visible.add(entry.target);
                else visible.delete(entry.target);
            });
            nav.classList.toggle('on-dark', visible.size > 0);
        }, { rootMargin: `0px 0px -${Math.max(window.innerHeight - navHeight / 2, 0)}px 0px` });
        darkSections.forEach((section) => observer!.observe(section));
    };

    observe();
    let resizeTimer: number | undefined;
    window.addEventListener('resize', () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(observe, 200);
    });
}
