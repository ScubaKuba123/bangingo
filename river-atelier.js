(() => {
  'use strict';
  const canvas=document.querySelector('#river-canvas'),ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)return;
  const water=new Image(),boat=new Image(),foam=new Image();
  const BOAT_LENGTH=124,ROUTE_STEP=4,ROUTE_START=-500;
  const yachtCanvas=document.createElement('canvas');
  yachtCanvas.id='yacht-canvas';yachtCanvas.setAttribute('aria-hidden','true');canvas.after(yachtCanvas);
  const yachtContext=yachtCanvas.getContext('2d',{alpha:true});
  let width=0,height=0,dpr=1,mobile=false,anchors=[],route=[],mobileScenes=[],texture=null,flowLayers=[],textureScale=.65,phase=0,boatY=0,heading=0,frame=0,last=0,dirty=true;
  const portfolioPreview=window.self!==window.top&&new URLSearchParams(location.search).get('preview')==='portfolio';
  let previewPlaying=false,previewReady=false;
  const moving=()=>!document.hidden&&(!portfolioPreview||previewPlaying);
  if(portfolioPreview)addEventListener('message',event=>{
    if(event.source!==parent||event.data?.type!=='bangingo:preview-motion'||typeof event.data.playing!=='boolean')return;
    previewPlaying=event.data.playing;wake();
    parent.postMessage({type:'bangingo:preview-state',playing:previewPlaying,phase},event.origin);
  });
  const grain=i=>{const v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  function rawAt(y){let i=0;while(i<anchors.length-2&&y>anchors[i+1].y)i++;const a=anchors[i],b=anchors[i+1];if(!a||!b)return{x:width*.6,width:width*.3};const prev=anchors[Math.max(0,i-1)],next=anchors[Math.min(anchors.length-1,i+2)],span=Math.max(1,b.y-a.y),t=Math.min(1,Math.max(0,(y-a.y)/span)),m0=(b.x-prev.x)/Math.max(1,b.y-prev.y),m1=(next.x-a.x)/Math.max(1,next.y-a.y);return{x:(2*t*t*t-3*t*t+1)*a.x+(t*t*t-2*t*t+t)*span*m0+(-2*t*t*t+3*t*t)*b.x+(t*t*t-t*t)*span*m1,width:a.width+(b.width-a.width)*t*t*(3-2*t)};}
  function at(y){const index=Math.max(0,Math.min(route.length-2,(y-ROUTE_START)/ROUTE_STEP)),i=Math.floor(index),t=index-i,a=route[i],b=route[i+1];if(!a||!b)return{...rawAt(y),distance:y};return{x:a.x+(b.x-a.x)*t,width:a.width+(b.width-a.width)*t,distance:a.distance+(b.distance-a.distance)*t};}
  function add(y,x,w){anchors.push({y,x:x*width,width:w*width});}
  function mobileAt(y){
    const right=width-53,scene=mobileScenes.find(points=>y>=points[0].y&&y<=points.at(-1).y);
    let x=right;
    if(scene){
      let i=0;while(i<scene.length-2&&y>scene[i+1].y)i++;
      const a=scene[i],b=scene[i+1],t=Math.max(0,Math.min(1,(y-a.y)/(b.y-a.y)));
      // Flat tangents at the banks; each crossing happens in the gap between photos.
      x=a.x+(b.x-a.x)*t*t*(3-2*t);
    }
    return{x:x+7*Math.sin(y/151+.6)+5*Math.sin(y/277),width:78+4*Math.sin(y/217+.8)};
  }
  function resize(){
    width=document.documentElement.clientWidth;height=innerHeight;mobile=width<=680;dpr=Math.min(devicePixelRatio||1,mobile?1.5:1.35);canvas.width=yachtCanvas.width=Math.round(width*dpr);canvas.height=yachtCanvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);yachtContext.setTransform(dpr,0,0,dpr,0,0);anchors=[];
    mobileScenes=[];
    if(mobile)for(const world of document.querySelectorAll('.world')){
      const photos=[...world.querySelectorAll('.photo')];if(!photos.length)continue;
      const points=[];
      photos.forEach((photo,i)=>{
        const r=photo.getBoundingClientRect(),top=r.top+scrollY,bottom=r.bottom+scrollY,x=i%2?53:width-53;
        if(!i)points.push({y:top-120,x});
        points.push({y:top+30,x},{y:bottom-30,x});
        if(i===photos.length-1)points.push({y:bottom+120,x:width-53});
      });
      mobileScenes.push(points);
    }
    for(const section of document.querySelectorAll('main>section')){const y=section.offsetTop,h=section.offsetHeight;
      if(section.id==='home'){
        if(mobile){const start=section.querySelector('.photo-world').getBoundingClientRect().top+scrollY;add(-100,1.25,.34);add(start-140,1.08,.34);add(start+130,.84,.40);add(start+440,.22,.40);add(start+740,.83,.42);add(y+h,.72,.33);}
        else{add(-350,.91,.22);add(60,.84,.22);add(270,.65,.23);add(450,.56,.23);add(660,.63,.22);add(890,.47,.25);add(y+h,.38,.24);}
      }else if(section.classList.contains('chapter')){
        if(mobile){const start=section.querySelector('.photo-world').getBoundingClientRect().top+scrollY;add(y+80,1.13,.26);add(start,.89,.38);add(start+270,.15,.38);add(start+540,.54,.40);add(y+h,.87,.29);}
        else if(section.id==='after-dark'){add(y+100,.46,.20);add(y+360,.49,.21);add(y+610,.44,.22);add(y+850,.52,.23);add(y+h,.68,.21);}
        else{add(y+100,.63,.22);add(y+330,.55,.22);add(y+560,.48,.22);add(y+800,.52,.23);add(y+h,.69,.21);}
      }else{const x=(width-34)/width;add(y+130,x,.13);add(y+h*.7,x,.13);add(y+h,x,.13);}
    }
    anchors.sort((a,b)=>a.y-b.y);add(document.documentElement.scrollHeight+500,(width-34)/width,.13);route=[];
    // Smooth the centreline over a physical distance, including section joins.
    // Arc length keeps the current's speed consistent through curves.
    const sigma=mobile?60:75;
    for(let y=ROUTE_START;y<document.documentElement.scrollHeight+600;y+=ROUTE_STEP){let x=0,w=0,total=0;for(let k=-6;k<=6;k++){const weight=Math.exp(-.5*(k/2)**2),p=rawAt(y+k*sigma/2);x+=p.x*weight;w+=p.width*weight;total+=weight;}x/=total;w/=total;
      // Mobile photography alternates banks. Text sections retain a clear side channel.
      if(mobile){const p=mobileAt(y);x=p.x;w=p.width;}
      x=Math.max(34,Math.min(width-26,x));
      const prev=route.at(-1);route.push({y,x,width:w,distance:prev?prev.distance+Math.hypot(x-prev.x,ROUTE_STEP):0});}
    textureScale=mobile?.18:.76;wake();
  }
  function prepareTexture(){
    const w=water.naturalWidth,h=water.naturalHeight,blend=Math.round(h*.13),period=h-blend;
    texture=document.createElement('canvas');texture.width=w;texture.height=period;const t=texture.getContext('2d');t.drawImage(water,0,blend,w,period,0,0,w,period);
    const overlap=document.createElement('canvas');overlap.width=w;overlap.height=blend;const b=overlap.getContext('2d');b.drawImage(water,0,0,w,blend,0,0,w,blend);b.globalCompositeOperation='destination-in';const fade=b.createLinearGradient(0,0,0,blend);fade.addColorStop(0,'#fff0');fade.addColorStop(1,'#fff');b.fillStyle=fade;b.fillRect(0,0,w,blend);t.drawImage(overlap,0,period-blend);
    t.globalCompositeOperation='destination-in';const mask=t.createLinearGradient(0,0,w,0);mask.addColorStop(0,'#fff0');mask.addColorStop(.035,'#fff3');mask.addColorStop(.10,'#fffc');mask.addColorStop(.15,'#fff');mask.addColorStop(.85,'#fff');mask.addColorStop(.90,'#fffc');mask.addColorStop(.965,'#fff3');mask.addColorStop(1,'#fff0');t.fillStyle=mask;t.fillRect(0,0,w,period);
    // The centre current advances faster than the shallower shoulders.
    // Soft masks blend the velocities while the banks stay stationary.
    flowLayers=[
      {speed:21,stops:[[0,0],[.09,0],[.19,1],[.29,1],[.41,0],[1,0]]},
      {speed:42,stops:[[0,0],[.23,0],[.38,1],[.62,1],[.77,0],[1,0]]},
      {speed:25,stops:[[0,0],[.59,0],[.71,1],[.81,1],[.91,0],[1,0]]}
    ].map(layer=>{const image=document.createElement('canvas');image.width=w;image.height=period;const f=image.getContext('2d');f.drawImage(texture,0,0);f.globalCompositeOperation='destination-in';const mask=f.createLinearGradient(0,0,w,0);for(const [position,alpha] of layer.stops)mask.addColorStop(position,`rgba(255,255,255,${alpha})`);f.fillStyle=mask;f.fillRect(0,0,w,period);return{image,speed:layer.speed};});wake();
  }
  function renderWater(){
    if(!texture)return;
    const tw=texture.width,th=texture.height,step=(mobile?2:1)/dpr;
    // Draw on the device-pixel grid. Overlapping translucent strips create visible banding.
    for(let dy=0;dy<height;dy+=step){const y=dy+scrollY,p=at(y);
      const base=p.distance/textureScale,sy=(base%th+th)%th,sh=Math.min(8,(at(y+step).distance-p.distance)/textureScale||step/textureScale);
      ctx.drawImage(texture,0,Math.min(sy,th-sh),tw,sh,p.x-p.width/2,dy,p.width,step);
      for(let i=0;i<flowLayers.length;i++){
        const layer=flowLayers[i],ripple=Math.sin(base/59-phase*.9+i)*.35;
        const flowY=((base-phase*layer.speed*(mobile?1.6:1)*(portfolioPreview?1.5:1)+Math.sin(base/103-phase*.65+i)*1.8)%th+th)%th;
        ctx.drawImage(layer.image,0,Math.min(flowY,th-sh),tw,sh,p.x-p.width/2+ripple,dy,p.width,step);
      }
    }
    // Small slow highlights, dispersed through the sunlit half of the channel.
    const drift=phase*8,block=Math.floor((scrollY-drift)/400);for(let b=block;b<=block+Math.ceil(height/400);b++)for(let i=0;i<18;i++){const seed=b*31+i,yy=b*400+grain(seed+41)*400+drift,p=at(yy),x=p.x+p.width*(.05+grain(seed+12)*.21),alpha=Math.pow(.5+.5*Math.sin(phase*.65+seed),5)*.12;ctx.fillStyle=`rgba(255,241,204,${alpha})`;ctx.beginPath();ctx.ellipse(x,yy-scrollY,.6+grain(seed)*1.3,.35,Math.PI*.18,0,Math.PI*2);ctx.fill();}
  }
  function drawYacht(){
    const ctx=yachtContext;ctx.clearRect(0,0,width,height);
    if(!boat.complete||!boat.naturalWidth||!texture)return;
    const safeTop=(document.querySelector('.header')?.offsetHeight||88)+BOAT_LENGTH*.65;
    const safeBottom=height-(mobile?165:100);
    const screenTarget=Math.max(safeTop,Math.min(safeBottom,height*.59));
    const target=scrollY+screenTarget;boatY=!boatY||!moving()?target:target-Math.max(-height*.07,Math.min(height*.07,(target-boatY)*.8));
    boatY=scrollY+Math.max(safeTop,Math.min(safeBottom,boatY-scrollY));
    const p=at(boatY),a=at(boatY+30),before=at(boatY-30),angle=Math.atan2(a.x-before.x,60),length=BOAT_LENGTH,beam=length*boat.naturalWidth/boat.naturalHeight;
    heading=moving()?heading+(angle-heading)*.25:angle;
    const boxWidth=Math.abs(Math.cos(heading))*beam+Math.abs(Math.sin(heading))*length,boxHeight=Math.abs(Math.sin(heading))*beam+Math.abs(Math.cos(heading))*length;
    // Reserve text clearance even while the heading catches up after a fast jump.
    const leftLimit=8;
    const boatX=Math.max(leftLimit+boxWidth/2,Math.min(width-boxWidth/2-8,p.x));
    // Photographic foam follows the channel and dissipates gradually behind the stern.
    ctx.save();ctx.lineCap='round';
    const trail=length*1.7;
    if(foam.complete&&foam.naturalWidth){const step=1/dpr,start=boatY-length*.37;
      for(let dy=0;dy<trail;dy+=step){const t=dy/trail,yy=start-dy,p=at(yy);if(yy<scrollY||yy>scrollY+height)continue;
        const sy=Math.max(0,Math.min(foam.naturalHeight-3,t*(foam.naturalHeight-3)+Math.sin(phase*1.1-t*12)*6)),wakeWidth=Math.min(beam*(1.15+1.8*t),p.width*.72);
        ctx.globalAlpha=.44*Math.pow(1-t,1.65);ctx.drawImage(foam,0,sy,foam.naturalWidth,foam.naturalHeight*step/trail,p.x-wakeWidth/2,yy-scrollY,wakeWidth,step);
      }
    }
    ctx.globalAlpha=1;
    ctx.translate(boatX+Math.sin(phase*.6)*.5,boatY-scrollY);ctx.rotate(Math.PI-heading+Math.sin(phase*.5)*.006);
    ctx.shadowColor='#062c36a0';ctx.shadowBlur=9;ctx.shadowOffsetX=5;ctx.shadowOffsetY=-6;ctx.drawImage(boat,-beam/2,-length/2,beam,length);ctx.restore();
    canvas.dataset.position=String(Math.round(boatY));
    canvas.dataset.boatLength=String(BOAT_LENGTH);canvas.dataset.flowPhase=phase.toFixed(2);
    yachtCanvas.dataset.bounds=JSON.stringify({x:boatX-boxWidth/2,y:boatY-scrollY-boxHeight/2,width:boxWidth,height:boxHeight});
  }
  function render(){ctx.clearRect(0,0,width,height);renderWater();drawYacht();canvas.dataset.variant='atelier';canvas.dataset.material=texture?'ready':'loading';canvas.dataset.viewport=width+'x'+height;
    if(portfolioPreview&&!previewReady&&texture&&boat.complete&&boat.naturalWidth){previewReady=true;parent.postMessage({type:'bangingo:preview-ready'},'*');}
  }
  function tick(now){frame=0;if(dirty||now-last>40){if(moving())phase+=Math.min((now-last)/1000,.06);last=now;render();dirty=false;}if(moving())frame=requestAnimationFrame(tick);}
  function wake(){dirty=true;if(!document.hidden&&!frame)frame=requestAnimationFrame(tick);else if(document.hidden)render();}
  water.onload=prepareTexture;boat.onload=wake;foam.onload=wake;water.src='assets/atelier-water.webp';boat.src='assets/river-yacht.webp';foam.src='assets/atelier-wake.webp';
  addEventListener('resize',resize,{passive:true});addEventListener('scroll',wake,{passive:true});new ResizeObserver(resize).observe(document.querySelector('main'));
  addEventListener('bangingo:palette',wake);document.addEventListener('visibilitychange',()=>{if(document.hidden&&frame){cancelAnimationFrame(frame);frame=0;}else wake();});
  document.fonts.ready.then(resize);resize();
})();
