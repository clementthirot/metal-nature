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

