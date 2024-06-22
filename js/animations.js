window.onbeforeunload = function () {
    window.scrollTo(0, 0);
}

function animationAuthor() {
    const part1 = document.querySelector('.part-1');
    const part2 = document.querySelector('.part-2');

    gsap.set(part1, {x: '-30%'});
    gsap.set(part2, {x: '30%'});

    gsap.timeline({
        scrollTrigger: {
            trigger: '.scroll-title',
            start: 'top 100%',
            scrub: true,
            delay: 3
        }
    })
        .to(part1, {x: '50%', ease: 'none'})
        .to(part2, {x: '-50%', ease: 'none'}, '<');

}

function animationHeader() {
    gsap.timeline().to("#headerImage", {
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
        });

    gsap.timeline()
        .to(".title-line", {
            y: 0,
            opacity: 1,
            duration: 1.5,
            delay: 0.8,
            stagger: {
                amount: 0.2,
                from: "start",
            },
            ease: "power4.out"
        });

    gsap.timeline().to("nav", {
        duration: 1.5,
        y: 0,
        delay: 1.3,
        ease: "expo.inOut"
    });

    gsap.timeline().to(".header-caption", {
        duration: 1.5,
        y: 0,
        opacity: 1,
        delay: 1.3,
        ease: "expo.inOut"
    });
}

function animationAbout() {


    gsap.to(".about-text", {
        scrollTrigger: {
            trigger: ".about-text",
            start: "top 60%",  // Commence l'animation lorsque le texte est à 80% de la hauteur de la fenêtre
            end: "top 20%",    // Termine l'animation lorsque le texte est à 20% de la hauteur de la fenêtre
            scrub: true        // Synchronise l'animation avec le défilement
        },
        opacity: 1,
        duration: 1
    });




    let tl1 = gsap.timeline({
        scrollTrigger: {
            trigger: "#about-caption-1",
            start: "top center",
            end: "top+=800 center",
            scrub: true,
        }
    });

    let tl2 = gsap.timeline({
        scrollTrigger: {
            trigger: "#about-caption-2",
            start: "top+=800 center",
            end: "top+=1600 center",
            scrub: true,
        }
    });

    let tl3 = gsap.timeline({
        scrollTrigger: {
            trigger: "#about-caption-3",
            start: "top+=1800 center",
            end: "top+=5000 center",
            scrub: true,
        }
    });

    let tl4 = gsap.timeline({
        scrollTrigger: {
            trigger: "#about-caption-3",
            start: "top+=2100 center",
            end: "top+=5000 center",
            scrub: true,
        }
    });

    let tl5 = gsap.timeline({
        scrollTrigger: {
            trigger: "#about-caption-3",
            start: "top+=2400 center",
            end: "top+=5000 center",
            scrub: true,
        }
    });

    let tl6 = gsap.timeline({
        scrollTrigger: {
            trigger: "#about-caption-3",
            start: "top+=5000 center",
            end: "top+=6300 center",
            scrub: true,
        }
    });

    let tl7 = gsap.timeline({
        scrollTrigger: {
            trigger: "#about-caption-3",
            start: "top+=6500 center",
            end: "top+=9000 center",
            scrub: true,
        }
    });

    let tl8 = gsap.timeline({
        scrollTrigger: {
            trigger: "#about-caption-3",
            start: "top+=9000 center",
            end: "top+=11000 center",
            scrub: true,
        }
    });

    tl1.fromTo("#about-caption-1", {opacity: 0, letterSpacing: 'normal'}, {
        opacity: 1,
        letterSpacing: '5px',
    })
        .to("#about-caption-1", {opacity: 0});

    tl2.fromTo("#about-caption-2", {opacity: 0, scale: 1}, {opacity: 1, scale: 1})
        .to("#about-caption-2", {opacity: 0, scale: 0});

    tl3.fromTo("#about-caption-3", {opacity: 0, y: 20}, {opacity: 1, y: 0})
        .to("#about-caption-3", {opacity: 0, y: -20});

    tl4.fromTo("#about-caption-4", {opacity: 0, y: 20}, {opacity: 1, y: 0})
        .to("#about-caption-4", {opacity: 0, y: -20});

    tl5.fromTo("#about-caption-5", {opacity: 0, y: 20}, {opacity: 1, y: 0})
        .to("#about-caption-5", {opacity: 0, y: -20});

    tl6.fromTo("#about-caption-6", {opacity: 0, y: 20}, {opacity: 1, y: 0})
        .to("#about-caption-6", {opacity: 0, y: -20});

    tl7.fromTo("#about-caption-7", {opacity: 0, y: 20}, {opacity: 1, y: 0})
        .to("#about-caption-7", {opacity: 0, y: -20});

    tl8.fromTo("#about-caption-8", {opacity: 0, y: 20}, {opacity: 1, y: 0})
        .to("#about-caption-8", {opacity: 0, y: -20});
}

function animationProduct() {
    const items = gsap.utils.toArray(".carousel-item");

    // Créer une timeline
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: ".carousel",
            start: "top 60%",  // Commence l'animation lorsque le conteneur est à 80% de la hauteur de la fenêtre
            end: "top 20%",    // Termine l'animation lorsque le conteneur est à 20% de la hauteur de la fenêtre
            scrub: true        // Synchronise l'animation avec le défilement
        }
    });

    // Ajouter des animations à la timeline
    items.forEach((item, index) => {
        tl.fromTo(item,
            {
                y: index % 2 === 0 ? -50 : 50, // Un item sur deux arrive par le haut ou par le bas
                opacity: 0
            },
            {
                y: 0,
                opacity: 1,
                duration: 0.5,
                ease: "power2.out"
            }, index * 0.2 // Délai entre chaque apparition
        );
    });
}

function animationProposal() {
    gsap.to("#proposal .container", {
        scrollTrigger: {
            trigger: "#proposal .container",
            start: "top 80%",  // Commence l'animation lorsque le texte est à 80% de la hauteur de la fenêtre
            end: "top 60%",    // Termine l'animation lorsque le texte est à 20% de la hauteur de la fenêtre
            scrub: true        // Synchronise l'animation avec le défilement
        },
        opacity: 1,
        duration: 1
    });

    gsap.utils.toArray(".list-item").forEach(item => {
        gsap.to(item, {
            scrollTrigger: {
                trigger: item,
                start: "top 80%",  // Commence l'animation lorsque l'élément est à 80% de la hauteur de la fenêtre
                end: "top 20%",    // Termine l'animation lorsque l'élément est à 20% de la hauteur de la fenêtre
                scrub: true        // Synchronise l'animation avec le défilement
            },
            opacity: 1,
            y: 0,
            duration: 1
        });
    });
}

window.onload = function () {
    gsap.registerPlugin(ScrollTrigger);
    animationAuthor();
    animationHeader();
    animationAbout();
    animationProduct();
    animationProposal();
};

document.addEventListener('DOMContentLoaded', () => {
    customCursor();
    renderProducts();
});

function customCursor() {
    if (window.innerWidth > 1024) {
        document.body.classList.add('desktop-theme');

        const customCursor = document.createElement('div');
        customCursor.classList.add('custom-cursor');
        document.body.appendChild(customCursor);

        // Met à jour la position du curseur
        document.addEventListener('mousemove', (e) => {
            gsap.to(customCursor, {
                x: e.clientX,
                y: e.clientY,
                duration: 0.1,
                ease: 'power2.out'
            });
        });

        // Ajoute des effets de survol pour les liens
        document.querySelectorAll('a, button, .carousel-item img, .carousel-action:not(.disabled), .product-details-close-button').forEach((element) => {
            element.addEventListener('mouseenter', () => {
                gsap.to(customCursor, {
                    width: '48px',
                    height: '48px',
                    duration: 0.2,
                    ease: 'power2.out'
                });
            });

            element.addEventListener('mouseleave', () => {
                gsap.to(customCursor, {
                    width: '24px',
                    height: '24px',
                    duration: 0.2,
                    ease: 'power2.out'
                });
            });
        });

        hasCursor = true;
    }
}

function renderProducts() {
    const carousel = document.querySelector('.carousel');
    const productsData = [
        {
            id: 0,
            name: 'Bibliothèque Pont',
            date: '2024',
            caption: 'Alliage de bois et de métal pour un design épuré et moderne, cette bibliothèque sur mesure s\inspire du Golden Gate Bridge.',
            image: 'meuble-metal-bois-bibliotheque.png',
            token: '4177cj8T59jYKDBT'
        },
        {
            id: 1,
            name: 'Etagère Pont',
            date: '2024',
            caption: 'Dans la continuité de la bibliothèque Pont, cette étagère murale s\'inspire de la structure de célèbres ponts.',
            image: 'meuble-metal-bois-etagere.png',
            token: '8Vi6vtCZH80QcxcH'
        },
        {
            id: 2,
            name: 'Commode Arquée',
            date: '2023',
            caption: 'Composée exclusivement de métal, cette commode arquée est un meuble de rangement organique encré dans un design moderne et minimaliste.',
            image: 'meuble-metal-commode-arquee.png',
            token: '61Hadt6isCer-sRs'
        },
        {
            id: 3,
            name: 'Tables basses emboitées',
            date: '2023',
            caption: 'Composées d\'acier inoxydable, ces tables sont un ensemble de meubles modulables et minimaliste.',
            image: 'meuble-metal-table-basse-imbriquee.png',
            token: 'Rg1uyPemzrX7AiSz'
        },
        {
            id: 4,
            name: 'Enfilade bois et métal noir',
            date: '2022',
            caption: 'Cette enfilade est un meuble de rangement en bois et métal noir, inspiré des meubles naturels modernes',
            image: 'meuble-commode-presentation.png',
            token: 'CgeuD4sMzZhLtJ-U'
        },
        {
            id: 5,
            name: 'Table basse bois miroir',
            date: '2022',
            caption: 'Cette table basse en bois et acier inoxydable permet le rangement de vos objets tout en reflétant la lumière.',
            image: 'meuble-metal-table-basse-miroir.png',
            token: 'HdaynTQOUNRZZSJT'
        }
    ];

    function initProductList() {
        // Création du conteneur pour les détails du produit
        const productDetailsContainer = document.createElement('div');
        productDetailsContainer.classList.add('product-details-container');
        productDetailsContainer.innerHTML = `
            <button class="product-details-close-button">Fermer</button>
            <div class="product-caption">
                <div class="product-content">
                    <h2 id="details-name"></h2>
                    <p id="details-caption"></p>
                </div>
                <div class="carousel-action-group">
                    <div class="carousel-action details-previous">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="black" class="size-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 15.75L3 12m0 0l3.75-3.75M3 12h18" />
                        </svg>
                    </div>
                    <div class="carousel-action details-next">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="black" class="size-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                        </svg>
                    </div>
                </div>
            </div>
            <div class="render-container"></div>
        `;

        // Références des éléments du DOM
        const renderContainer = productDetailsContainer.querySelector('.render-container');
        const detailsCaption = productDetailsContainer.querySelector('#details-caption');
        const detailsName = productDetailsContainer.querySelector('#details-name');
        const detailsPrevious = productDetailsContainer.querySelector('.details-previous');
        const detailsNext = productDetailsContainer.querySelector('.details-next');

        // Événement pour fermer les détails du produit
        productDetailsContainer.querySelector('.product-details-close-button').addEventListener('click', () => {
            document.body.style.overflow = 'auto';
            gsap.to(productDetailsContainer, {
                height: 0,
                duration: 1.5,
                ease: 'expo.inOut',
                onComplete: () => productDetailsContainer.style.display = 'none'
            });
        });

        // Événements pour naviguer entre les produits
        detailsPrevious.addEventListener('click', navigateProduct);
        detailsNext.addEventListener('click', navigateProduct);

        document.body.appendChild(productDetailsContainer);

        productsData.forEach(product => {
            // Création des éléments du carrousel
            const carouselItem = document.createElement('div');
            carouselItem.classList.add('carousel-item');
            carouselItem.innerHTML = `;
                <img src="assets/images/${product.image}" alt="${product.name}">
                <div class="carousel-item-caption">
                    <p>${product.name}</p>
                    <p>${product.date}</p>
                </div>
            `;

            carouselItem.addEventListener('click', () => {
                document.body.style.overflow = 'hidden';
                productDetailsContainer.style.display = 'flex';
                renderContainer.style.transform = `translateX(-${product.id * 100}vw)`;
                updateProductDetails(product);
                gsap.to(productDetailsContainer, {
                    height: '100vh',
                    duration: 1.5,
                    ease: 'expo.inOut'
                });
            });

            carousel.appendChild(carouselItem);

            // Ajout des éléments de rendu du produit
            const productRender = document.createElement('spline-viewer');
            productRender.classList.add('product-render');
            productRender.url = `https://prod.spline.design/${product.token}/scene.splinecode`;
            renderContainer.appendChild(productRender);
        });

        // Fonction de mise à jour des détails du produit
        function updateProductDetails(product) {
            gsap.to([detailsName, detailsCaption], {
                opacity: 0,
                y: 20,
                duration: 0.5,
                stagger: 0.1,
                onComplete: () => {
                    detailsName.textContent = product.name;
                    detailsCaption.textContent = product.caption;
                    gsap.to([detailsName, detailsCaption], {
                        opacity: 1,
                        y: 0,
                        duration: 0.5,
                        stagger: 0.1
                    });
                }
            });

            detailsPrevious.dataset.productTarget = product.id - 1;
            detailsNext.dataset.productTarget = product.id + 1;
        }

        // Fonction de navigation entre les produits
        function navigateProduct(event) {
            const targetId = event.currentTarget.dataset.productTarget;
            const targetProduct = productsData.find(p => p.id == targetId);

            if (targetProduct) {
                updateProductDetails(targetProduct);
                gsap.to(renderContainer, {
                    x: `-${targetProduct.id * 100}vw`,
                    duration: 1.5,
                    ease: 'power2.inOut'
                });
            }
        }

    }

    function initProductListButtons() {
        const items = document.querySelectorAll('.carousel-item');
        const prevBtn = document.getElementById('carouselPrevious');
        const nextBtn = document.getElementById('carouselNext');
        const totalItems = items.length;
        const itemsToShow = 4;
        const gap = 32;
        const padding = 32;
        let currentIndex = 0;

        function updateButtons() {
            if (currentIndex === 0) {
                prevBtn.classList.add('disabled');
            } else {
                prevBtn.classList.remove('disabled');
            }
            if (currentIndex >= totalItems - itemsToShow) {
                nextBtn.classList.add('disabled');
            } else {
                nextBtn.classList.remove('disabled');
            }
        }

        function updateCarousel() {
            const itemWidth = items[0].offsetWidth;
            const offset = -currentIndex * (itemWidth + gap);
            gsap.to(carousel, {x: offset + padding, duration: 0.5, ease: 'power2.out'});
            updateButtons();
        }

        prevBtn.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                updateCarousel();
            }
        });

        nextBtn.addEventListener('click', () => {
            if (currentIndex < totalItems - itemsToShow) {
                currentIndex++;
                updateCarousel();
            }
        });
        updateButtons();
    }

    initProductList();
    initProductListButtons();
}
