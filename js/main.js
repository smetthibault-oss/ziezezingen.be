const heroSlider = document.querySelector('.hero-slider');
if (heroSlider) {
  const slides = Array.from(heroSlider.querySelectorAll('.slide'));
  const dots = Array.from(document.querySelectorAll('.hero-dots .dot'));
  let current = 0;
  let timer;

  function goTo(index) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  function startAutoplay() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 5000);
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      goTo(i);
      startAutoplay();
    });
  });

  startAutoplay();
}

document.querySelectorAll('.nav-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const nav = btn.closest('.navbar').querySelector('.nav-links');
    const isOpen = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
  });
});

const videoModal = document.getElementById('videoModal');
if (videoModal) {
  const frame = document.getElementById('videoModalFrame');

  function openVideoModal(youtubeId) {
    frame.src = `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1`;
    videoModal.hidden = false;
  }

  function closeVideoModal() {
    videoModal.hidden = true;
    frame.src = '';
  }

  document.querySelectorAll('.video-card[data-youtube-id]').forEach((card) => {
    card.addEventListener('click', () => openVideoModal(card.dataset.youtubeId));
  });

  videoModal.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', closeVideoModal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !videoModal.hidden) closeVideoModal();
  });
}

document.querySelectorAll('.newsletter-form').forEach((form) => {
  form.addEventListener('submit', () => {
    const success = form.parentElement.querySelector('.newsletter-success');
    setTimeout(() => {
      form.reset();
      form.hidden = true;
      if (success) success.hidden = false;
    }, 600);
  });
});
