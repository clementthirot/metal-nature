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
};




document.addEventListener('DOMContentLoaded', function() {
    const carousel = document.querySelector('.carousel');
    const items = document.querySelectorAll('.carousel-item');
    const prevBtn = document.getElementById('carouselPrevious');
    const nextBtn = document.getElementById('carouselNext');
    const totalItems = items.length;
    const itemsToShow = 4; // Number of items to show at once
    const gap = 32; // Gap between items in pixels
    const padding = 32; // Padding of the carousel in pixels
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
        gsap.to(carousel, { x: offset + padding, duration: 0.5, ease: 'power2.out' });
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

    // Initialize carousel and buttons state
    updateButtons();
});


