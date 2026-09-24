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

// Community section: the big intro title shrinks up into the small
// permanent title, then the body text fades in underneath it. Two things
// can trigger this (scrolling it into view, or clicking "Over ons" in the
// nav) — if both fire close together, cancel whichever run is still in
// flight so their timeouts never interleave and show the intro title
// popping back up over the already-revealed body text.
let communityRevealTimeouts = [];

function playCommunityReveal() {
  const section = document.getElementById('community');
  if (!section) return;
  const introTitle = section.querySelector('.community-intro-title');
  const finalTitle = section.querySelector('.community-title');
  const body = section.querySelector('.community-body');

  communityRevealTimeouts.forEach(clearTimeout);
  communityRevealTimeouts = [];

  introTitle.classList.remove('visible', 'shrink');
  finalTitle.classList.remove('visible');
  if (body) body.classList.remove('visible');
  void introTitle.offsetWidth; // restart the CSS transition even if it just ran
  requestAnimationFrame(() => {
    introTitle.classList.add('visible');
    communityRevealTimeouts.push(setTimeout(() => {
      introTitle.classList.add('shrink');
      finalTitle.classList.add('visible');
      communityRevealTimeouts.push(setTimeout(() => body && body.classList.add('visible'), 400));
    }, 1800));
  });
}

const communitySection = document.getElementById('community');
if (communitySection) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        playCommunityReveal();
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });
  observer.observe(communitySection);
}

// Replay the reveal whenever a menu link jumps to that section again
document.querySelectorAll('a[href="#community"], a[href="#newsletter"]').forEach((link) => {
  link.addEventListener('click', () => {
    if (link.getAttribute('href') === '#community') {
      playCommunityReveal();
      return;
    }
    const title = document.querySelector('#' + link.getAttribute('href').slice(1) + ' .reveal-title');
    if (title) playReveal(title, title.nextElementSibling);
  });
});

const heroSlider = document.querySelector('.hero-slider');
if (heroSlider) {
  const slides = Array.from(heroSlider.querySelectorAll('.slide'));
  const dots = Array.from(document.querySelectorAll('.hero-dots .dot'));
  const heroTitleEl = document.querySelector('.hero-title');
  const heroSubtitle = document.querySelector('.hero-subtitle');
  const heroQuote = document.querySelector('.hero-quote');
  const SLIDE_MS = 2800;
  const FIRST_SLIDE_MS = 3000; // the opening photo stays a little longer
  const QUOTE_GAP_MS = 250;
  const SUBTITLE_SLIDE_COUNT = 2; // "Samenzang — community" sits on the first 2 photos
  let current = 0;
  let timer;
  let quoteGapTimer;
  let titleGapTimer;
  let subtitleGapTimer;

  function durationFor(index) {
    return index === 0 ? FIRST_SLIDE_MS : SLIDE_MS;
  }

  // "ZIE ZE ZINGEN!" only ever sits on the very first photo.
  function hasMainTitle(index) {
    return index === 0;
  }

  function hasSubtitle(index) {
    return index < SUBTITLE_SLIDE_COUNT;
  }

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
      quoteGapTimer = setTimeout(() => heroQuote.classList.remove('visible'), durationFor(index) - QUOTE_GAP_MS);
    }
  }

  // The title and subtitle each sit on their own range of opening photos
  // and are gone again just before the first quote (on the next photo) arrives.
  function updateTitleForSlide(index) {
    if (heroTitleEl) {
      clearTimeout(titleGapTimer);
      if (!hasMainTitle(index)) {
        heroTitleEl.classList.remove('visible');
      } else {
        heroTitleEl.classList.add('visible');
        if (!hasMainTitle((index + 1) % slides.length)) {
          titleGapTimer = setTimeout(() => heroTitleEl.classList.remove('visible'), durationFor(index) - 600);
        }
      }
    }

    if (heroSubtitle) {
      clearTimeout(subtitleGapTimer);
      if (!hasSubtitle(index)) {
        heroSubtitle.classList.remove('visible');
      } else {
        heroSubtitle.classList.add('visible');
        if (!hasSubtitle((index + 1) % slides.length)) {
          subtitleGapTimer = setTimeout(() => heroSubtitle.classList.remove('visible'), durationFor(index) - 600);
        }
      }
    }
  }

  function goTo(index) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
    updateTitleForSlide(current);
    updateQuoteForSlide(current);
  }

  function startAutoplay() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      goTo(current + 1);
      startAutoplay();
    }, durationFor(current));
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

  updateTitleForSlide(current);
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

document.querySelectorAll('.newsletter-hint').forEach((hint) => {
  const group = hint.closest('.nav-cta-group');
  const cta = group && group.querySelector('.nav-cta');
  const arrow = hint.querySelector('.hint-arrow');
  const logo = document.querySelector('.navbar .logo img');
  const isHomePage = !!document.querySelector('.hero-slider');
  const BOUNCE_MS = 600; // matches the cta-bounce keyframe duration in CSS
  const navbar = hint.closest('.navbar');
  let isPlaying = false;

  // Show the full "Welkom..." line by default; only fall back to the short
  // "Mis geen nieuwtje" once the long one no longer fits the nav bar,
  // whatever the screen size is (not a fixed breakpoint).
  function fitHintText() {
    if (!navbar) return;
    hint.classList.remove('compact');
    if (navbar.scrollWidth > navbar.clientWidth) {
      hint.classList.add('compact');
    }
  }

  fitHintText();
  window.addEventListener('resize', fitHintText);

  function restartAnimation(el) {
    if (!el) return;
    el.style.animation = 'none';
    void el.offsetWidth; // force a reflow so the animation restarts from 0
    el.style.animation = '';
  }

  const MIN_TEXT_MS = 3000; // the text always stays at least 3s, however short the bounce is

  // bounceCount: how many times the button hops. The hint text stays on
  // screen for at least 3s, or exactly as long as the bounces if that's longer.
  function playHint(bounceCount) {
    if (isPlaying) return; // let the current run finish before it can restart
    isPlaying = true;

    hint.style.setProperty('--hint-duration', Math.max(BOUNCE_MS * bounceCount, MIN_TEXT_MS) + 'ms');
    hint.classList.add('play');

    if (cta) {
      cta.style.setProperty('--bounce-count', bounceCount);
      cta.classList.remove('bounce');
      void cta.offsetWidth;
      cta.classList.add('bounce');
    }

    // logo flicker, arrow glow, text fade-in and the button bounce all fire as one moment
    restartAnimation(logo);
    restartAnimation(arrow);
  }

  hint.addEventListener('animationend', (e) => {
    if (e.target === hint.querySelector('.hint-text')) {
      hint.classList.remove('play');
      isPlaying = false;
    }
  });

  // The homepage opens (or is reached via the logo) with a triple bounce;
  // every later trigger (the 10s loop, hover) and every other page just bounce once.
  playHint(isHomePage ? 3 : 1);
  setInterval(() => playHint(1), 10000);

  if (group) group.addEventListener('mouseenter', () => playHint(1));
});

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
