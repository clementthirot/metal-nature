/**
 * Découpe le texte d'un élément en mots animables.
 * Le texte intégral reste lisible par les lecteurs d'écran (span .sr-only),
 * les mots découpés sont masqués des technologies d'assistance.
 */
function splitParagraphToWords(element: HTMLElement): HTMLElement[] {
    const text = (element.textContent ?? '').trim().replace(/\s+/g, ' ');
    const srText = document.createElement('span');
    srText.className = 'sr-only';
    srText.textContent = text;

    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');

    // On garde les classes des éléments en ligne (ex. <span class="strong"> : accent en pleine couleur).
    // `glue` : pas d'espace avant ce mot (ponctuation collée à un élément en ligne, ex. « unique, »).
    const tokens: { word: string; className: string; glue: boolean }[] = [];
    let pendingSpace = false;
    const collect = (node: Node, className: string) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const raw = node.textContent ?? '';
            raw.split(/(\s+)/).forEach((part) => {
                if (!part) return;
                if (/^\s+$/.test(part)) { pendingSpace = true; return; }
                tokens.push({ word: part, className, glue: tokens.length > 0 && !pendingSpace });
                pendingSpace = false;
            });
        } else if (node instanceof HTMLElement) {
            const inherited = [className, node.className].filter(Boolean).join(' ');
            node.childNodes.forEach((child) => collect(child, inherited));
        }
    };
    element.childNodes.forEach((child) => collect(child, ''));

    const words: HTMLElement[] = [];
    let container: HTMLElement | null = null;
    tokens.forEach(({ word, className, glue }) => {
        const inner = document.createElement('span');
        inner.className = ['animate-word', className].filter(Boolean).join(' ');
        inner.textContent = word;
        // Un mot « collé » (ponctuation) rejoint le bloc du mot précédent : il ne passe jamais seul à la ligne.
        if (!glue || !container) {
            if (container) visual.appendChild(document.createTextNode(' '));
            container = document.createElement('span');
            container.className = 'animate-word-container';
            visual.appendChild(container);
        }
        container.appendChild(inner);
        words.push(inner);
    });

    element.replaceChildren(srText, visual);
    return words;
}

/**
 * Découpe en mots puis regroupe les mots par ligne affichée (même offsetTop).
 * Animer ligne par ligne est plus lisible et moins coûteux que mot à mot (lot 5.4).
 */
export function splitIntoLines(element: HTMLElement): HTMLElement[][] {
    const words = splitParagraphToWords(element);
    const lines: HTMLElement[][] = [];
    let lastTop: number | null = null;
    words.forEach((word) => {
        const top = (word.parentElement as HTMLElement).offsetTop;
        if (lastTop === null || Math.abs(top - lastTop) > 2) {
            lines.push([]);
            lastTop = top;
        }
        lines[lines.length - 1].push(word);
    });
    return lines;
}
