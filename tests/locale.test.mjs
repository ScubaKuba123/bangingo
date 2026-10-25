import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,existsSync} from 'node:fs';
import rules from '../locale-rules.js';
import {GET} from '../api/locale.mjs';
const root=new URL('../',import.meta.url);
test('Country selection for all ten languages and browser fallback',()=>{
 for(const [country,expected] of Object.entries({PL:'pl',GB:'en',DE:'de',FR:'fr',ES:'es',IT:'it',PT:'pt',BR:'pt',AE:'ar',JP:'ja',CN:'zh'}))assert.equal(rules.country(country,['en-US']),expected,country);
 assert.equal(rules.country('CH',['fr-CH']),'fr');
 assert.equal(rules.country('CA',['fr-CA']),'fr');
 assert.equal(rules.country('XX',['ja-JP']),'ja');
 assert.equal(rules.country(null,['nl','de-DE']),'de');
 assert.equal(rules.country(null,['nl']),'en');
});
test('Locale API has per-request country detection and no shared caching',async()=>{
 for(const code of ['PL','DE','JP']){
  const response=GET(new Request('https://example.test/api/locale',{headers:{'x-vercel-ip-country':code,'accept-language':'en-US,en;q=0.9'}}));
  assert.match(response.headers.get('cache-control'),/private.*no-store/);
  assert.equal(response.headers.get('vercel-cdn-cache-control'),'no-store');
  assert.deepEqual(await response.json(),{country:code,locale:rules.country(code,['en']),source:'country'});
 }
 const response=GET(new Request('https://example.test/api/locale',{headers:{'accept-language':'pt-BR,pt;q=0.9'}}));
 assert.deepEqual(await response.json(),{country:null,locale:'pt',source:'browser'});
});
function controller(saved){
 const storage=new Map(saved?[['bangingo-river-v2-language',saved]]:[]);let resolve;let calls=0;
 const context={BangingoLocaleRules:rules,navigator:{languages:['en-US']},document:{documentElement:{dataset:{}}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},fetch:()=>{calls++;return new Promise(r=>resolve=r);},AbortController,setTimeout,clearTimeout};context.window=context;
 vm.runInNewContext(readFileSync(new URL('locale-controller.js',root),'utf8'),context);
 return {context,storage,api:context.BangingoLanguage,get calls(){return calls;},respond:async(country)=>{resolve({ok:true,json:async()=>({country,locale:rules.country(country,['en']),source:'country'})});await new Promise(r=>setTimeout(r,0));}};
}
test('New visitor automatically changes from browser language to country',async()=>{
 const c=controller();assert.equal(c.api.current.locale,'en');await c.respond('PL');assert.equal(c.api.current.locale,'pl');assert.equal(c.api.current.mode,'auto');assert.equal(c.storage.size,0);
});
test('Manual choice wins over a delayed country response and persists',async()=>{
 const c=controller();c.api.choose('ja');await c.respond('PL');assert.equal(c.api.current.locale,'ja');assert.equal(c.api.current.source,'manual');assert.equal(c.storage.get('bangingo-river-v2-language'),'ja');
 c.api.choose('auto');assert.equal(c.api.current.locale,'pl');assert.equal(c.storage.size,0);await c.respond('DE');assert.equal(c.api.current.locale,'de');
});
test('Returning manual visitor is never overwritten by geolocation',()=>{
 const c=controller('zh');assert.equal(c.calls,0);assert.equal(c.api.current.locale,'zh');assert.equal(c.api.current.mode,'manual');
});
test('Every package has complete local copy and usable local images',()=>{
 const context={window:{}};
 for(const f of ['assets/photo-manifest.js','offers-data.js','offers-locales.js'])vm.runInNewContext(readFileSync(new URL(f,root),'utf8'),context);
 const {BANGINGO_OFFERS:data,BANGINGO_OFFER_UI:ui,VIP_PHOTOS:photos}=context.window;
 assert.equal(data.packages.length,7);assert.equal(data.languages.length,10);
 for(const lang of data.languages){assert.equal(Object.keys(ui[lang]).length,Object.keys(ui.en).length);for(const p of data.packages){const c=data.copy[lang][p.id];assert.equal(c.ideas.length,5);for(const key of ['title','tagline','intro','story'])assert.ok(c[key].trim().length>0,lang+' '+p.id+' '+key);}}
 for(const p of data.packages){assert.ok(existsSync(new URL('packages/'+p.id+'.html',root)));for(const variant of photos[p.image].variants)assert.ok(existsSync(new URL('assets/'+variant.file,root)));}
});
