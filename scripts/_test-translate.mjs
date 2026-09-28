// Local-only smoke test: mocks the DeepL API so we can check the HTML/JSON
// manipulation logic without spending real API calls. Not used in CI.
process.env.DEEPL_API_KEY = 'test-key:fx';

const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const body = JSON.parse(opts.body);
  const translations = body.text.map((t) => ({ text: '[EN] ' + t }));
  return {
    ok: true,
    json: async () => ({ translations }),
    text: async () => 'mock',
  };
};

await import('./translate.mjs');
globalThis.fetch = realFetch;
