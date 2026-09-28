// Renders the video grid from videos.json, so adding or swapping a video is
// a plain data edit (no HTML/JS to touch) — same pattern as js/events.js.
async function renderVideos() {
  const grid = document.querySelector('.video-grid');
  if (!grid) return;

  try {
    // English pages (lang="en") get the English titles from en/videos.json,
    // generated alongside videos.json at deploy time.
    const res = await fetch((LANG === 'en' ? 'en/' : '') + 'videos.json', { cache: 'no-store' });
    const { videos } = await res.json();
    grid.innerHTML = '';

    videos.forEach((v) => {
      // A video with a youtubeId opens in the on-page modal; one with a plain
      // url (e.g. a YouTube playlist) just links out, like before.
      const el = document.createElement(v.youtubeId ? 'button' : 'a');
      el.className = 'video-card';
      if (v.youtubeId) {
        el.dataset.youtubeId = v.youtubeId;
      } else {
        el.href = v.url;
        el.target = '_blank';
        el.rel = 'noopener';
      }

      const img = document.createElement('img');
      img.src = v.image || `https://i.ytimg.com/vi/${v.youtubeId}/hq720.jpg`;
      img.alt = v.alt || v.title;
      img.loading = 'lazy';
      if (!v.image) {
        img.setAttribute('onerror', "this.onerror=null;this.src='https://i.ytimg.com/vi/" + v.youtubeId + "/hqdefault.jpg'");
      }
      el.appendChild(img);

      const label = document.createElement('span');
      label.className = 'video-card-title';
      label.appendChild(document.createTextNode(v.title));
      label.appendChild(document.createElement('br'));
      const small = document.createElement('small');
      small.textContent = v.subtitle;
      label.appendChild(small);
      el.appendChild(label);

      grid.appendChild(el);
    });
  } catch (err) {
    grid.innerHTML = `<p>${t('videosFailed')}</p>`;
  }
}

renderVideos();
