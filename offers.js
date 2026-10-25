(() => {
  'use strict';
  const catalogue=window.BANGINGO_OFFERS, language=window.BangingoLanguage;
  const $=s=>document.querySelector(s), all=s=>[...document.querySelectorAll(s)];
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const active=catalogue.packages.find(p=>p.id===document.body.dataset.package);
  let locale=language.current.locale;
  const ui=key=>window.BANGINGO_OFFER_UI[locale][key];
  const copy=id=>catalogue.copy[locale][id];
  function photo(p,eager=false){
    const asset=window.VIP_PHOTOS[p.image];
    return `<img src="assets/${p.image}-md.webp" srcset="${asset.variants.map(v=>'assets/'+v.file+' '+v.width+'w').join(', ')}" sizes="${active?'(max-width:760px) 100vw, 50vw':'(max-width:680px) 75vw, (max-width:1000px) 40vw, 27vw'}" width="${asset.dimensions[0]}" height="${asset.dimensions[1]}" loading="${eager?'eager':'lazy'}" decoding="async" alt="">`;
  }
  const mount=$('#enquiry');
  if(mount){
    mount.innerHTML=`<form class="enquiry-form"><h3 data-offer="formTitle"></h3><label class="form-wide"><span data-offer="package"></span><select name="package"></select></label><label class="form-wide"><span data-offer="email"></span><input name="email" type="email" autocomplete="email" dir="ltr" maxlength="254" required></label><label><span data-offer="date"></span><input name="date" type="date" required></label><label><span data-offer="guests"></span><input name="guests" type="number" min="1" max="999" inputmode="numeric" value="2" required></label><label class="form-wide"><span data-offer="city"></span><input name="city" autocomplete="address-level2" maxlength="100" required></label><label class="form-wide"><span data-offer="description"></span><textarea name="description" rows="4" maxlength="1500" required></textarea></label><button class="solid form-wide" type="submit" data-offer="prepare"></button><p class="enquiry-note form-wide" data-offer="privacy"></p><div class="draft-result form-wide" hidden><p role="status" data-offer="ready"></p><pre class="draft-preview"></pre><div class="draft-actions"><a class="solid draft-email" data-offer="emailAction"></a></div></div></form>`;
    const now=new Date();
    const min=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
    mount.querySelector('[name=date]').min=min;
    mount.querySelector('form').addEventListener('submit',event=>{event.preventDefault();draft();mount.querySelector('.draft-result').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'center'});});
    mount.querySelector('form').addEventListener('input',()=>{mount.querySelector('.draft-result').hidden=true;});
  }
  function draft(){
    const data=new FormData(mount.querySelector('form'));
    const packageName=data.get('package')?copy(data.get('package')).title:ui('tailored');
    const text=['BANGINGO — '+ui('subject'),...['package','email','date','city','guests','description'].map(key=>`${ui(key)}: ${key==='package'?packageName:data.get(key)}`)].join('\n\n');
    mount.querySelector('.draft-preview').textContent=text;
    mount.querySelector('.draft-email').href='mailto:contact@bangingo.com?subject='+encodeURIComponent(ui('subject')+' — '+packageName)+'&body='+encodeURIComponent(text);
    mount.querySelector('.draft-result').hidden=false;
  }
  function render(){
    document.documentElement.lang=locale;
    document.documentElement.dir=locale==='ar'?'rtl':'ltr';
    const grid=$('#packages-list');
    if(grid)grid.innerHTML=catalogue.packages.map((p,i)=>{const c=copy(p.id);return `<a class="trip-card" href="packages/${p.id}.html"><div class="trip-image">${photo(p)}<span class="trip-index">0${i+1}</span></div><div class="trip-copy"><h3>${escape(c.title)}</h3><p>${escape(c.tagline)}</p><span class="trip-link">${ui('read')} <b aria-hidden="true">↗</b></span></div></a>`;}).join('');
    if(active){
      const c=copy(active.id);
      all('[data-t]').forEach(node=>{node.innerHTML=window.BANGINGO_LOCALES[locale][node.dataset.t];});
      $('.language').dataset.code=locale.toUpperCase();
      $('#language').setAttribute('aria-label',window.BANGINGO_LOCALES[locale].language);
      document.title=c.title+' · '+ui('packageSeoSuffix');
      const pageDescription=$('meta[name="description"]');
      if(pageDescription)pageDescription.setAttribute('content',c.intro.length>166?c.intro.slice(0,163).trimEnd()+'…':c.intro);
      $('#package-title').textContent=c.title;
      $('#package-tagline').textContent=c.tagline;
      $('#package-intro').textContent=c.intro;
      $('#package-story').textContent=c.story;
      $('#package-ideas').innerHTML=c.ideas.map(idea=>`<li>${escape(idea)}</li>`).join('');
      if(!$('#package-photo').firstElementChild)$('#package-photo').innerHTML=photo(active,true);
    } else {
      document.title=ui('seoTitle');
      const metaDescription=$('meta[name="description"]');
      if(metaDescription)metaDescription.setAttribute('content',ui('seoDescription'));
      const ogTitle=$('meta[property="og:title"]'),ogDescription=$('meta[property="og:description"]');
      if(ogTitle)ogTitle.setAttribute('content',document.title);
      if(ogDescription)ogDescription.setAttribute('content',ui('seoDescription'));
    }
    all('[data-offer]').forEach(node=>{node.innerHTML=ui(node.dataset.offer);});
    if(mount){
      const select=mount.querySelector('[name=package]'),previous=select.value || (mount.dataset.ready?'':active?.id)||'';
      select.innerHTML=`<option value="">${ui('tailored')}</option>`+catalogue.packages.map(p=>`<option value="${p.id}">${escape(copy(p.id).title)}</option>`).join('');
      select.value=previous;mount.dataset.ready='true';
      if(!mount.querySelector('.draft-result').hidden)draft();
    }
  }
  if(document.body.classList.contains('package-page'))language.bind($('#language'));
  language.subscribe(state=>{locale=state.locale;render();});
})();
