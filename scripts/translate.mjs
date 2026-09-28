// Generates the English version of the site at deploy time, via the DeepL
// API. Run after the Dutch pages are finished (cache-busted, noindex/robots
// already sorted out) so the English copies inherit the same state.
//
// Nothing here is committed to the repo — like nieuwsbrief/, community/, ...
// this only exists in the deploy workspace and on the live server.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { parse } from 'node-html-parser';

const DEEPL_KEY = process.env.DEEPL_API_KEY;
if (!DEEPL_KEY) {
  console.log('DEEPL_API_KEY not set — skipping the English site (Dutch pages are unaffected).');
  process.exit(0);
}

const DEEPL_ENDPOINT = DEEPL_KEY.trim().endsWith(':fx')
  ? 'https://api-free.deepl.com/v2/translate'
  : 'https://api.deepl.com/v2/translate';

// One template per section, written with an "_" prefix — like the Dutch
// index.html/video.html/etc, these have no <base> tag of their own; the
// workflow wraps each into its real clean-URL directory afterwards (en/,
// en/community/, en/video/, en/events/, en/contact/, en/newsletter/),
// exactly like the Dutch nieuwsbrief/community/video/events/boekons copies.
const PAGES = [
  { src: 'index.html', out: 'en/_index.html' },
  { src: 'events.html', out: 'en/_events.html' },
  { src: 'video.html', out: 'en/_video.html' },
  { src: 'contact.html', out: 'en/_contact.html' },
];

// Dutch path -> English path, used to rewrite every internal link and to
// build the canonical/hreflang tags.
const PATH_MAP = {
  '/': '/en/',
  '/community': '/en/community',
  '/video': '/en/video',
  '/events': '/en/events',
  '/boekons': '/en/contact',
  '/nieuwsbrief': '/en/newsletter',
};

let callCount = 0;
let charCount = 0;

// DeepL translates the brand name inconsistently ("See Them Sing!", "Watch
// Them Sing!", left as-is, ...) depending on surrounding context. Swap it
// for a token it will leave alone, then swap the token back afterwards, so
// "Zie Ze Zingen" reads the same everywhere on the English site too.
const BRAND_TOKENS = [
  ['ZIE ZE ZINGEN', 'Zzzbrandallcaps'],
  ['Zie Ze Zingen', 'Zzzbrandtitlecase'],
];
const protectBrand = (s) => BRAND_TOKENS.reduce((acc, [real, token]) => acc.split(real).join(token), s);
const restoreBrand = (s) => BRAND_TOKENS.reduce((acc, [real, token]) => acc.split(token).join(real), s);

async function deeplBatch(texts, { html = false } = {}) {
  const nonEmpty = texts.map((t, i) => [i, t]).filter(([, t]) => t != null && String(t).trim() !== '');
  if (!nonEmpty.length) return texts.slice();

  const body = {
    text: nonEmpty.map(([, t]) => protectBrand(String(t))),
    source_lang: 'NL',
    target_lang: 'EN-US',
  };
  if (html) {
    body.tag_handling = 'html';
    body.ignore_tags = ['script', 'style'];
  }

  callCount += 1;
  charCount += body.text.reduce((n, s) => n + s.length, 0);

  const res = await fetch(DEEPL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${DEEPL_KEY.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`DeepL request failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  const translated = data.translations.map((t) => restoreBrand(t.text));

  const out = texts.slice();
  nonEmpty.forEach(([i], j) => { out[i] = translated[j]; });
  return out;
}

// --- translate one HTML page -----------------------------------------------

async function translatePage(srcPath, dutchPath) {
  const html = readFileSync(srcPath, 'utf8');
  const root = parse(html, { comment: true });

  // 1. <title>
  const titleEl = root.querySelector('title');
  const titleText = titleEl ? titleEl.text : '';

  // 2. meta content worth translating (not og:image/url, viewport, charset, ...)
  const metaEls = root.querySelectorAll(
    'meta[name="description"], meta[property="og:title"], meta[property="og:description"], ' +
    'meta[name="twitter:title"], meta[name="twitter:description"]'
  );
  const metaTexts = metaEls.map((el) => el.getAttribute('content') || '');

  // 3. attributes that hold visible/announced text
  const attrEls = root.querySelectorAll('[alt], [aria-label], [data-quote], [placeholder]');
  const attrJobs = [];
  attrEls.forEach((el) => {
    ['alt', 'aria-label', 'data-quote', 'placeholder'].forEach((attr) => {
      const val = el.getAttribute(attr);
      if (val) attrJobs.push({ el, attr, val });
    });
  });

  // 4. the JSON-LD block's "description" field (name/url/logo/sameAs stay put)
  const ldEl = root.querySelector('script[type="application/ld+json"]');
  let ld = null;
  if (ldEl) {
    try { ld = JSON.parse(ldEl.text); } catch { ld = null; }
  }

  const [translatedTitle, translatedMeta, translatedAttrs, translatedLdDesc] = await Promise.all([
    deeplBatch([titleText]).then((r) => r[0]),
    deeplBatch(metaTexts),
    deeplBatch(attrJobs.map((j) => j.val)),
    ld?.description ? deeplBatch([ld.description]).then((r) => r[0]) : Promise.resolve(null),
  ]);

  if (titleEl) titleEl.set_content(translatedTitle);
  metaEls.forEach((el, i) => el.setAttribute('content', translatedMeta[i]));
  attrJobs.forEach((job, i) => job.el.setAttribute(job.attr, translatedAttrs[i]));
  if (ld && translatedLdDesc) {
    ld.description = translatedLdDesc;
    ldEl.set_content(JSON.stringify(ld, null, 2));
  }

  // 5. the body: DeepL's HTML mode preserves every tag/attribute and only
  // translates the running text, so nav links, hrefs, classes etc. survive.
  const bodyEl = root.querySelector('body');
  const translatedBodyHtml = await deeplBatch([bodyEl.innerHTML], { html: true }).then((r) => r[0]);
  bodyEl.set_content(translatedBodyHtml);

  // 6. hrefs still point at the Dutch pages (DeepL doesn't touch attributes
  // in HTML mode) — rewrite them to their English equivalents.
  root.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (PATH_MAP[href]) a.setAttribute('href', PATH_MAP[href]);
  });

  // 7. language + canonical/og:url + hreflang alternates
  const htmlEl = root.querySelector('html');
  if (htmlEl) htmlEl.setAttribute('lang', 'en');

  const enPath = PATH_MAP[dutchPath] || dutchPath;
  const enUrl = `https://ziezezingen.be${enPath}`;
  root.querySelectorAll('link[rel="canonical"]').forEach((el) => el.setAttribute('href', enUrl));
  root.querySelectorAll('meta[property="og:url"]').forEach((el) => el.setAttribute('content', enUrl));
  // hreflang alternates are already in the Dutch source (same nl/en/x-default
  // URLs regardless of which language you're looking at) and copy over as-is.
  root.querySelectorAll('meta[property="og:locale"]').forEach((el) => el.setAttribute('content', 'en_US'));

  return root.toString();
}

// --- translate the JSON data files -----------------------------------------

async function translateEventsJson() {
  if (!existsSync('events.json')) return;
  const data = JSON.parse(readFileSync('events.json', 'utf8'));
  const fields = ['title', 'date', 'location', 'description', 'ctaText'];
  for (const ev of data.events) {
    const values = await deeplBatch(fields.map((f) => ev[f] ?? ''));
    fields.forEach((f, i) => { if (ev[f]) ev[f] = values[i]; });
  }
  mkdirSync('en', { recursive: true });
  writeFileSync('en/events.json', JSON.stringify(data, null, 2));
}

async function translateVideosJson() {
  if (!existsSync('videos.json')) return;
  const data = JSON.parse(readFileSync('videos.json', 'utf8'));
  const fields = ['title', 'subtitle', 'alt'];
  for (const v of data.videos) {
    const values = await deeplBatch(fields.map((f) => v[f] ?? ''));
    fields.forEach((f, i) => { if (v[f]) v[f] = values[i]; });
  }
  mkdirSync('en', { recursive: true });
  writeFileSync('en/videos.json', JSON.stringify(data, null, 2));
}

// --- run ---------------------------------------------------------------

const SRC_TO_DUTCH_PATH = {
  'index.html': '/',
  'events.html': '/events',
  'video.html': '/video',
  'contact.html': '/boekons',
};

mkdirSync('en', { recursive: true });

for (const { src, out } of PAGES) {
  const dutchPath = SRC_TO_DUTCH_PATH[src];
  const translated = await translatePage(src, dutchPath);
  writeFileSync(out, translated);
  console.log(`Translated ${src} -> ${out}`);
}

await translateEventsJson();
await translateVideosJson();

console.log(`DeepL: ${callCount} requests, ~${charCount} characters this run.`);
