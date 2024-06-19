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

gsap.registerPlugin(ScrollTrigger);

let tl1 = gsap.timeline({
    scrollTrigger: {
        trigger: "#about-caption-1",
        start: "top center",
        end: "top+=450 center",
        scrub: true,
        // markers: true
    }
});

let tl2 = gsap.timeline({
    scrollTrigger: {
        trigger: "#about-caption-2",
        start: "top+=700 center",
        end: "top+=1300 center",
        scrub: true,
        // markers: true
    }
});

// Timeline pour about-caption-1
tl1.fromTo("#about-caption-1", { opacity: 0, letterSpacing: 'normal' }, { opacity: 1, letterSpacing: '5px', duration: 0.5 })
    .to("#about-caption-1", { opacity: 0, duration: 0.5 });

// Timeline pour about-caption-2 pour apparaître
tl2.fromTo("#about-caption-2", { opacity: 0, scale: 1 }, { opacity: 1, scale: 1, duration: 0.5 })
    .to("#about-caption-2", { opacity: 1, scale: 1 })  // Maintient l'état pendant le scroll
    // Animation pour faire disparaître en s'éloignant
    .fromTo("#about-caption-2", { opacity: 1, scale: 1 }, { opacity: 0, scale: 0.5, duration: 0.5 });
