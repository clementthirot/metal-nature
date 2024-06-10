window.onload = function() {
    gsap.registerPlugin(ScrollTrigger);

    gsap.fromTo(".part-1",
        { x: -100, opacity: 0 },
        {
            x: 0,
            opacity: 1,
            scrollTrigger: {
                trigger: ".scroll-title",
                start: "top 80%", // Début de l'animation quand le titre est visible
                end: "top 50%", // Fin de l'animation
                scrub: true, // Animation liée au défilement
            }
        }
    );

    gsap.fromTo(".part-2",
        { x: 100, opacity: 0 },
        {
            x: 0,
            opacity: 1,
            scrollTrigger: {
                trigger: ".scroll-title",
                start: "top 80%",
                end: "top 50%",
                scrub: true,
            }
        }
    );

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
};




const carousel = document.querySelector('.carousel');
const images = document.querySelectorAll('.carousel img');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const totalImages = images.length / 2; // Réel nombre d'images (avant duplication)
let currentIndex = 0;

function updateCarousel(index) {
    const offset = -index * 25; // Déplace de 25% par image
    gsap.to(carousel, { xPercent: offset, duration: 0.5, ease: 'power2.out' });
}

prevBtn.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + totalImages) % totalImages;
    if (currentIndex < 0) {
        currentIndex = totalImages - 1;
    }
    updateCarousel(currentIndex);
    if (currentIndex === totalImages - 1) {
        setTimeout(() => {
            gsap.set(carousel, { xPercent: -(totalImages - 1) * 25 });
            currentIndex = 0;
        }, 500);
    }
});

nextBtn.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % totalImages;
    updateCarousel(currentIndex);
    if (currentIndex === 0) {
        setTimeout(() => {
            gsap.set(carousel, { xPercent: 0 });
            currentIndex = totalImages - 1;
        }, 500);
    }
});
