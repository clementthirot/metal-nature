document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    initMailLinks();
    renderProducts();
    initCarousel();

    const aboutRender = document.querySelector('.about-render');
    if (aboutRender) mountSplineWhenVisible(aboutRender, aboutRender.dataset.splineUrl);

    // GSAP indisponible (CDN bloqué) ou animations réduites : on affiche tout, sans animation.
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined' || prefersReducedMotion()) {
        root.classList.remove('motion');
        root.classList.add('no-motion');
        return;
    }

    gsap.registerPlugin(ScrollTrigger);
    customCursor();
    animationAuthor();
    animationHeader();
    animationAbout();
    animationProduct();
    animationProposal();
});

/** Durée d'animation : 0 si l'utilisateur préfère réduire les animations. */
function motionDuration(seconds) {
    return prefersReducedMotion() ? 0 : seconds;
}

/** Construit les liens mailto au chargement pour ne pas exposer l'adresse en clair aux robots. */
function initMailLinks() {
    document.querySelectorAll('.js-mail').forEach(link => {
        const address = `${link.dataset.user}@${link.dataset.domain}`;
        const params = [];
        if (link.dataset.subject) params.push(`subject=${encodeURIComponent(link.dataset.subject)}`);
        if (link.dataset.body) params.push(`body=${encodeURIComponent(link.dataset.body)}`);
        link.href = `mailto:${address}${params.length ? '?' + params.join('&') : ''}`;
        if (!link.dataset.subject) link.textContent = address;
    });
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
        .to("nav", {
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
    const aboutText = document.getElementById("about-text");
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
    const productText = document.getElementById("product-caption");
    const productWords = splitParagraphToWords(productText);
    const productList = document.querySelectorAll('.carousel-item');
    const carousel = document.querySelector('.carousel');

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
    const title = document.querySelector(".scroll-title");
    const firstTitle = document.querySelector('.part-1');
    const lastTitle = document.querySelector('.part-2');

    gsap.set(firstTitle, {x: '-30%'});
    gsap.set(lastTitle, {x: '30%'});

    buildScrollTimeline(title, true)
        .to(firstTitle, {x: '50%', ease: 'none'})
        .to(lastTitle, {x: '-50%', ease: 'none'}, '<');
}

function animationProposal() {
    const proposalContainer = document.querySelector("#proposal .container");
    const proposalText = document.getElementById("proposal-caption");
    const proposalWords = splitParagraphToWords(proposalText);
    const proposalList = document.querySelectorAll('.list-group-item');

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

    const grow = (size) => () => gsap.to(cursor, {width: size, height: size, duration: 0.2, ease: 'power2.out'});
    // Délégation : couvre aussi les éléments créés plus tard (modale, cartes).
    document.addEventListener('mouseover', (e) => {
        if (e.target.closest('a, button:not(:disabled)')) grow('48px')();
    });
    document.addEventListener('mouseout', (e) => {
        if (e.target.closest('a, button:not(:disabled)')) grow('24px')();
    });
}

/* ------------------------------------------------------------------ */
/* Réalisations : cartes du carrousel + fenêtre de détail (modale)      */
/* ------------------------------------------------------------------ */

function renderProducts() {
    const carousel = document.querySelector('.carousel');
    const lastIndex = productListJSON.length - 1;
    const pageRegions = () => document.querySelectorAll('nav, main, footer, .skip-link');
    let currentIndex = 0;
    let lastFocused = null;

    const dialog = document.createElement('div');
    dialog.classList.add('product-details-container');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'details-name');
    dialog.setAttribute('aria-describedby', 'details-caption');
    dialog.hidden = true;
    dialog.innerHTML = `
        <button type="button" class="product-details-close-button">Fermer</button>
        <div class="product-caption">
            <div class="product-content" aria-live="polite">
                <h2 id="details-name"></h2>
                <p id="details-caption"></p>
            </div>
            <div class="carousel-action-group">
                <button type="button" class="carousel-action details-previous" aria-label="Réalisation précédente">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" focusable="false">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 15.75L3 12m0 0l3.75-3.75M3 12h18" />
                    </svg>
                </button>
                <button type="button" class="carousel-action details-next" aria-label="Réalisation suivante">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" focusable="false">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                    </svg>
                </button>
            </div>
        </div>
        <div class="render-container" aria-hidden="true"></div>
    `;

    const closeButton = dialog.querySelector('.product-details-close-button');
    const renderContainer = dialog.querySelector('.render-container');
    const detailsCaption = dialog.querySelector('#details-caption');
    const detailsName = dialog.querySelector('#details-name');
    const detailsPrevious = dialog.querySelector('.details-previous');
    const detailsNext = dialog.querySelector('.details-next');

    // Un emplacement vide par produit : la scène Spline n'est créée qu'à la première consultation.
    const renderSlots = productListJSON.map(() => {
        const slot = document.createElement('div');
        slot.classList.add('product-render');
        renderContainer.appendChild(slot);
        return slot;
    });

    productListJSON.forEach((product, index) => {
        const item = document.createElement('li');
        item.classList.add('carousel-item');

        const button = document.createElement('button');
        button.type = 'button';
        button.classList.add('carousel-item-button');
        button.setAttribute('aria-haspopup', 'dialog');

        const img = document.createElement('img');
        img.src = `assets/images/${product.image}`;
        img.alt = '';
        img.width = 360;
        img.height = 480;
        img.loading = 'lazy';
        img.decoding = 'async';

        const caption = document.createElement('span');
        caption.classList.add('carousel-item-caption');
        const name = document.createElement('span');
        name.textContent = product.name;
        const date = document.createElement('span');
        date.textContent = product.date;
        caption.append(name, date);

        button.append(img, caption);
        button.addEventListener('click', () => openDetails(index));
        item.appendChild(button);
        carousel.appendChild(item);
    });

    function showProduct(index, animate = true) {
        currentIndex = index;
        const product = productListJSON[index];
        mountSpline(renderSlots[index], `https://prod.spline.design/${product.token}/scene.splinecode`);

        gsapOr(renderContainer, {x: `-${index * 100}vw`, duration: animate ? motionDuration(1.5) : 0, ease: 'power2.inOut'});

        const setText = () => {
            detailsName.textContent = product.name;
            detailsCaption.textContent = product.caption;
        };
        if (typeof gsap === 'undefined' || !animate || prefersReducedMotion()) {
            setText();
        } else {
            gsap.to([detailsName, detailsCaption], {
                opacity: 0, y: 20, duration: 0.5, stagger: 0.1,
                onComplete: () => {
                    setText();
                    gsap.to([detailsName, detailsCaption], {opacity: 1, y: 0, duration: 0.5, stagger: 0.1});
                }
            });
        }

        detailsPrevious.disabled = index === 0;
        detailsNext.disabled = index === lastIndex;
    }

    function openDetails(index) {
        lastFocused = document.activeElement;
        document.body.style.overflow = 'hidden';
        pageRegions().forEach(el => el.inert = true);
        dialog.hidden = false;
        showProduct(index, false);
        gsapOr(dialog, {height: '100vh', duration: motionDuration(1.5), ease: 'expo.inOut'});
        closeButton.focus();
    }

    function closeDetails() {
        document.body.style.overflow = '';
        pageRegions().forEach(el => el.inert = false);
        gsapOr(dialog, {
            height: 0,
            duration: motionDuration(1.5),
            ease: 'expo.inOut',
            onComplete: () => { dialog.hidden = true; }
        });
        if (lastFocused) lastFocused.focus();
    }

    closeButton.addEventListener('click', closeDetails);
    detailsPrevious.addEventListener('click', () => currentIndex > 0 && showProduct(currentIndex - 1));
    detailsNext.addEventListener('click', () => currentIndex < lastIndex && showProduct(currentIndex + 1));

    dialog.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeDetails();
        } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
            showProduct(currentIndex - 1);
        } else if (e.key === 'ArrowRight' && currentIndex < lastIndex) {
            showProduct(currentIndex + 1);
        }
    });

    document.body.appendChild(dialog);
}

/** Anime avec GSAP si disponible, sinon applique directement l'état final. */
function gsapOr(element, vars) {
    if (typeof gsap !== 'undefined') {
        gsap.to(element, vars);
        return;
    }
    if (vars.height !== undefined) element.style.height = vars.height === 0 ? '0' : vars.height;
    if (vars.x !== undefined) element.style.transform = `translateX(${vars.x})`;
    if (vars.onComplete) vars.onComplete();
}

/* ------------------------------------------------------------------ */
/* Défilement du carrousel : boutons, clavier, glisser au doigt         */
/* ------------------------------------------------------------------ */

function initCarousel() {
    const carousel = document.querySelector('.carousel');
    const items = carousel.querySelectorAll('.carousel-item');
    const prevBtn = document.getElementById('carouselPrevious');
    const nextBtn = document.getElementById('carouselNext');
    if (!items.length) return;

    let currentIndex = 0;

    const metrics = () => {
        const style = getComputedStyle(carousel);
        const gap = parseFloat(style.columnGap) || 0;
        const padding = parseFloat(style.paddingLeft) || 0;
        const itemWidth = items[0].getBoundingClientRect().width;
        const visible = Math.max(1, Math.floor((carousel.parentElement.clientWidth - padding + gap) / (itemWidth + gap)));
        return {gap, itemWidth, maxIndex: Math.max(0, items.length - visible)};
    };

    function update(animate = true) {
        const {gap, itemWidth, maxIndex} = metrics();
        currentIndex = Math.min(currentIndex, maxIndex);
        gsapOr(carousel, {x: `${-currentIndex * (itemWidth + gap)}px`, duration: animate ? motionDuration(0.5) : 0, ease: 'power2.out'});
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex >= maxIndex;
    }

    const go = (delta) => {
        currentIndex = Math.max(0, Math.min(currentIndex + delta, metrics().maxIndex));
        update();
    };

    prevBtn.addEventListener('click', () => go(-1));
    nextBtn.addEventListener('click', () => go(1));

    // Quand une carte reçoit le focus clavier, on la fait entrer dans la zone visible.
    items.forEach((item, index) => {
        item.addEventListener('focusin', () => {
            const {maxIndex} = metrics();
            const visible = items.length - maxIndex;
            if (index < currentIndex || index >= currentIndex + visible) {
                currentIndex = Math.min(index, maxIndex);
                update();
            }
        });
    });

    // Glisser horizontal sur écran tactile.
    let touchStartX = null;
    carousel.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, {passive: true});
    carousel.addEventListener('touchend', (e) => {
        if (touchStartX === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touchStartX = null;
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => update(false), 150);
    });

    update(false);
}
