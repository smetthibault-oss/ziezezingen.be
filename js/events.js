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

async function renderEvents() {
  const grid = document.querySelector('.events-grid');
  if (!grid) return;

  try {
    const res = await fetch('events.json', { cache: 'no-store' });
    const { events } = await res.json();
    grid.innerHTML = '';

    // Archive: an event with an eventDate (YYYY-MM-DD) disappears the day after
    // it took place. No eventDate (e.g. a recurring series) = always shown.
    const now = new Date();
    const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
    const upcoming = events.filter((ev) => !ev.eventDate || String(ev.eventDate).slice(0, 10) >= today);
    addEventStructuredData(upcoming);

    if (!upcoming.length) {
      const empty = document.createElement('p');
      empty.className = 'events-empty';
      empty.textContent = 'Momenteel staan er geen events gepland. Kom snel terug!';
      grid.appendChild(empty);
      return;
    }

    upcoming.forEach((ev) => {
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
        moreInfo.textContent = 'Meer info';
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

      grid.appendChild(article);
    });
  } catch (err) {
    grid.innerHTML = '<p>De events konden niet geladen worden.</p>';
  }
}

renderEvents();
