/** Construit les liens mailto au chargement pour ne pas exposer l'adresse en clair dans le HTML. */
export function initMailLinks(): void {
    document.querySelectorAll<HTMLAnchorElement>('.js-mail').forEach((link) => {
        const { user, domain, subject, body } = link.dataset;
        if (!user || !domain) return;
        const address = `${user}@${domain}`;
        const params = new URLSearchParams();
        if (subject) params.set('subject', subject);
        if (body) params.set('body', body);
        const query = params.toString().replace(/\+/g, '%20');
        link.href = `mailto:${address}${query ? `?${query}` : ''}`;
        if (!subject) link.textContent = address;
    });
}
