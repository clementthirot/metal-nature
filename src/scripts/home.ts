import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './motion';
import { mountSplineWhenVisible } from './spline';
import { splitParagraphToWords } from './split-words';
import { initCarousel, initProductDetails } from './products';

const scrollTriggerStart = 'top 100%';

function buildScrollTimeline(trigger: gsap.DOMTarget, scrub = false): gsap.core.Timeline {
    return gsap.timeline({
        scrollTrigger: { trigger, start: scrollTriggerStart, scrub },
    });
}

export function initHomePage(): void {
    initProductDetails();
    initCarousel();

    const aboutRender = document.querySelector<HTMLElement>('.about-render');
    mountSplineWhenVisible(aboutRender, aboutRender?.dataset.splineUrl);

    if (prefersReducedMotion()) {
        document.documentElement.classList.replace('motion', 'no-motion');
        return;
    }

    gsap.registerPlugin(ScrollTrigger);
    customCursor();
    animationAuthor();
    animationHeader();
    animationAbout();
    animationProduct();
    animationProposal();
}

function animationHeader() {
    gsap.timeline()
        .to("#headerImage", {
            duration: 1.5,
            y: -80,
            opacity: 0.8,
            ease: "expo.inOut"
        })
        .to("#headerImage", {
            duration: 1,
            opacity: 1,
            scale: 1,
            ease: "expo.inOut"
        })
        .to(".title-line", {
            y: 0,
            opacity: 1,
            duration: 1.5,
            delay: 0.8,
            stagger: {amount: 0.2, from: "start"},
            ease: "power4.out"
        }, 0)
        .to(".site-nav", {
            duration: 1.5,
            y: 0,
            delay: 1.3,
            ease: "expo.inOut"
        }, 0)
        .to(".header-caption", {
            duration: 1.5,
            y: 0,
            opacity: 1,
            ease: "expo.inOut"
        }, 0);
}

function animationAbout() {
    const aboutText = document.getElementById("about-text")!;
    const aboutWords = splitParagraphToWords(aboutText);
    const separator = document.querySelector("#about .separator");

    gsap.set(aboutWords, {y: 40, opacity: 1});
    gsap.set(separator, {width: 0, opacity: 1});

    buildScrollTimeline(aboutText)
        .to(aboutWords, {
            y: 0,
            opacity: 1,
            duration: 1,
            stagger: 0.015,
            ease: "power4.out"
        })
        .to(separator, {
            width: '100%',
            duration: 1,
            ease: "power4.out"
        });

    // Phrases qui apparaissent puis disparaissent au fil du défilement (positions en px depuis le déclencheur).
    const captions = [
        {id: 1, trigger: 1, start: 0, end: 800, from: {opacity: 0, letterSpacing: 'normal'}, to: {opacity: 1, letterSpacing: '5px'}, out: {opacity: 0}},
        {id: 2, trigger: 2, start: 800, end: 1600, from: {opacity: 0, scale: 1}, to: {opacity: 1, scale: 1}, out: {opacity: 0, scale: 0}},
        {id: 3, trigger: 3, start: 1800, end: 5000},
        {id: 4, trigger: 3, start: 2100, end: 5000},
        {id: 5, trigger: 3, start: 2400, end: 5000},
        {id: 6, trigger: 3, start: 5000, end: 6300},
        {id: 7, trigger: 3, start: 6500, end: 9000},
        {id: 8, trigger: 3, start: 9000, end: 11000},
    ];

    captions.forEach(({id, trigger, start, end, from = {opacity: 0, y: 20}, to = {opacity: 1, y: 0}, out = {opacity: 0, y: -20}}) => {
        const target = `#about-caption-${id}`;
        gsap.timeline({
            scrollTrigger: {
                trigger: `#about-caption-${trigger}`,
                start: `top+=${start} center`,
                end: `top+=${end} center`,
                scrub: true,
            }
        })
            .fromTo(target, from, to)
            .to(target, out);
    });
}

function animationProduct() {
    const productText = document.getElementById("product-caption")!;
    const productWords = splitParagraphToWords(productText);
    const productList = document.querySelectorAll('.carousel-item');
    const carousel = document.querySelector<HTMLElement>('.carousel')!;

    gsap.set(productWords, {y: 40, opacity: 1});
    gsap.set(productList, {y: 50, opacity: 0});

    buildScrollTimeline(carousel)
        .to(productWords, {
            y: 0,
            opacity: 1,
            duration: 1,
            stagger: 0.015,
            ease: "power4.out"
        })
        .to(productList, {
            y: 0,
            opacity: 1,
            duration: 1,
            stagger: 0.15,
            delay: 0.5,
            ease: "power4.out"
        }, "<");
}

function animationAuthor() {
    const title = document.querySelector<HTMLElement>(".scroll-title")!;
    const firstTitle = document.querySelector('.part-1');
    const lastTitle = document.querySelector('.part-2');

    gsap.set(firstTitle, {x: '-30%'});
    gsap.set(lastTitle, {x: '30%'});

    buildScrollTimeline(title, true)
        .to(firstTitle, {x: '50%', ease: 'none'})
        .to(lastTitle, {x: '-50%', ease: 'none'}, '<');
}

function animationProposal() {
    const proposalContainer = document.querySelector<HTMLElement>("#proposal .container")!;
    const proposalText = document.getElementById("proposal-caption")!;
    const proposalWords = splitParagraphToWords(proposalText);
    const proposalList = document.querySelectorAll<HTMLElement>('.list-group-item');

    gsap.set(proposalWords, {y: 40, opacity: 1});
    gsap.set(proposalList, {width: 0});

    buildScrollTimeline(proposalContainer)
        .to(proposalWords, {
            y: 0,
            opacity: 1,
            duration: 1,
            stagger: 0.015,
            ease: "power4.out"
        });

    proposalList.forEach(item => {
        const words = splitParagraphToWords(item);
        gsap.set(words, {y: 40, opacity: 1});
        buildScrollTimeline(item)
            .to(words, {
                y: 0,
                opacity: 1,
                duration: 1,
                stagger: 0.015,
                ease: "expo.inOut",
            })
            .to(item, {
                width: '100%',
                duration: 1,
                ease: "expo.inOut",
            });
    });
}

function customCursor() {
    // Uniquement avec une souris (pas sur tablette tactile, même large).
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches || window.innerWidth <= 1024) return;

    const cursor = document.createElement('div');
    cursor.classList.add('custom-cursor');
    cursor.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursor);

    document.addEventListener('mousemove', (e) => {
        gsap.to(cursor, {x: e.clientX, y: e.clientY, duration: 0.1, ease: 'power2.out'});
    });

    const grow = (size: string) => () => gsap.to(cursor, {width: size, height: size, duration: 0.2, ease: 'power2.out'});
    // Délégation : couvre aussi les éléments créés plus tard (modale, cartes).
    document.addEventListener('mouseover', (e) => {
        if ((e.target as Element).closest('a, button:not(:disabled)')) grow('48px')();
    });
    document.addEventListener('mouseout', (e) => {
        if ((e.target as Element).closest('a, button:not(:disabled)')) grow('24px')();
    });
}

