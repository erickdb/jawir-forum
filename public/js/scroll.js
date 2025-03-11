const efectPost = {
    origin: 'top',
    distance: '50px',
    opacity: 0,
    delay: 100,
    duration: 1150,
    interval: 200,
    scale: 1.2,
    reset: true
}

ScrollReveal().reveal('.scroll-post', efectPost);
ScrollReveal().reveal('.head-tittle', { origin: 'left', distance: '70px', opacity: 1, delay: 100, duration: 1500, reset: true });
ScrollReveal().reveal('.head-welcome', { origin: 'right', distance: '70px', opacity: 1, delay: 100, duration: 1500, reset: true });