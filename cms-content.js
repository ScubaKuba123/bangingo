(() => {
  'use strict';
  // The CMS stores plain text, never trusted HTML. Markup is produced only here.
  const plain=value=>String(value??'').trim();
  const safe=value=>plain(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const heading=(line,accent)=>`${safe(line)}<br><em>${safe(accent)}</em>`;
  const unexpected=value=>`${safe(value.line1)}<br>${safe(value.line2)?safe(value.line2)+' ':''}<em>${safe(value.accent)}</em>`;
  const brandLastLine=value=>{
    const line=safe(value);
    return line.endsWith('.')?`${line.slice(0,-1)}<span class="brand-dot">.</span>`:line;
  };
  const brandTitle=value=>`${safe(value.line1)}<br>${safe(value.line2)}<br><em>${brandLastLine(value.line3)}</em>`;
  const originalBrand='Not your<br>ordinary<br><em>night<span class="brand-dot">.</span></em>';
  const lines=value=>safe(value).replace(/\r?\n/g,'<br>');

  window.BANGINGO_CMS_APPLIED=Promise.all([
    fetch('content/homepage.json',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(Error('homepage '+r.status))),
    fetch('content/packages.json',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(Error('packages '+r.status)))
  ]).then(([home,packages])=>{
    if(!Array.isArray(packages))throw Error('Invalid package content');
    for(const locale of ['pl','en']){
      const source=home?.[locale],dictionary=window.BANGINGO_LOCALES?.[locale],ui=window.BANGINGO_OFFER_UI?.[locale];
      if(!source||!dictionary||!ui||!source.hero||!source.contact)throw Error('Missing '+locale+' CMS content');
      Object.assign(dictionary,{
        heroTitle:brandTitle(source.hero),heroSub:safe(source.hero.description),explore:safe(source.hero.primaryCta),signal:safe(source.hero.secondaryCta),
        h1:heading(source.entrance.line1,source.entrance.accent),p1:safe(source.entrance.description),next1:safe(source.entrance.nextCta),
        h2:heading(source.afterDark.line1,source.afterDark.accent),p2:safe(source.afterDark.description),next2:safe(source.afterDark.nextCta),
        filmTitle:heading(source.sunset.line1,source.sunset.accent),filmText:lines(source.sunset.description),play:safe(source.sunset.playCta),
        h3:unexpected(source.unexpected),p3:safe(source.unexpected.description),all:safe(source.unexpected.nextCta),
        programmeTitle:heading(source.programme.line1,source.programme.accent),programmeText:lines(source.programme.description),
        contactTitle:heading(source.contact.line1,source.contact.accent),contactText:safe(source.contact.description)
      });
      Object.assign(ui,{
        heading:heading(source.packages.line1,source.packages.accent),lead:safe(source.packages.description),read:safe(source.packages.cardCta),
        formTitle:safe(source.contact.formTitle),prepare:safe(source.contact.submitCta)
      });
    }
    const known=new Set(window.BANGINGO_OFFERS.packages.map(p=>p.id));
    const ids=new Set();
    for(const item of packages){
      if(!known.has(item.id)||ids.has(item.id))throw Error('Invalid or duplicate package ID');
      ids.add(item.id);
      for(const locale of ['pl','en']){
        const target=window.BANGINGO_OFFERS.copy[locale]?.[item.id],source=item[locale];
        if(!target||!source)throw Error('Incomplete package: '+item.id+'/'+locale);
        Object.assign(target,{title:plain(source.title),tagline:plain(source.tagline),intro:plain(source.intro),story:plain(source.description)});
      }
    }
    if(ids.size!==known.size)throw Error('Package count mismatch');
    for(const locale of window.BANGINGO_OFFERS.languages)window.BANGINGO_LOCALES[locale].heroTitle ||= originalBrand;
    document.documentElement.dataset.cmsContent='ready';
  }).catch(error=>{
    for(const locale of window.BANGINGO_OFFERS.languages)window.BANGINGO_LOCALES[locale].heroTitle ||= originalBrand;
    document.documentElement.dataset.cmsContent='fallback';
    console.warn('CMS text fallback is active.',error.message);
  });
})();
