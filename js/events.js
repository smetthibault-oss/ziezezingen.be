// The "Events bij externe partners" section is built and ready, but stays
// hidden everywhere (including once this lands on the live site) until this
// is flipped to true — say the word and it's a one-line change.
const SHOW_PARTNER_EVENTS = false;

// SEO: tell Google about each dated event (schema.org Event), so they can show
// up as rich results. Events without a fixed date (e.g. a recurring series)
// are left out — there's no single startDate to report for those.
function addEventStructuredData(upcoming) {
  const graph = upcoming
    .filter((ev) => ev.eventDate)
    .map((ev) => {
      const time = String(ev.date).match(/(\d{1,2}):(\d{2})/);
      const startDate = time ? `${ev.eventDate}T${time[1].padStart(2, '0')}:${time[2]}` : ev.eventDate;
      const event = {
        '@type': 'Event',
        name: ev.title,
        startDate,
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        location: { '@type': 'Place', name: ev.location, address: ev.location },
        image: [new URL(ev.image, location.origin).href],
        description: ev.description,
        organizer: { '@type': 'Organization', name: 'Zie Ze Zingen', url: 'https://ziezezingen.be/' },
      };
      // Only claim a price when we're sure it's free — we don't have real
      // ticket prices for the paid events, and a wrong price is worse than none.
      if (/gratis/i.test(ev.ctaText || '')) {
        event.offers = {
          '@type': 'Offer',
          url: ev.ctaUrl || ev.moreInfoUrl || 'https://ziezezingen.be/events.html',
          price: '0',
          priceCurrency: 'EUR',
          availability: ev.soldOut ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
        };
      }
      return event;
    });
  if (!graph.length) return;
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
  document.head.appendChild(script);
}

function buildEventCard(ev) {
  const article = document.createElement('article');
  article.className = 'event-card';

  const h2 = document.createElement('h2');
  h2.textContent = ev.title;
  article.appendChild(h2);

  if (ev.soldOut) {
    const wrap = document.createElement('div');
    wrap.className = 'event-photo-wrap';
    const img = document.createElement('img');
    img.src = ev.image;
    img.alt = ev.title;
    const stamp = document.createElement('img');
    stamp.src = 'assets/images/sold-out-stamp.png';
    stamp.alt = 'Sold out';
    stamp.className = 'sold-out-stamp';
    wrap.append(img, stamp);
    article.appendChild(wrap);
  } else {
    const img = document.createElement('img');
    img.src = ev.image;
    img.alt = ev.title;
    article.appendChild(img);
  }

  const when = document.createElement('p');
  when.className = 'event-when';
  when.append(document.createTextNode(ev.date), document.createElement('br'), document.createTextNode(ev.location));
  article.appendChild(when);

  const desc = document.createElement('p');
  desc.className = 'event-desc';
  desc.appendChild(document.createTextNode(ev.description));
  if (ev.moreInfoUrl) {
    desc.appendChild(document.createTextNode(' '));
    const moreInfo = document.createElement('a');
    moreInfo.href = ev.moreInfoUrl;
    moreInfo.target = '_blank';
    moreInfo.rel = 'noopener';
    moreInfo.textContent = t('eventsMoreInfo');
    desc.appendChild(moreInfo);
  }
  article.appendChild(desc);

  const links = document.createElement('p');
  links.className = 'event-links';
  if (ev.ctaUrl) {
    const a = document.createElement('a');
    a.href = ev.ctaUrl;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = ev.ctaText;
    links.appendChild(a);
  } else if (ev.ctaText) {
    const strong = document.createElement('strong');
    strong.textContent = ev.ctaText;
    links.appendChild(strong);
  }
  article.appendChild(links);

  return article;
}

async function renderEvents() {
  const ownGrid = document.querySelector('.events-grid[data-category="own"]');
  const partnerGrid = document.querySelector('.events-grid[data-category="partner"]');
  if (!ownGrid && !partnerGrid) return;

  try {
    // English pages (lang="en") get the English event text from en/events.json,
    // generated alongside events.json at deploy time.
    const res = await fetch((LANG === 'en' ? 'en/' : '') + 'events.json', { cache: 'no-store' });
    const { events } = await res.json();
    if (ownGrid) ownGrid.innerHTML = '';
    if (partnerGrid) partnerGrid.innerHTML = '';

    // Archive: an event with an eventDate (YYYY-MM-DD) disappears the day after
    // it took place. No eventDate (e.g. a recurring series) = always shown.
    const now = new Date();
    const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
    const upcoming = events.filter((ev) => !ev.eventDate || String(ev.eventDate).slice(0, 10) >= today);
    // Don't tell Google about events that aren't actually shown on the page yet.
    addEventStructuredData(SHOW_PARTNER_EVENTS ? upcoming : upcoming.filter((ev) => (ev.category || 'own') === 'own'));

    // "own" is the default category, so older entries without one still work.
    const own = upcoming.filter((ev) => (ev.category || 'own') === 'own');
    const partner = upcoming.filter((ev) => ev.category === 'partner');

    if (ownGrid) {
      if (own.length) {
        own.forEach((ev) => ownGrid.appendChild(buildEventCard(ev)));
      } else {
        const empty = document.createElement('p');
        empty.className = 'events-empty';
        empty.textContent = t('eventsEmpty');
        ownGrid.appendChild(empty);
      }
    }

    if (partnerGrid) {
      const section = partnerGrid.closest('section');
      if (SHOW_PARTNER_EVENTS) {
        partner.forEach((ev) => partnerGrid.appendChild(buildEventCard(ev)));
        // No "empty" message here on purpose: not every period has an
        // external booking, and the heading above already sets that expectation.
        section?.querySelectorAll('.events-list-subtitle, .events-list-intro')
          .forEach((el) => { el.hidden = !partner.length; });
        partnerGrid.hidden = !partner.length;
      } else {
        section?.querySelectorAll('.events-list-subtitle, .events-list-intro').forEach((el) => { el.hidden = true; });
        partnerGrid.hidden = true;
      }
    }
  } catch (err) {
    if (ownGrid) ownGrid.innerHTML = `<p>${t('eventsFailed')}</p>`;
  }
}

renderEvents();
