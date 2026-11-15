/** Vrai si l'utilisateur a demandé à réduire les animations (réglage système). */
export function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Durée d'animation : 0 si l'utilisateur préfère réduire les animations. */
export function motionDuration(seconds: number): number {
    return prefersReducedMotion() ? 0 : seconds;
}
