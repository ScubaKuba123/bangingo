import rules from '../locale-rules.js';

export function GET(request) {
  const value = request.headers.get('x-vercel-ip-country') || '';
  const country = /^[A-Z]{2}$/.test(value) ? value : null;
  const languages = (request.headers.get('accept-language') || '').split(',');
  return Response.json({country, locale:rules.country(country,languages), source:country?'country':'browser'}, {
    headers:{'Cache-Control':'private, no-store, max-age=0','Vercel-CDN-Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
  });
}
