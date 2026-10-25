(() => {
  'use strict';
  const canvas = document.querySelector('#river-canvas');
  const ctx = canvas.getContext('2d', {alpha:true});
  if (!ctx) return;
  const real = document.body.dataset.river === 'river';
  const water = new Image(), yacht = new Image();
  let w=0,h=0,dpr=1,points=[],anchors=[],page=0,frame=0,last=0,phase=0,boatY=0,dirty=true;
  let isMobile=false,pattern=null;
  let palette=window.BANGINGO_PALETTES?.find(p=>p.id===document.documentElement.dataset.palette)||{water:'#067d87',foam:'#c9eee2',sand:'#dbcbb6',paper:'#f8f3eb'};
  let heading=0;
  const colorStops=[[0,[255,145,129]],[.025,[231,173,198]],[.13,[173,164,229]],[.31,[66,128,196]],[.48,[13,81,132]],[.65,[18,132,158]],[.83,[56,192,194]],[.975,[124,218,203]],[1,[250,133,123]]];
  function colorAt(t){let i=1;while(i<colorStops.length-1&&t>colorStops[i][0])i++;const a=colorStops[i-1],b=colorStops[i],u=(t-a[0])/(b[0]-a[0]);return `rgb(${a[1].map((c,k)=>Math.round(c+(b[1][k]-c)*u)).join(',')})`;}
  const bandColors=Array.from({length:58},(_,i)=>colorAt(i/57));
  const enabled=()=>!document.hidden;
  function add(y,x,width){anchors.push({y,x:x*w,width:width*w});}
  function size(){
    w=document.documentElement.clientWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,1.5);isMobile=w<=680;
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
    anchors=[];
    const sections=[...document.querySelectorAll('main>section')];
    for(const section of sections){
      const top=section.offsetTop, height=section.offsetHeight;
      if(section.id==='home'){
        if(isMobile){const start=section.querySelector('.photo-world').getBoundingClientRect().top+scrollY;add(0,1.16,.12);add(start-50,.97,.19);add(start+160,.83,.24);add(start+400,.20,.22);add(start+660,.82,.24);add(top+height,.75,.21);}
        else if(real){add(-100,1.12,.21);add(90,.89,.22);add(330,.57,.21);add(620,.64,.22);add(870,.44,.23);add(top+height,.32,.22);}
        else{add(-100,1.13,.14);add(145,.99,.15);add(310,.85,.15);add(540,.53,.17);add(780,.63,.17);add(top+height,.24,.18);}
      } else if(section.classList.contains('chapter')){
        if(isMobile){const photoTop=section.querySelector('.photo-world').getBoundingClientRect().top+scrollY;add(top+50,1.04,.16);add(photoTop,.82,.22);add(photoTop+200,.15,.22);add(photoTop+450,.56,.23);add(top+height,.84,.19);}
        else if(section.id==='after-dark'){add(top+160,.50,.18);add(top+460,.50,.19);add(top+680,.73,.18);add(top+height,.25,.18);}
        else{add(top+150,.57,.18);add(top+430,.51,.17);add(top+680,.67,.18);add(top+height,.40,.19);}
      } else {
        const x=section.id==='film'?.045:section.id==='programme'?.99:.99;
        add(top+150,isMobile?1.02:x,isMobile?.16:.09);add(top+height*.7,isMobile?.96:x,isMobile?.17:.095);add(top+height,isMobile?1.05:x,isMobile?.17:.10);
      }
    }
    anchors.sort((a,b)=>a.y-b.y);
    page=document.documentElement.scrollHeight;add(page+200,1.1,.12);
    points=[];
    // Horizontal cross-sections keep the banks continuous through tight turns.
    for(let y=-150;y<=page+200;y+=6)points.push({...at(y),y,nx:1,ny:0});
    dirty=true;wake();
  }
  function at(y){
    let i=0;while(i<anchors.length-2&&y>anchors[i+1].y)i++;
    const a=anchors[i],b=anchors[i+1];if(!a||!b)return{x:w*.7,width:w*.2};
    const span=b.y-a.y,t=Math.max(0,Math.min(1,(y-a.y)/span));
    const prev=anchors[Math.max(0,i-1)],next=anchors[Math.min(anchors.length-1,i+2)];
    const m0=(b.x-prev.x)/Math.max(1,b.y-prev.y),m1=(next.x-a.x)/Math.max(1,next.y-a.y);
    return {x:(2*t*t*t-3*t*t+1)*a.x+(t*t*t-2*t*t+t)*span*m0+(-2*t*t*t+3*t*t)*b.x+(t*t*t-t*t)*span*m1,width:a.width+(b.width-a.width)*(t*t*(3-2*t))};
  }
  function outline(visible,extra=0){
    const path=new Path2D();
    visible.forEach((p,i)=>{const offset=p.width/2+extra;const x=p.x+p.nx*offset,y=p.y+p.ny*offset-scrollY;i?path.lineTo(x,y):path.moveTo(x,y);});
    for(let i=visible.length-1;i>=0;i--){const p=visible[i],offset=p.width/2+extra;path.lineTo(p.x-p.nx*offset,p.y-p.ny*offset-scrollY);}
    path.closePath();return path;
  }
  function flowLine(visible,offset,color,width,dashes){
    ctx.beginPath();visible.forEach((p,i)=>{const shift=p.width*offset;const x=p.x+p.nx*shift,y=p.y+p.ny*shift-scrollY;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dashes||[]);ctx.lineDashOffset=-phase*18;ctx.stroke();ctx.setLineDash([]);
  }
  function render(){
    ctx.clearRect(0,0,w,h);const visible=points.filter(p=>p.y>scrollY-350&&p.y<scrollY+h+350);if(visible.length<2)return;
    ctx.lineJoin='round';ctx.lineCap='round';
    if(real){
      ctx.fillStyle=palette.sand;ctx.globalAlpha=.6;ctx.fill(outline(visible,7));ctx.globalAlpha=1;ctx.fillStyle=palette.paper;ctx.fill(outline(visible,4));
      const path=outline(visible);ctx.fillStyle=palette.water;ctx.fill(path);
      ctx.save();ctx.clip(path);
      if(pattern){pattern.setTransform(new DOMMatrix().translate(Math.sin(phase*.14)*9,-scrollY+phase*5).scale(.72));ctx.globalAlpha=.48;ctx.fillStyle=pattern;ctx.fillRect(0,0,w,h);ctx.globalAlpha=1;}
      const sheen=ctx.createLinearGradient(0,0,w,h);sheen.addColorStop(0,palette.foam+'55');sheen.addColorStop(.45,'#ffffff00');sheen.addColorStop(1,'#002a3938');ctx.fillStyle=sheen;ctx.fillRect(0,0,w,h);
      for(let i=0;i<28;i++){const y=scrollY+((i*97+phase*7)%(h+80))-40;const p=at(y),x=p.x+Math.sin(i*9.7)*p.width*.42;const alpha=.08+.10*(.5+.5*Math.sin(phase*.8+i));ctx.strokeStyle=`rgba(240,255,247,${alpha})`;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x-3,y-scrollY);ctx.quadraticCurveTo(x,y-scrollY-2,x+6,y-scrollY);ctx.stroke();}
      ctx.restore();
      flowLine(visible,.485,'#ffffff66',1);flowLine(visible,-.485,'#ffffff55',1);
      for(let i=0;i<5;i++)flowLine(visible,(i/4-.5)*.8,'#e3fff314',.7,[28+i*7,130+i*15]);
      const target=scrollY+h*(isMobile?.62:.48);
      if(!boatY||!enabled())boatY=target;else boatY+=(target-boatY)*.12;
      const pos=at(boatY),ahead=at(boatY+12),angle=Math.atan2(ahead.x-pos.x,12),len=isMobile?82:132,bw=len*(yacht.naturalWidth/Math.max(1,yacht.naturalHeight));
      heading=enabled()?heading+(angle-heading)*.18:angle;
      // Curved, fading wake stays inside the water and follows the channel.
      ctx.save();ctx.clip(path);
      const wakeTop=boatY-len*2-scrollY,wakeBottom=boatY-len*.35-scrollY;
      const wakeGradient=ctx.createLinearGradient(0,wakeTop,0,wakeBottom);wakeGradient.addColorStop(0,'#eefff900');wakeGradient.addColorStop(.65,'#eefff92a');wakeGradient.addColorStop(1,'#eefff99a');
      ctx.strokeStyle=wakeGradient;ctx.shadowColor='#d6fff975';ctx.shadowBlur=5;
      for(const side of [-1,0,1]){ctx.beginPath();for(let j=0;j<=40;j++){const t=j/40,yy=boatY-len*.35-t*len*1.65,p=at(yy),spread=bw*(.12+t*.85),sway=Math.sin(phase*1.4+t*8)*t*2;const x=p.x+spread*side+sway;j?ctx.lineTo(x,yy-scrollY):ctx.moveTo(x,yy-scrollY);}ctx.lineWidth=side?1.8:7;ctx.globalAlpha=side?.85:.33;ctx.stroke();}
      ctx.restore();
      ctx.save();ctx.translate(pos.x+Math.sin(phase*.9)*1.1,boatY-scrollY);ctx.rotate(-heading+Math.PI+Math.sin(phase*.65)*.012);
      if(yacht.complete&&yacht.naturalWidth){ctx.shadowColor='#00293688';ctx.shadowBlur=11;ctx.shadowOffsetX=4;ctx.shadowOffsetY=5;ctx.drawImage(yacht,-bw/2,-len/2,bw,len);}
      ctx.restore();canvas.dataset.position=Math.round(boatY);
    } else {
      for(let band=0;band<58;band++){
        const lo=band/58-.5,hi=(band+1.15)/58-.5,path=new Path2D();
        const offsetFor=p=>Math.sin(p.y*.004+phase*.28)*p.width*.014;
        visible.forEach((p,i)=>{const o=p.width*lo+offsetFor(p);const x=p.x+p.nx*o,y=p.y+p.ny*o-scrollY;i?path.lineTo(x,y):path.moveTo(x,y);});
        for(let i=visible.length-1;i>=0;i--){const p=visible[i],o=p.width*hi+offsetFor(p);path.lineTo(p.x+p.nx*o,p.y+p.ny*o-scrollY);}path.closePath();ctx.fillStyle=bandColors[band];ctx.fill(path);
      }
      for(let i=0;i<19;i++)flowLine(visible,(i/18-.5)*.95,i%3?'#e1f9fa16':'#ffffff45',.65,[100+i*17,90+i*9]);
      flowLine(visible,-.49,'#f6c4bb',1.2);flowLine(visible,.49,'#ef9a89',1.2);canvas.dataset.position=Math.round(scrollY);
    }
    canvas.dataset.variant=real?'river':'ribbon';
  }
  function tick(now){
    frame=0;
    if(dirty||now-last>=33){if(enabled())phase+=Math.min((now-last)/1000,.05);last=now;render();dirty=false;}
    if(enabled())frame=requestAnimationFrame(tick);
  }
  function wake(){dirty=true;if(document.hidden){render();return;}if(!frame)frame=requestAnimationFrame(tick);}
  water.onload=()=>{
    const crop=document.createElement('canvas');crop.width=750;crop.height=420;
    crop.getContext('2d').drawImage(water,0,water.naturalHeight-420,750,420,0,0,750,420);
    const tile=document.createElement('canvas'),tw=crop.width,th=crop.height;
    tile.width=tw*2;tile.height=th*2;const brush=tile.getContext('2d');
    brush.drawImage(crop,0,0);brush.save();brush.translate(tw*2,0);brush.scale(-1,1);brush.drawImage(crop,0,0);brush.restore();
    brush.save();brush.translate(0,th*2);brush.scale(1,-1);brush.drawImage(tile,0,0,tw*2,th,0,0,tw*2,th);brush.restore();
    pattern=ctx.createPattern(tile,'repeat');wake();
  };yacht.onload=wake;
  if(real){water.src='assets/river-water.webp';yacht.src='assets/river-yacht.webp';}
  addEventListener('scroll',wake,{passive:true});addEventListener('resize',size,{passive:true});
  new ResizeObserver(size).observe(document.querySelector('main'));
  if(document.body)new MutationObserver(wake).observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&frame){cancelAnimationFrame(frame);frame=0;}else wake();});
  addEventListener('bangingo:palette',e=>{palette=e.detail;wake();});
  document.fonts.ready.then(size);size();
})();
