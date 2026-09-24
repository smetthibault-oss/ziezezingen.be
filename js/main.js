// The community section has an intro: the big title floats over the photo,
// shrinks up into the small permanent title, then the body fades in underneath
// it (the title stays). Two things can trigger it - scrolling the section into
// view, or a menu jump - so if both fire close together, cancel whichever run
// is still in flight; otherwise their timeouts interleave and the intro title
// pops back over the revealed text.
const sectionRevealTimeouts = new Map();

function playSectionReveal(section) {
  if (!section) return;
  const introTitle = section.querySelector('.community-intro-title');
  const finalTitle = section.querySelector('.community-title');
  const body = section.querySelector('.community-body');
  if (!introTitle || !finalTitle) return;

  (sectionRevealTimeouts.get(section) || []).forEach(clearTimeout);
  const timeouts = [];
  sectionRevealTimeouts.set(section, timeouts);

  introTitle.classList.remove('visible', 'shrink');
  finalTitle.classList.remove('visible');
  if (body) body.classList.remove('visible');
  void introTitle.offsetWidth; // restart the CSS transition even if it just ran
  requestAnimationFrame(() => {
    introTitle.classList.add('visible');
    timeouts.push(setTimeout(() => {
      introTitle.classList.add('shrink');
      finalTitle.classList.add('visible');
      timeouts.push(setTimeout(() => body && body.classList.add('visible'), 400));
    }, 1800));
  });
}

const communitySection = document.getElementById('community');
if (communitySection) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        playSectionReveal(communitySection);
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });
  observer.observe(communitySection);
}

// Replay the community intro whenever the menu jumps to that section again
document.querySelectorAll('a[href="#community"]').forEach((link) => {
  link.addEventListener('click', () => playSectionReveal(document.getElementById('community')));
});

// The newsletter lives at the clean address /nieuwsbrief. On the home page a
// click scrolls to the section and updates the address bar without reloading;
// from any other page it is a normal link (the server serves /nieuwsbrief/ as
// a copy of the home page that opens at this section).
const newsletterSection = document.getElementById('newsletter');

document.querySelectorAll('a[href="/nieuwsbrief"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    if (!newsletterSection) return;
    e.preventDefault();
    newsletterSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    history.pushState(null, '', '/nieuwsbrief');
  });
});

if (newsletterSection && (location.pathname === '/nieuwsbrief' || location.pathname === '/nieuwsbrief/')) {
  history.replaceState(null, '', '/nieuwsbrief');
  // opening the link should land on the section straight away, not glide down the whole page
  requestAnimationFrame(() => newsletterSection.scrollIntoView({ block: 'center', behavior: 'instant' }));
}

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
  const navbar = btn.closest('.navbar');
  const nav = navbar.querySelector('.nav-links');

  btn.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
  });

  // Close the mobile menu as soon as a menu link (or the newsletter button)
  // is used - needed for same-page anchors like "Over ons", where the page
  // doesn't reload and the open menu would otherwise stay on top.
  navbar.querySelectorAll('.nav-links a, .nav-cta').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });
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
  const logo = document.querySelector('.navbar .logo img');
  const isHomePage = !!document.querySelector('.hero-slider');
  const navbar = hint.closest('.navbar');
  let isPlaying = false;

  // Show the full "Welkom..." line by default; only fall back to the short
  // "Mis geen nieuwtje" once the long one no longer fits the nav bar,
  // whatever the screen size is (not a fixed breakpoint).
  function fitHintText() {
    if (!navbar) return;
    hint.classList.remove('compact', 'hide');
    if (navbar.scrollWidth > navbar.clientWidth) {
      hint.classList.add('compact');
    }
    // last resort on a very tight bar: drop the hint if the button would end
    // up (almost) off the screen. Merely eating into the bar's padding is fine.
    if (cta && cta.getBoundingClientRect().right > window.innerWidth - 8) {
      hint.classList.add('hide');
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

  // bounceCount: how many times the button hops. The hint text itself is
  // permanent (it never fades or blinks); only the button and the logo react.
  function playHint(bounceCount) {
    if (isPlaying) return; // let the current run finish before it can restart
    isPlaying = true;

    if (cta) {
      cta.style.setProperty('--bounce-count', bounceCount);
      cta.classList.remove('bounce');
      void cta.offsetWidth;
      cta.classList.add('bounce');
    }

    // the logo flicker and the button bounce fire as one moment
    restartAnimation(logo);
  }

  if (cta) {
    cta.addEventListener('animationend', (e) => {
      if (e.animationName === 'cta-bounce') isPlaying = false;
    });
  }

  // The homepage opens (or is reached via the logo) with a triple bounce;
  // every later trigger (the 10s loop, hover) and every other page just bounce once.
  playHint(isHomePage ? 3 : 1);
  setInterval(() => playHint(1), 5000);

  if (group) group.addEventListener('mouseenter', () => playHint(1));
});

document.querySelectorAll('.newsletter-form').forEach((form) => {
  const message = form.parentElement.querySelector('.newsletter-success');
  const emailInput = form.querySelector('input[type="email"]');
  const button = form.querySelector('button[type="submit"]');
  const texts = {
    subscribed: 'Je bent al ingeschreven voor onze nieuwsbrief. Bedankt voor je interesse!',
    pending: 'We hebben je al een bevestigingsmail gestuurd. Check je mailbox (ook je spam) om je inschrijving te bevestigen.',
    done: 'Bedankt! Je bent ingeschreven voor onze nieuwsbrief.',
  };

  function showMessage(text) {
    form.reset();
    form.hidden = true;
    if (message) {
      message.textContent = text;
      message.hidden = false;
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    button.disabled = true;

    // Ask our server whether this address is already on the list. If that
    // check fails for any reason, just sign up as before.
    let status = 'unknown';
    try {
      const data = new FormData();
      data.append('email', emailInput.value);
      const res = await fetch('/newsletter-check.php', { method: 'POST', body: data });
      status = (await res.json()).status;
    } catch (err) {
      status = 'unknown';
    }

    if (status === 'subscribed' || status === 'pending') {
      showMessage(texts[status]);
      button.disabled = false;
      return;
    }

    form.submit(); // the normal Mailchimp signup, posted into the hidden iframe
    setTimeout(() => {
      showMessage(texts.done);
      button.disabled = false;
    }, 600);
  });
});
