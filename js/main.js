const heroSlider = document.querySelector('.hero-slider');
if (heroSlider) {
  const slides = Array.from(heroSlider.querySelectorAll('.slide'));
  const dots = Array.from(document.querySelectorAll('.hero-dots .dot'));
  const heroTitle = document.querySelector('.hero-title');
  let current = 0;
  let timer;
  let titleTimer;

  function flashTitle() {
    if (!heroTitle) return;
    clearTimeout(titleTimer);
    heroTitle.classList.add('visible');
    titleTimer = setTimeout(() => heroTitle.classList.remove('visible'), 1800);
  }

  function goTo(index) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
    flashTitle();
  }

  function startAutoplay() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 2800);
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      goTo(i);
      startAutoplay();
    });
  });

  // Swipe support for touch devices
  let touchStartX = 0;
  let touchEndX = 0;

  heroSlider.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  heroSlider.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const delta = touchEndX - touchStartX;
    const threshold = 40;
    if (delta > threshold) {
      goTo(current - 1);
      startAutoplay();
    } else if (delta < -threshold) {
      goTo(current + 1);
      startAutoplay();
    }
  }, { passive: true });

  flashTitle();
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

const contactForm = document.getElementById('contactForm');
if (contactForm) {
  const status = contactForm.querySelector('.contact-form-status');
  const submitBtn = contactForm.querySelector('button[type="submit"]');

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    status.hidden = true;

    try {
      const res = await fetch(contactForm.action, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      const data = await res.json();
      status.textContent = data.message;
      status.className = 'contact-form-status ' + (data.success ? 'success' : 'error');
      status.hidden = false;
      if (data.success) contactForm.reset();
    } catch (err) {
      status.textContent = 'Er ging iets mis. Mail ons gerust rechtstreeks op info@ziezezingen.be.';
      status.className = 'contact-form-status error';
      status.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
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
