(() => {
  'use strict';
  const palettes = [
    ['coastal','Coastal Pearl','Perłowe tło, morska woda, czerwony akcent.','#f8f3eb','#fffaf5','#153e50','#4b6470','#ad3836','#067d87','#c9eee2','#dbcbb6'],
    ['riviera','Riviera Blue','Porcelanowa biel i intensywny błękit.','#edf4fb','#ffffff','#203952','#53657a','#a92f42','#176ca3','#b6e1f4','#c6d6e2'],
    ['rose','Champagne Rosé','Różowy szampan, burgund i błękit.','#faf0ef','#fff9f6','#4e3242','#775563','#9a2d49','#428b9a','#d4e9e5','#ead0c4'],
    ['sage','Baltic Sage','Szałwia, kamień i głęboki szmaragd.','#edf2e9','#f9fbf5','#273f38','#52675c','#a43c37','#2d7f75','#c1e4cb','#ced5bc'],
    ['coral','Coral Club','Słoneczna brzoskwinia i mocny turkus.','#fff0e5','#fff8f0','#194956','#526b72','#b53b29','#008f95','#c4f2da','#edc8ad'],
    ['lavender','Lavender Dusk','Lawendowa mgła i chłodna woda.','#f2eff9','#fcfaff','#3d3757','#665d7d','#8c3762','#507fa0','#d2e0f6','#d6c8e4'],
    ['azure','Azure Mint','Świeża mięta, atrament i morska zieleń.','#eaf7f3','#f8fffc','#19434a','#4b6a6b','#a73544','#007e81','#b9f0db','#c6ddd4'],
    ['terracotta','Terracotta Sunset','Piaskowy beż, cegła i śródziemnomorska zieleń.','#f6eddf','#fff8ed','#513d30','#74604e','#a33d2e','#3b8984','#d3e7cb','#d6bb96']
  ].map(([id,name,description,paper,surface,ocean,muted,clay,water,foam,sand],index)=>({id,name,description,paper,surface,ocean,muted,clay,water,foam,sand,index:index+1}));
  window.BANGINGO_PALETTES=palettes;
  const backgrounds=[
    {id:'paper',name:'Porcelain',description:'Czyste, spokojne tło w kolorze wybranej palety.',swatch:'#f8f3eb'},
    {id:'glow',name:'Golden glow',description:'Miękkie światło i ciepły, elegancki gradient.',swatch:'linear-gradient(135deg,#fffaf0,#edc8ad)'},
    {id:'linen',name:'Linen',description:'Delikatna faktura płótna, bez dodatkowych zdjęć.',swatch:'repeating-linear-gradient(0deg,#e5dacb 0 1px,#f8f2e9 1px 4px)'},
    {id:'lagoon',name:'Lagoon mist',description:'Jasna morska mgła i chłodne, turkusowe światło.',swatch:'linear-gradient(135deg,#fbf7ef,#bce2d8)'},
    {id:'aurora',name:'Pearl aurora',description:'Perłowe światło z miękką lawendą i odcieniem mięty.',swatch:'radial-gradient(ellipse at 10% 10%,#e2d5ee,transparent 70%),radial-gradient(ellipse at 95% 95%,#cce9e0,transparent 75%),#fcf8f3'},
    {id:'sunset',name:'Sunrise Rose',description:'Rozświetlony róż i brzoskwinia, jak pierwsze światło nad mariną.',swatch:'radial-gradient(ellipse at 90% 10%,#eec7cd,transparent 70%),radial-gradient(ellipse at 10% 90%,#f5d2ad,transparent 75%),#fff9f0'},
    {id:'dusk',name:'Blue hour',description:'Głęboki granat, śliwka i ciepłe akcenty po zmroku.',swatch:'linear-gradient(135deg,#112c3d,#392237)',dark:true},
    {id:'midnight',name:'Midnight',description:'Nocna marina. Ciemne tło i wyraźna, jasna typografia.',swatch:'#0a1821',dark:true}
  ].map((background,index)=>({...background,index:index+1}));
  window.BANGINGO_BACKGROUNDS=backgrounds;
  const defaults=document.documentElement.dataset;
  let paletteId='coastal',backgroundId=defaults.defaultBackground||'paper';
  const params=new URLSearchParams(location.search);
  if(!defaults.defaultBackground)try{backgroundId=localStorage.getItem('bangingo-background')||backgroundId;}catch{}
  backgroundId=params.get('background')||backgroundId;
  if(!backgrounds.some(b=>b.id===backgroundId))backgroundId='paper';
  document.documentElement.dataset.background=backgroundId;
  const mixHex=(a,b,t)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
  function apply(id, persist=true) {
    const p=palettes.find(p=>p.id===id)||palettes[0];
    paletteId=p.id;const dark=backgrounds.find(b=>b.id===backgroundId).dark;
    const theme=dark?{...p,paper:backgroundId==='dusk'?'#132432':'#0a1821',surface:'#1a303c',ocean:'#f5eee4',muted:'#c0d0d5',clay:p.sand}:{...p,muted:backgroundId==='glow'?mixHex(p.muted,p.ocean,.22):p.muted};
    document.documentElement.dataset.tone=dark?'dark':'light';
    for(const key of ['paper','surface','ocean','muted','clay','water','foam','sand'])document.documentElement.style.setProperty('--'+key,theme[key]);
    document.documentElement.style.setProperty('--palette-muted',theme.muted);
    document.documentElement.style.setProperty('--button-ink',dark?'#102631':'#ffffff');
    document.documentElement.dataset.palette=p.id;
    if(persist)try{localStorage.setItem('bangingo-palette',p.id);}catch{}
    window.dispatchEvent(new CustomEvent('bangingo:palette',{detail:p}));
    if(window.parent!==window)window.parent.postMessage({type:'bangingo:palette-ready',palette:p.id,background:backgroundId},location.origin);
    return p;
  }
  function background(id,persist=true){
    const mode=backgrounds.find(b=>b.id===id)||backgrounds[0];backgroundId=mode.id;document.documentElement.dataset.background=backgroundId;
    if(persist)try{localStorage.setItem('bangingo-background',backgroundId);}catch{}
    apply(paletteId,false);window.dispatchEvent(new CustomEvent('bangingo:background',{detail:mode}));return mode;
  }
  let saved=defaults.defaultPalette||'coastal';if(!defaults.defaultPalette)try{saved=localStorage.getItem('bangingo-palette')||saved;}catch{}
  apply(new URLSearchParams(location.search).get('palette')||saved,false);
  window.applyBangingoPalette=apply;
  window.applyBangingoBackground=background;
  addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.type==='bangingo:palette'&&palettes.some(p=>p.id===e.data.palette))apply(e.data.palette);});
  addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.type==='bangingo:background'&&backgrounds.some(b=>b.id===e.data.background))background(e.data.background);});
})();
