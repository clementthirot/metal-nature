window.onbeforeunload = function () {
    window.scrollTo(0, 0);
}

window.onload = function() {
    gsap.registerPlugin(ScrollTrigger);

        const part1 = document.querySelector('.part-1');
        const part2 = document.querySelector('.part-2');

        gsap.set(part1, { x: '-30%' });
        gsap.set(part2, { x: '30%' });

        gsap.timeline({
            scrollTrigger: {
                trigger: '.scroll-title',
                start: 'top 100%',
                scrub: true,
            }
        })
            .to(part1, { x: '50%', ease: 'none' })
            .to(part2, { x: '-50%', ease: 'none' }, '<');


    gsap.timeline()
        .to(".title-line", {
            y: 0,
            opacity: 1,
            duration: 1,
            stagger: {
                amount: 0.1,
                from: "start",
            },
            ease: "power4.out"
        });

    let tl1 = gsap.timeline({
        scrollTrigger: {
            trigger: "#about-caption-1",
            start: "top center",
            end: "top+=450 center",
            scrub: true,
        }
    });

    let tl2 = gsap.timeline({
        scrollTrigger: {
            trigger: "#about-caption-2",
            start: "top+=700 center",
            end: "top+=1300 center",
            scrub: true,
        }
    });

    tl1.fromTo("#about-caption-1", { opacity: 0, letterSpacing: 'normal' }, { opacity: 1, letterSpacing: '5px', duration: 0.5 })
        .to("#about-caption-1", { opacity: 0, duration: 0.5 });

    tl2.fromTo("#about-caption-2", { opacity: 0, scale: 1 }, { opacity: 1, scale: 1, duration: 0.5 })
        .to("#about-caption-2", { opacity: 1, scale: 1 })  // Maintient l'état pendant le scroll
        // Animation pour faire disparaître en s'éloignant
        .fromTo("#about-caption-2", { opacity: 1, scale: 1 }, { opacity: 0, scale: 0.5, duration: 0.5 });

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
        document.querySelectorAll('a, button, .carousel-item, .carousel-action:not(.disabled), .product-details-close-button').forEach((element) => {
            element.addEventListener('mouseenter', () => {
                gsap.to(customCursor, {
                    width: '40px',
                    height: '40px',
                    duration: 0.2,
                    ease: 'power2.out'
                });
            });

            element.addEventListener('mouseleave', () => {
                gsap.to(customCursor, {
                    width: '20px',
                    height: '20px',
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
            date: '2023',
            caption: 'Alliage de bois et de métal pour un design épuré et moderne, cette bibliothèque sur mesure s\inspire du Golden Gate Bridge.',
            image: 'meuble-metal-bois-bibliotheque.png',
            token: '4177cj8T59jYKDBT'
        },
        {
            id: 1,
            name: 'Etagère Pont',
            date: '2023',
            caption: 'Description du produit 2',
            image: 'meuble-metal-bois-etagere.png',
            token: '8Vi6vtCZH80QcxcH'
        },
        {
            id: 2,
            name: 'Commode Arquée',
            date: '2023',
            caption: 'Description du produit 2',
            image: 'meuble-metal-commode-arquee.png',
            token: '61Hadt6isCer-sRs'
        },
        {
            id: 3,
            name: 'Etagère vide poche',
            date: '2023',
            caption: 'Description du produit 2',
            image: 'meuble-metal-etagere-entree.png',
            token: '61Hadt6isCer-sRs'
        },
        {
            id: 4,
            name: 'Tables basses emboitées',
            date: '2023',
            caption: 'Description du produit 2',
            image: 'meuble-metal-table-basse-imbriquee.png',
            token: '61Hadt6isCer-sRs'
        },
        {
            id: 5,
            name: 'Table murale',
            date: '2023',
            caption: 'Description du produit 2',
            image: 'meuble-metal-table-murale.png',
            token: '61Hadt6isCer-sRs'
        },
        {
            id: 6,
            name: 'Table de nuit arquée',
            date: '2023',
            caption: 'Description du produit 2',
            image: 'meuble-metal-tiroir-cascade.png',
            token: '61Hadt6isCer-sRs'
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
            carouselItem.innerHTML = `
                <img src="assets/images/${product.image}" alt="${product.name}">
                <div class="carousel-item-caption">
                    <p>${product.name}</p>
                    <p>${product.date}</p>
                </div>
            `;

            carouselItem.addEventListener('click', () => {
                document.body.style.overflow = 'hidden';
                productDetailsContainer.style.display = 'flex';
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