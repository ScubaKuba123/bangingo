import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const homepage = read('index.html');
const locales = ['pl','en','de','fr','es','it','pt','ar','ja','zh'];
const localeContext = {window:{BANGINGO_LOCALES:Object.fromEntries(locales.map(lang=>[lang,{}]))}};
runInNewContext(read('offers-locales.js'), localeContext);

test('SEO copy in all ten user-visible languages', () => {
  const required = ['heroKicker','heroSub','seoTitle','seoDescription','heading','lead','step1Title','step1Text','step2Title','step2Text','step3Title','step3Text','contactTitle','contactText','packageSeoSuffix'];
  for(const lang of locales) for(const key of required) {
    const text = localeContext.window.BANGINGO_OFFER_UI[lang]?.[key];
    assert.equal(typeof text,'string',lang+'.'+key);
    assert.ok(text.length>5,lang+'.'+key);
  }
  assert.match(localeContext.window.BANGINGO_OFFER_UI.en.seoTitle,/Gdańsk/);
  assert.match(localeContext.window.BANGINGO_OFFER_UI.pl.seoDescription,/Gdyni/);
});

test('Homepage clarifies what is offered without breaking river markup', () => {
  assert.equal((homepage.match(/<h1\b/g)||[]).length,1);
  assert.match(homepage,/<ol class="service-steps">/);
  assert.equal((homepage.match(/class="service-steps-index"/g)||[]).length,3);
  assert.match(homepage,/river-atelier\.js/);
  assert.match(homepage,/id="river-canvas"/);
  assert.match(homepage,/<link rel="canonical" href="https:\/\/bangingo\.com\/"/);
  assert.match(homepage,/<meta name="description"/);
});

test('Each existing package retains descriptive title, unique description and canonical', () => {
  const ids=['business-trip','corporate-event','bachelor-weekend','ladies-paradise','party-animal','love-surprise','bromance'];
  const titles = new Set();
  for(const id of ids) {
    const html=read('packages/'+id+'.html');
    const title=html.match(/<title>([^<]+)<\/title>/)?.[1];
    const desc=html.match(/<meta name="description" content="([^"]+)"/)?.[1];
    assert.ok(title?.includes('BanginGo'),id+' title');
    assert.ok(desc?.length>65,id+' description');
    assert.match(html,new RegExp('href="https://bangingo\\.com/packages/'+id+'\\.html"'),id+' canonical');
    titles.add(title);
  }
  assert.equal(titles.size,ids.length);
});

test('Staging indexing protection remains until separate owner-approved release', () => {
  assert.match(homepage,/content="noindex, nofollow, noarchive"/);
  assert.match(read('robots.txt'),/Disallow: \/$/m);
});
