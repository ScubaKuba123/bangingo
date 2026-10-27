// Cloudflare Pages equivalent of the existing Vercel /api/locale endpoint.
// Preserve the site's browser fallback and explicitly chosen language.
import rules from '../../locale-rules.js';

export function onRequestGet({ request }) {
  const raw = request.cf?.country || request.headers.get('cf-ipcountry') || '';
  const normalized = String(raw).toUpperCase();
  const country = /^[A-Z]{2}$/.test(normalized) ? normalized : null;
  const languages = (request.headers.get('accept-language') || '').split(',');
  return Response.json(
    { country, locale: rules.country(country, languages), source: country ? 'country' : 'browser' },
    {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
