async function renderEvents() {
  const grid = document.querySelector('.events-grid');
  if (!grid) return;

  try {
    const res = await fetch('events.json');
    const events = await res.json();
    grid.innerHTML = '';

    events.forEach((ev) => {
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
      desc.textContent = ev.description;
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
