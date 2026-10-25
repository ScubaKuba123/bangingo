import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/api/locale.js';
import rules from '../locale-rules.js';

function req(code, languages='en-US,en;q=0.8') {
  const request = new Request('https://bangingo.pages.dev/api/locale', { headers: { 'accept-language': languages } });
  if (code) Object.defineProperty(request, 'cf', { value: { country: code } });
  return request;
}

test('Cloudflare locale endpoint preserves country and browser fallback', async () => {
  for (const [code, expected] of Object.entries({ PL:'pl', DE:'de', JP:'ja', GB:'en' })) {
    const response = onRequestGet({ request: req(code) });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('cache-control'), /private.*no-store/);
    assert.deepEqual(await response.json(), { country:code, locale:expected, source:'country' });
  }
  const response = onRequestGet({ request: req(null, 'pt-BR,pt;q=0.9') });
  assert.deepEqual(await response.json(), { country:null, locale:'pt', source:'browser' });
  const responseFR = onRequestGet({ request: req('CA', 'fr-CA,fr;q=0.9') });
  assert.deepEqual(await responseFR.json(), { country:'CA', locale:rules.country('CA',['fr-CA','fr;q=0.9']), source:'country' });
});
