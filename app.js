(() => {
  'use strict';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const items=window.VIP_PROGRAMME, photos=window.VIP_PHOTOS, dictionaries=window.BANGINGO_LOCALES;
  const byId=new Map(items.map(x=>[x.id,x]));
  const arrow='<svg aria-hidden="true"><use href="#arrow"/></svg>';
  const selectionKey='bangingo-river-v2-selection';
  const reduce=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width:680px)');
  let locale=window.BangingoLanguage.current.locale, selected=new Set(), activeId, lastFocus, timer, motionPreference=null;
  try {
    const raw=JSON.parse(localStorage.getItem(selectionKey)||'[]');
    if(Array.isArray(raw))selected=new Set(raw.map(id=>id==='burlesque-show'?'event-hosts':id).filter(id=>byId.has(id)));
    motionPreference=localStorage.getItem('bangingo-river-v2-motion');
  } catch {}
  // The portfolio cover has its own play/pause control; keep saved visitor choices intact.
  if(window.self!==window.top&&new URLSearchParams(location.search).get('preview')==='portfolio'){
    selected=new Set();motionPreference=null;
    document.documentElement.classList.add('portfolio-cover');
  }
  if(!dictionaries[locale])locale='pl';
  let motion=motionPreference===null?!reduce.matches:motionPreference==='true';
  const t=key=>dictionaries[locale][key];
  const itemCopy=id=>({...byId.get(id),...window.BANGINGO_ITEMS[locale][id]});
  const textOnly=html=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  const experience=$('#experience'),collection=$('#collection'),video=$('#sunset-film');
  function imageMarkup(image,hero=false,index=0){
    if(image==='sunset')return '<img src="assets/sunset-poster-800.webp" srcset="assets/sunset-poster-800.webp 800w, assets/sunset-poster-1920.webp 1920w" sizes="(max-width:680px) 48vw, 35vw" width="1920" height="1080" alt="Sunset on a yacht" lang="en" decoding="async">';
    const photo=photos[image],variants=photo.variants;
    return `<img src="assets/${image}-md.webp" srcset="${variants.map(v=>'assets/'+v.file+' '+v.width+'w').join(', ')}" sizes="(max-width:680px) ${hero?'75':'90'}vw, 36vw" width="${photo.dimensions[0]}" height="${photo.dimensions[1]}" alt="${photo.alt}" lang="en" ${hero?'':'loading="lazy"'} ${hero&&index===0?'fetchpriority="high"':''} decoding="async">`;
  }
  const scenes={intro:[['private-party','yacht-energy'],['vip-club','night-women'],['city-tour','gdansk']],golden:[['private-party'],['vip-transfer'],['polish-dinner']],dark:[['event-hosts'],['vip-club'],['vodka-tasting']],beyond:[['balloon-flight'],['offroad-adventure'],['supercar-track']]};
  $$('[data-scene]').forEach(world=>scenes[world.dataset.scene].forEach(([id,image],index)=>{
    const button=document.createElement('button');button.type='button';button.className='photo';button.dataset.id=id;
    button.dataset.depth=[1,.65,1.3,.8][index];button.dataset.angle=[-3,2,-2][index];
    button.innerHTML=`<span class="photo-inner">${imageMarkup(image||byId.get(id).image,world.dataset.scene==='intro',index)}<span class="caption"><span><small></small><strong></strong></span>${arrow}</span></span><span class="added"></span>`;
    button.addEventListener('click',()=>id==='film'?goTo('film'):openExperience(id));world.append(button);
  }));
  function goTo(id){location.hash=id;$('#'+id).scrollIntoView({behavior:motion?'smooth':'instant'});}
  function persist(){try{localStorage.setItem(selectionKey,JSON.stringify([...selected]));}catch{}}
  function toast(message){const el=$('.toast');el.textContent=message;el.classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>el.classList.remove('visible'),3000);}
  function renderCatalogue(){
    const list=$('#programme-list');list.replaceChildren();
    ['arrival','dark','beyond'].forEach(group=>{
      const section=document.createElement('section');section.className='programme-group';const heading=document.createElement('h3');heading.textContent=t(group);section.append(heading);
      items.filter(x=>x.group===group).forEach(base=>{const x=itemCopy(base.id),button=document.createElement('button');button.type='button';button.className='programme-item';button.dataset.id=x.id;button.innerHTML=`<span><strong>${x.category}</strong><small>${x.title}</small></span>${arrow}`;button.addEventListener('click',()=>openExperience(x.id));section.append(button);});list.append(section);
    });
  }
  function open(dialog){lastFocus=document.activeElement;dialog.showModal();document.body.style.overflow='hidden';dialog.querySelector('.close').focus();video.pause();}
  function fillExperience(id){
    activeId=id;const item=itemCopy(id),photo=photos[item.image],img=experience.querySelector('.detail-image');
    experience.classList.toggle('text-detail',!photo);img.hidden=!photo;
    if(photo){img.src=`assets/${item.image}-md.webp`;img.srcset=photo.variants.map(v=>'assets/'+v.file+' '+v.width+'w').join(', ');img.sizes='(max-width:680px) 92vw, 470px';img.alt=photo.alt;img.lang='en';}else{img.removeAttribute('src');img.removeAttribute('srcset');img.alt='';}
    $('#experience-title').textContent=item.title;$('.detail-category').textContent=item.category;$('.detail-description').textContent=item.text;
    const list=$('.detail-inclusions');list.replaceChildren();[t('detail1'),t('detail2')].forEach(line=>{const li=document.createElement('li');li.textContent=line;list.append(li);});
    updateSelection();
  }
  function openExperience(id){fillExperience(id);open(experience);}
  $('#save-experience').addEventListener('click',()=>{if(selected.has(activeId)){selected.delete(activeId);toast(t('removed'));}else{selected.add(activeId);toast(t('added'));}persist();updateSelection();});
  function renderCollection(){
    const list=$('#selected-list');list.replaceChildren();
    if(!selected.size){const p=document.createElement('p');p.className='empty';p.textContent=t('empty');list.append(p);}
    [...selected].forEach((id,index)=>{const item=itemCopy(id),row=document.createElement('div');row.className='selected-item';row.innerHTML=`${item.image?`<img src="assets/${item.image}-sm.webp" alt="" width="90" height="75" loading="lazy">`:`<span class="selection-index" aria-hidden="true">${String(index+1).padStart(2,'0')}</span>`}<div><h3>${item.title}</h3><p>${item.category}</p></div><button class="remove" aria-label="${t('remove')}: ${item.title}">${t('remove')}</button>`;row.querySelector('button').addEventListener('click',()=>{selected.delete(id);persist();updateSelection();renderCollection();toast(t('removed'));collection.querySelector('.close').focus();});list.append(row);});
    $('#download').disabled=!selected.size;
  }
  $$('.your-night').forEach(button=>button.addEventListener('click',()=>{renderCollection();open(collection);}));
  [experience,collection].forEach(dialog=>{
    dialog.querySelector('.close').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
    dialog.addEventListener('close',()=>{document.body.style.overflow='';lastFocus?.focus({preventScroll:true});});
  });
  $('#collection-contact').addEventListener('click',()=>{collection.close();goTo('contact');});
  $('#download').addEventListener('click',()=>{
    const lines=['BANGINGO — NOT YOUR ORDINARY NIGHT','GDAŃSK · SOPOT · GDYNIA','',...[...selected].map((id,i)=>{const x=itemCopy(id);return `${i+1}. ${x.category} — ${x.title}\n${x.text}`;}),'',t('availability'),t('localNote'),'','+48 501 147 124','contact@bangingo.com'];
    const url=URL.createObjectURL(new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='BANGINGO-MY-NIGHT.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);toast(t('saved'));
  });
  function message(){const mood=['class','chaos','surprise'].indexOf($('input[name=mood]:checked').value);return [t('messageHello'),'Gdańsk · Sopot · Gdynia',`${t('messageMood')}: ${t('mood'+mood)}`,`${t('messageGuests')}: ${$('#guests').value}`,`${t('selectedLabel')}: ${[...selected].map(id=>itemCopy(id).category).join(', ')||t('mood2')}`,t('messageEnd')].join('\n');}
  function updateContact(){
    $('#signal-selection').textContent=selected.size?[...selected].map(id=>itemCopy(id).category).join(' · '):t('empty');
    const draft=encodeURIComponent(message());$('#signal-whatsapp').href='https://wa.me/48501147124?text='+draft;$('.quick-whatsapp').href=$('#signal-whatsapp').href;
    $('#signal-email').href='mailto:contact@bangingo.com?subject='+encodeURIComponent('Bangingo — '+t('yourNight'))+'&body='+draft;
  }
  $$('input[name=mood]').forEach(input=>input.addEventListener('change',updateContact));$('#guests').addEventListener('change',updateContact);
  let generated=new Set();
  $('#surprise').addEventListener('click',()=>{
    for(const id of generated)selected.delete(id);generated=new Set();
    const mood=$('input[name=mood]:checked').value;
    const pools=mood==='class'?[['tasting-menu','polish-dinner','private-party'],['vip-club','event-hosts'],['city-tour','balloon-flight']]:mood==='chaos'?[['private-party','vip-transfer'],['vip-club','event-hosts'],['axe-throwing','private-karting','speed-paintball','offroad-adventure']]:[['polish-dinner','tasting-menu','private-party'],['vip-club','vodka-tasting','event-hosts'],['balloon-flight','indoor-skydiving','supercar-track','offroad-adventure']];
    pools.forEach(pool=>{const available=pool.filter(id=>!selected.has(id));if(available.length){const id=available[Math.floor(Math.random()*available.length)];selected.add(id);generated.add(id);}});
    persist();updateSelection();toast(t('surprised'));
  });
  function updateSelection(){
    $$('.count').forEach(el=>el.textContent=selected.size);
    $$('.photo').forEach(el=>el.querySelector('.added').textContent=selected.has(el.dataset.id)?'✓ '+t('added'):'');
    if(activeId)$('#save-experience').innerHTML=(selected.has(activeId)?t('remove'):t('add'))+arrow;
    updateContact();
  }
  const filmButton=$('#play-film');
  video.src=mobile.matches||navigator.connection?.saveData?'assets/sunset-yacht-720.mp4':'assets/sunset-yacht-1080.mp4';
  video.poster=mobile.matches?'assets/sunset-poster-800.webp':'assets/sunset-poster-1920.webp';
  filmButton.addEventListener('click',async()=>{try{if(video.paused){await video.play();$('#film-error').hidden=true;}else video.pause();}catch{$('#film-error').hidden=false;$('#film-error').textContent=t('videoError');}});
  function filmState(){filmButton.classList.toggle('playing',!video.paused);filmButton.querySelector('[data-t]').textContent=t(video.paused?'play':'pause');filmButton.setAttribute('aria-label',t(video.paused?'play':'pause'));}
  video.addEventListener('play',filmState);video.addEventListener('pause',filmState);video.addEventListener('error',()=>{$('#film-error').hidden=false;$('#film-error').textContent=t('videoError');});
  new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)video.pause();},{threshold:.08}).observe(video);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});
  const worlds=$$('.world');let px=0,py=0,scheduled=false;
  function paint(){scheduled=false;const height=innerHeight,max=document.documentElement.scrollHeight-height;document.documentElement.style.setProperty('--progress',max?scrollY/max:0);
    for(const world of worlds){const r=world.getBoundingClientRect();if(r.top>height*1.5||r.bottom<-height*.5)continue;const progress=Math.min(1,Math.max(0,-r.top/Math.max(1,r.height-height)));
      world.querySelectorAll('.photo').forEach((photo,i)=>{const depth=+photo.dataset.depth,angle=+photo.dataset.angle,factor=motion&&!mobile.matches?1:0;photo.style.setProperty('--tx',`${factor*((i===0?-1:1)*progress*8*depth+px*depth*9)}px`);photo.style.setProperty('--ty',`${factor*(-progress*12*depth+py*depth*6)}px`);photo.style.setProperty('--scale',1+factor*progress*.015);photo.style.setProperty('--rotate',`${mobile.matches&&!world.classList.contains('intro')?0:angle+factor*progress*(i%2?2:-2)}deg`);});
    }
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(paint);}}
  function motionLabel(){$('#motion').setAttribute('aria-pressed',String(motion));$('#motion').innerHTML=t(motion?'motionOn':'motionOff')+' <span class="toggle"></span>';}
  function setMotion(){document.body.classList.toggle('still',!motion);motionLabel();schedule();}
  $('#motion').addEventListener('click',()=>{motion=!motion;motionPreference=String(motion);try{localStorage.setItem('bangingo-river-v2-motion',motionPreference);}catch{}setMotion();});
  reduce.addEventListener('change',()=>{if(motionPreference===null){motion=!reduce.matches;setMotion();}});
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);addEventListener('pointermove',event=>{if(!motion||mobile.matches||event.pointerType==='touch')return;px=(event.clientX/innerWidth-.5)*2;py=(event.clientY/innerHeight-.5)*2;schedule();},{passive:true});
  function translate(){
    document.documentElement.lang=locale;document.documentElement.dir=locale==='ar'?'rtl':'ltr';$('#language').value=window.BangingoLanguage.current.mode==='auto'?'auto':locale;$('.language').dataset.code=locale.toUpperCase();
    $$('[data-t]').forEach(el=>el.innerHTML=t(el.dataset.t));$$('[data-label]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.label)));
    $$('.photo').forEach(el=>{const id=el.dataset.id,isFilm=id==='film',x=isFilm?{category:t('filmNav'),title:t('play')}:itemCopy(id);el.querySelector('small').textContent=x.category;el.querySelector('strong').textContent=x.title;el.setAttribute('aria-label',x.category+' — '+x.title);});
    $('.header .your-night').setAttribute('aria-label',t('yourNight'));$('#language').setAttribute('aria-label',t('language'));video.setAttribute('aria-label',textOnly(t('filmTitle')));
    renderCatalogue();updateSelection();motionLabel();filmState();if(collection.open)renderCollection();if(experience.open)fillExperience(activeId);schedule();
  }
  window.BangingoLanguage.bind($('#language'));
  window.BangingoLanguage.subscribe(state=>{locale=state.locale;translate();});
  setMotion();
})();
