// 1) title fades in and holds, 2) title fades out, 3) only then the text fades in
function playReveal(title, body) {
  title.classList.remove('visible');
  if (body) body.classList.remove('visible');
  void title.offsetWidth; // restart the CSS transition even if it just ran
  requestAnimationFrame(() => {
    title.classList.add('visible');
    setTimeout(() => {
      title.classList.remove('visible');
      setTimeout(() => body && body.classList.add('visible'), 800);
    }, 1800);
  });
}

document.querySelectorAll('.reveal-title').forEach((title) => {
  const body = title.nextElementSibling;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        playReveal(title, body);
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });
  observer.observe(title);
});

// Replay the reveal whenever a menu link jumps to that section again
document.querySelectorAll('a[href="#community"], a[href="#newsletter"]').forEach((link) => {
  link.addEventListener('click', () => {
    const title = document.querySelector('#' + link.getAttribute('href').slice(1) + ' .reveal-title');
    if (title) playReveal(title, title.nextElementSibling);
  });
});

const heroSlider = document.querySelector('.hero-slider');
if (heroSlider) {
  const slides = Array.from(heroSlider.querySelectorAll('.slide'));
  const dots = Array.from(document.querySelectorAll('.hero-dots .dot'));
  const heroTitle = document.querySelector('.hero-title-group');
  const heroQuote = document.querySelector('.hero-quote');
  const SLIDE_MS = 2800;
  const QUOTE_GAP_MS = 250;
  let current = 0;
  let timer;
  let quoteGapTimer;

  // A quote (data-quote) runs across consecutive photos that carry the same
  // text, appears instantly and drops out just before the photo changes.
  function updateQuoteForSlide(index) {
    if (!heroQuote) return;
    clearTimeout(quoteGapTimer);
    const quote = slides[index].dataset.quote;
    if (!quote) {
      heroQuote.classList.remove('visible');
      return;
    }
    heroQuote.innerHTML = quote;
    heroQuote.classList.add('visible');
    const nextQuote = slides[(index + 1) % slides.length].dataset.quote;
    if (nextQuote !== quote) {
      quoteGapTimer = setTimeout(() => heroQuote.classList.remove('visible'), SLIDE_MS - QUOTE_GAP_MS);
    }
  }

  // The title sits on the first photo and is gone again before the second
  // photo (and its quote) arrives.
  function introTitle() {
    if (!heroTitle) return;
    heroTitle.classList.add('visible');
    setTimeout(() => heroTitle.classList.remove('visible'), SLIDE_MS - 600);
  }

  function goTo(index) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
    if (heroTitle) heroTitle.classList.remove('visible');
    updateQuoteForSlide(current);
  }

  function startAutoplay() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), SLIDE_MS);
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

  introTitle();
  startAutoplay();
}

// Size the background video iframe to always cover its box, no matter how
// the box's own aspect ratio changes across breakpoints (mobile especially,
// where the box gets much closer to square than the video's 16:9 source).
const bgVideoWrap = document.querySelector('.section-bg-video');
if (bgVideoWrap) {
  const bgVideoFrame = bgVideoWrap.querySelector('iframe');
  const videoRatio = 16 / 9;
  const fitBgVideo = () => {
    const w = bgVideoWrap.clientWidth;
    const h = bgVideoWrap.clientHeight;
    if (!w || !h) return;
    if (w / h > videoRatio) {
      bgVideoFrame.style.width = w + 'px';
      bgVideoFrame.style.height = Math.ceil(w / videoRatio) + 'px';
    } else {
      bgVideoFrame.style.height = h + 'px';
      bgVideoFrame.style.width = Math.ceil(h * videoRatio) + 'px';
    }
  };
  fitBgVideo();
  window.addEventListener('resize', fitBgVideo);
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
      const isLocal = ['localhost', '127.0.0.1', ''].includes(location.hostname);
      status.textContent = isLocal
        ? 'Lokaal werkt het formulier niet (er draait geen PHP). Test het op test.ziezezingen.be.'
        : 'Er ging iets mis. Mail ons gerust rechtstreeks op info@ziezezingen.be.';
      status.className = 'contact-form-status error';
      status.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });
}

document.querySelectorAll('.newsletter-form').forEach((form) => {
  form.addEventListener('submit', (e) => {
    if (!form.checkValidity()) {
      form.reportValidity();
      e.preventDefault();
      return;
    }
    const success = form.parentElement.querySelector('.newsletter-success');
    setTimeout(() => {
      form.reset();
      form.hidden = true;
      if (success) success.hidden = false;
    }, 600);
  });
});
