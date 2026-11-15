/**
 * Découpe le texte d'un élément en mots animables.
 * Le texte intégral reste lisible par les lecteurs d'écran (span .sr-only),
 * les mots découpés sont masqués des technologies d'assistance.
 */
export function splitParagraphToWords(element: HTMLElement): HTMLElement[] {
    const text = (element.textContent ?? '').trim().replace(/\s+/g, ' ');
    const srText = document.createElement('span');
    srText.className = 'sr-only';
    srText.textContent = text;

    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');

    const words: HTMLElement[] = [];
    text.split(' ').forEach((word, index) => {
        const container = document.createElement('span');
        container.className = 'animate-word-container';
        const inner = document.createElement('span');
        inner.className = 'animate-word';
        inner.textContent = word;
        container.appendChild(inner);
        if (index > 0) visual.appendChild(document.createTextNode(' '));
        visual.appendChild(container);
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
