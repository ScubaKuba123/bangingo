(() => {
  'use strict';
  const $=s=>document.querySelector(s),list=window.BANGINGO_PALETTES,params=new URLSearchParams(location.search);
  const versions={river:{file:'river',name:'01 · River'},classic:{file:'classic',name:'02 · Classic'},atelier:{file:'river-atelier',name:'03 · River Atelier'}};
  let version=Object.hasOwn(versions,params.get('version'))?params.get('version'):'atelier',id=document.documentElement.dataset.palette,backgroundId=document.documentElement.dataset.background,device='desktop';
  const iframe=$('#site-preview');
  addEventListener('message',e=>{if(e.origin===location.origin&&e.source===iframe.contentWindow&&e.data?.type==='bangingo:palette-ready'){iframe.dataset.appliedPalette=e.data.palette;iframe.dataset.appliedBackground=e.data.background;}});
  $('#palettes').innerHTML=list.map(p=>`<button class="palette-option" data-palette="${p.id}" aria-pressed="false"><span class="palette-swatches" aria-hidden="true"><i style="background:${p.paper}"></i><i style="background:${p.water}"></i><i style="background:${p.clay}"></i><i style="background:${p.ocean}"></i></span><span><b>${String(p.index).padStart(2,'0')}</b> ${p.name}</span><span class="palette-check" aria-hidden="true">✓</span></button>`).join('');
  $('#backgrounds').innerHTML=window.BANGINGO_BACKGROUNDS.map(b=>`<button class="background-option" data-background="${b.id}" aria-pressed="false"><i aria-hidden="true" style="background:${b.swatch}"><span class="background-number">${String(b.index).padStart(2,'0')}</span><span class="background-check">✓</span></i><span>${b.name}</span></button>`).join('');
  function urls(){const p=list.find(p=>p.id===id),b=window.BANGINGO_BACKGROUNDS.find(b=>b.id===backgroundId);const href=`${versions[version].file}.html?palette=${id}&background=${backgroundId}`;$('#open-preview').href=href;$('#choice-link').href=href;$('#palette-name').textContent=`${String(p.index).padStart(2,'0')} / ${p.name}`;$('#palette-description').textContent=p.description;$('#background-description').textContent=b.description;$('#selection-label').textContent=`${versions[version].name} / ${p.name} / ${b.name}`;history.replaceState(null,'',`?version=${version}&palette=${id}&background=${backgroundId}`);$('#copy-status').textContent='';}
  function background(next){backgroundId=next;window.applyBangingoBackground(next);document.querySelectorAll('.background-option').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.background===next)));iframe.contentWindow.postMessage({type:'bangingo:background',background:next},location.origin);urls();}
  function palette(next){id=next;window.applyBangingoPalette(id);document.querySelectorAll('.palette-option').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.palette===id)));iframe.contentWindow.postMessage({type:'bangingo:palette',palette:id},location.origin);urls();}
  function variant(next){version=next;document.querySelectorAll('[data-version]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.version===version)));iframe.src=`${versions[version].file}.html?palette=${id}&background=${backgroundId}`;urls();}
  function resize(){const sizes={desktop:[1440,1000],tablet:[820,1100],phone:[390,844]},[width,height]=sizes[device],space=$('#preview-space'),shell=$('#preview-shell'),scale=Math.min(1,space.clientWidth/width);iframe.style.width=width+'px';iframe.style.height=height+'px';iframe.style.transform=`scale(${scale})`;shell.style.width=width*scale+'px';shell.style.height=height*scale+'px';shell.dataset.device=device;}
  $('#palettes').addEventListener('click',e=>{const b=e.target.closest('[data-palette]');if(b)palette(b.dataset.palette);});
  $('#backgrounds').addEventListener('click',e=>{const b=e.target.closest('.background-option');if(b)background(b.dataset.background);});
  document.querySelectorAll('[data-version]').forEach(b=>b.addEventListener('click',()=>variant(b.dataset.version)));
  $('#device').addEventListener('change',e=>{device=e.target.value;resize();});
  iframe.addEventListener('load',()=>{iframe.contentWindow.postMessage({type:'bangingo:background',background:backgroundId},location.origin);iframe.contentWindow.postMessage({type:'bangingo:palette',palette:id},location.origin);});
  $('#copy-choice').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);$('#copy-status').textContent='Link skopiowany. Zawiera wybraną wersję, paletę i tło.';}catch{$('#copy-status').textContent='Skopiuj adres z paska przeglądarki — zawiera Twój wybór.';}});
  if(matchMedia('(max-width:700px)').matches){device='phone';$('#device').value='phone';}
  new ResizeObserver(resize).observe($('#preview-space'));palette(id);background(backgroundId);variant(version);resize();
})();

