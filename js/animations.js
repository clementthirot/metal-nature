window.addEventListener('beforeunload', function () {
    window.scrollTo(0, 0);
});

document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(ScrollTrigger);
    customCursor();
    renderProducts();
    animationAuthor();
    animationHeader();
    animationAbout();
    animationProduct();
    animationProposal();
});

function animationHeader() {
    const headerTimeline = gsap.timeline();
    headerTimeline
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
            stagger: {
                amount: 0.2,
                from: "start",
            },
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

    const aboutTimeline = buildScrollTimeline(aboutText);
    gsap.set(aboutWords, {y: 40, opacity: 1});
    gsap.set(separator, {width: 0, opacity: 1});

    aboutTimeline
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
    const productText = document.getElementById("product-caption");
    const productWords = splitParagraphToWords(productText);
    const productList = document.querySelectorAll('.carousel-item');
    const carousel = document.querySelector('.carousel');

    const productTimeline = buildScrollTimeline(carousel);
    gsap.set(productWords, {y: 40, opacity: 1});
    gsap.set(productList, {y: 50, opacity: 0});

    productTimeline
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

    const authorTimeline = buildScrollTimeline(title, true);
    gsap.set(firstTitle, {x: '-30%'});
    gsap.set(lastTitle, {x: '30%'});

    authorTimeline
        .to(firstTitle, {
            x: '50%',
            ease: 'none'
        })
        .to(lastTitle, {
            x: '-50%',
            ease: 'none'
        }, '<');
}

function animationProposal() {
    const proposalContainer = document.querySelector("#proposal .container");
    const proposalText = document.getElementById("proposal-caption");
    const proposalWords = splitParagraphToWords(proposalText);
    const proposalList = document.querySelectorAll('.list-group-item');

    const proposalTimeline = buildScrollTimeline(proposalContainer);
    gsap.set(proposalWords, {y: 40, opacity: 1});
    gsap.set(proposalList, {width: 0});

    proposalTimeline
        .to(proposalWords, {
            y: 0,
            opacity: 1,
            duration: 1,
            stagger: 0.015,
            ease: "power4.out"
        });

    proposalList.forEach(item => {
        const tl = buildScrollTimeline(item);
        const words = splitParagraphToWords(item);
        gsap.set(words, {y: 40, opacity: 1});
        tl
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

        productListJSON.forEach(product => {
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
            const targetProduct = productListJSON.find(p => p.id == targetId);

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