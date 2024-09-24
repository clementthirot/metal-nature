function simpleTrigger(element, params) {
    gsap.to(element, {
        scrollTrigger: {
            trigger: element,
            start: triggerStart,
            toggleActions: 'play none none none',
        },
        ...params
    })
}

function buildScrollTimeline(trigger, scrub = false) {
    return aboutTimeline = gsap.timeline({
        scrollTrigger: {
            trigger: trigger,
            start: scrollTriggerStart,
            scrub: scrub,
            delay: 1
        }
    });
}

function splitParagraphToWords(element) {
    const containerClassName = 'animate-word-container';
    const wordClassName = 'animate-word';
    element.innerHTML = element.textContent.replace(/\S+/g, `<span class='${containerClassName}'><span class='${wordClassName}'>$&</span></span>`);
    return element.getElementsByClassName(wordClassName);
}