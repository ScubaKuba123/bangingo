(() => {
  'use strict';
  const text=value=>String(value??'').trim();
  const heading=(line,accent)=>`${text(line)}<br><em>${text(accent)}</em>`;
  const unexpected=value=>[text(value.line1),text(value.line2)].filter(Boolean).join('<br>')+`<br><em>${text(value.accent)}</em>`;
  window.BANGINGO_CMS_APPLIED=Promise.all([
    fetch('content/homepage.json',{cache:'no-store'}).then(response=>response.ok?response.json():Promise.reject(Error(response.status))),
    fetch('content/packages.json',{cache:'no-store'}).then(response=>response.ok?response.json():Promise.reject(Error(response.status)))
  ]).then(([home,packages])=>{
    for(const locale of ['pl','en']){
      const source=home[locale],dictionary=window.BANGINGO_LOCALES[locale],ui=window.BANGINGO_OFFER_UI[locale];
      Object.assign(dictionary,{
        heroTitle:`${text(source.hero.line1)}<br>${text(source.hero.line2)}<br><em>${text(source.hero.line3)}</em>`,heroSub:text(source.hero.description),explore:text(source.hero.primaryCta),signal:text(source.hero.secondaryCta),
        h1:heading(source.entrance.line1,source.entrance.accent),p1:text(source.entrance.description),next1:text(source.entrance.nextCta),
        h2:heading(source.afterDark.line1,source.afterDark.accent),p2:text(source.afterDark.description),next2:text(source.afterDark.nextCta),
        filmTitle:heading(source.sunset.line1,source.sunset.accent),filmText:text(source.sunset.description),play:text(source.sunset.playCta),
        h3:unexpected(source.unexpected),p3:text(source.unexpected.description),all:text(source.unexpected.nextCta),
        programmeTitle:heading(source.programme.line1,source.programme.accent),programmeText:text(source.programme.description),
        contactTitle:heading(source.contact.line1,source.contact.accent),contactText:text(source.contact.description)
      });
      Object.assign(ui,{heading:heading(source.packages.line1,source.packages.accent),lead:text(source.packages.description),read:text(source.packages.cardCta),formTitle:text(source.contact.formTitle),prepare:text(source.contact.submitCta)});
    }
    for(const item of packages)for(const locale of ['pl','en']){
      const target=window.BANGINGO_OFFERS.copy[locale]?.[item.id],source=item[locale];
      if(target&&source)Object.assign(target,{title:text(source.title),tagline:text(source.tagline),intro:text(source.intro),story:text(source.description)});
    }
    for(const locale of window.BANGINGO_OFFERS.languages)window.BANGINGO_LOCALES[locale].heroTitle=window.BANGINGO_LOCALES[locale].heroTitle||'Not your<br>ordinary<br><em>night.</em>';
    document.documentElement.dataset.cmsContent='ready';
  }).catch(error=>{
    for(const locale of window.BANGINGO_OFFERS.languages)window.BANGINGO_LOCALES[locale].heroTitle='Not your<br>ordinary<br><em>night.</em>';
    document.documentElement.dataset.cmsContent='fallback';
    console.warn('CMS text fallback is active.',error.message);
  });
})();
