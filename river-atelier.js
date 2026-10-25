(() => {
  'use strict';
  const canvas=document.querySelector('#river-canvas'),ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)return;
  const navigation=window.BangingoRiverNavigation,{clamp,ease}=navigation;
  const water=new Image(),boat=new Image(),foam=new Image();
  const BOAT_LENGTH=124,ROUTE_STEP=4,ROUTE_START=-500;
  const yachtCanvas=document.createElement('canvas');
  yachtCanvas.id='yacht-canvas';yachtCanvas.setAttribute('aria-hidden','true');canvas.after(yachtCanvas);
  const yachtContext=yachtCanvas.getContext('2d',{alpha:true});
  let width=0,height=0,dpr=1,mobile=false,route=[],mobileBanks=[],landmarks=[],obstacles=[],attentionStops=[],texture=null,flowLayers=[],textureScale=.65,phase=0,boatY=0,boatX=0,heading=0,frame=0,last=0,lastWater=0,dirty=true;
  let hull=navigation.hull(BOAT_LENGTH,49),poseReady=false;
  const laneOffsets=[-.27,0,.27];
  const portfolioPreview=window.self!==window.top&&new URLSearchParams(location.search).get('preview')==='portfolio';
  let previewPlaying=false,previewReady=false;
  const moving=()=>!document.hidden&&(!portfolioPreview||previewPlaying);
  if(portfolioPreview)addEventListener('message',event=>{
    if(event.source!==parent||event.data?.type!=='bangingo:preview-motion'||typeof event.data.playing!=='boolean')return;
    previewPlaying=event.data.playing;wake();
    parent.postMessage({type:'bangingo:preview-state',playing:previewPlaying,phase},event.origin);
  });
  const grain=i=>{const v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  function at(y){
    const index=Math.max(0,Math.min(route.length-2,(y-ROUTE_START)/ROUTE_STEP)),i=Math.floor(index),t=index-i,a=route[i],b=route[i+1];
    if(!a||!b)return{x:width*.5,width:width*.16,distance:y};
    return{x:a.x+(b.x-a.x)*t,width:a.width+(b.width-a.width)*t,distance:a.distance+(b.distance-a.distance)*t,
      curve:(a.curve||0)+((b.curve||0)-(a.curve||0))*t,
      flow0:(a.flow0||0)+((b.flow0||0)-(a.flow0||0))*t,
      flow1:(a.flow1||0)+((b.flow1||0)-(a.flow1||0))*t,
      flow2:(a.flow2||0)+((b.flow2||0)-(a.flow2||0))*t};
  }
  function mobileAt(y){
    let center=.61,turn=0;
    if(mobileBanks.length){
      let i=0;while(i<mobileBanks.length-2&&y>mobileBanks[i+1].y)i++;
      const a=mobileBanks[i],b=mobileBanks[i+1],t=Math.max(0,Math.min(1,(y-a.y)/Math.max(1,b.y-a.y)));
      center=a.x+(b.x-a.x)*t*t*(3-2*t);
      if(a.x!==b.x)turn=Math.pow(Math.sin(Math.PI*t),.65);
    }
    const focus=emphasisAt(y),base=Math.max(72/width,.145+.022*Math.sin(y/187)+.012*Math.sin(y/389));
    const poolBreadth=base+(.25-base)*focus.weight,breadth=Math.max(poolBreadth,116*turn/width);
    // Wider pools move slightly away from the occupied bank, keeping text dry.
    center=.5+(center-.5)*(1+(poolBreadth-.14)*3);
    const side=Math.max(-1,Math.min(1,(center-.5)/.08));
    const bend=(.012+.022*Math.sin(y/137+.4*Math.sin(y/431)))*(1-.35*focus.weight);
    return{x:width*(center+side*bend),width:width*breadth};
  }
  function emphasisAt(y){
    let total=0,center=0,breadth=0,remaining=1;
    for(const point of landmarks){
      const influence=Math.exp(-.5*Math.pow((y-point.y)/point.radius,2));
      total+=influence;center+=point.center*influence;breadth+=point.breadth*influence;remaining*=1-influence;
    }
    return{weight:1-remaining,landmark:total?{center:center/total,breadth:breadth/total}:null};
  }
  function desktopAt(y){
    const {weight,landmark}=emphasisAt(y);
    // Meanders continue through the pools, with unequal spacing and gentler outer banks.
    const meander=Math.sin(y/171+.52*Math.sin(y/607)+.6);
    const narrow=.098+.019*Math.sin(y/281+1.1)+.008*Math.sin(y/137);
    const breadth=narrow+((landmark?.breadth??.1)-narrow)*weight;
    const excursion=(.076-.024*weight)*meander+.009*Math.sin(y/383-.8)+((landmark?.center??.5)-.5)*weight*.45;
    const room=.155-breadth/2;
    const center=.5+room*Math.tanh(excursion/room);
    return{x:width*center,width:width*breadth};
  }
  function resize(){
    width=document.documentElement.clientWidth;height=innerHeight;mobile=matchMedia('(max-width:680px)').matches;dpr=Math.min(devicePixelRatio||1,mobile?1.5:1.35);
    canvas.width=yachtCanvas.width=Math.round(width*dpr);canvas.height=yachtCanvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);yachtContext.setTransform(dpr,0,0,dpr,0,0);
    // Each important heading gets its own inlet, measured after translation/reflow.
    landmarks=[
      ['#main-title',.49,.255,215],['#packages-title',.49,.275,230],
      ['#golden-title',.475,.23,205],['#dark-title',.525,.22,180],
      ['#film-title',.485,.245,190],['#beyond-title',.475,.225,180],
      ['#programme-title',.49,.26,220],['.programme-group:last-child h3',.49,.235,185],
      ['#contact-title',.485,.265,240]
    ].flatMap(([selector,center,breadth,radius])=>{
      const element=document.querySelector(selector);if(!element)return[];
      const r=element.getBoundingClientRect();
      return r.height?[{id:element.id||selector,y:r.top+scrollY+r.height*.56,center,breadth,radius:mobile?Math.max(110,r.height*.65):Math.max(radius,r.height*.65)}]:[];
    });
    mobileBanks=[];
    if(mobile){
      // Take the actual translated layout into account, rather than assuming fixed heights.
      const selector='.intro-copy,.chapter-copy,.world .photo,.scroll-cue,.chapter-bottom,.offers-heading,.trip-card,.programme-note,.film-heading,.film-frame,.film-caption,.programme-heading,.programme-group,.contact-copy,footer';
      const islands=[...document.querySelectorAll(selector)].map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height).sort((a,b)=>a.top-b.top);
      for(const r of islands){
        const x=(r.left+r.right)/2<width/2?.61:.39;
        mobileBanks.push({y:r.top+scrollY-15,x},{y:r.bottom+scrollY+15,x});
      }
      mobileBanks.sort((a,b)=>a.y-b.y);
      if(mobileBanks.length){mobileBanks.unshift({y:ROUTE_START-500,x:mobileBanks[0].x});mobileBanks.push({y:document.documentElement.scrollHeight+1000,x:mobileBanks.at(-1).x});}
    }
    const protectedContent='.intro-copy,.chapter-copy,.world .photo,.trip-card,.programme-group,.film-heading,.film-frame,.film-caption,.contact-copy,.contact-section>.contact-tools,.offers-heading>*,.programme-heading>*,.programme-note,.chapter-bottom>*,.scroll-cue,footer>*';
    obstacles=[...document.querySelectorAll(protectedContent)].map(element=>{
      const r=element.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top+scrollY,bottom:r.bottom+scrollY,side:(r.left+r.right)/2<width/2?-1:1,visible:r.width>0&&r.height>0&&r.width<width*.57};
    }).filter(r=>r.visible);
    attentionStops.forEach(stop=>stop.element.style.removeProperty('--river-focus'));
    attentionStops=[...document.querySelectorAll('.world .photo,.trip-card,.direct-contact>a')].map((element,index)=>{
      const r=element.getBoundingClientRect();return{element,id:element.dataset.id||element.getAttribute('href')||String(index),y:r.top+scrollY+r.height*.57,side:(r.left+r.right)/2<width/2?-1:1,radius:Math.max(135,Math.min(250,r.height*.65)),visible:r.width>0&&r.height>0};
    }).filter(stop=>stop.visible).sort((a,b)=>a.y-b.y);
    if(!mobile){
      // Alternate the destination when a pair of cards shares the same row.
      const selected=[];let row=0;
      for(let i=0;i<attentionStops.length;){let end=i+1;while(end<attentionStops.length&&attentionStops[end].y-attentionStops[i].y<100)end++;
        selected.push(attentionStops[i+(row%2?(end-i-1):0)]);i=end;row++;
      }attentionStops=selected;
    }
    route=[];
    for(let y=ROUTE_START;y<document.documentElement.scrollHeight+600;y+=ROUTE_STEP){
      const p=mobile?mobileAt(y):desktopAt(y);
      const previous=route.at(-1);
      route.push({y,x:p.x,width:p.width,distance:previous?previous.distance+Math.hypot(p.x-previous.x,ROUTE_STEP):0});
    }
    // Integrate travel time for each stream. Outer bends and narrower reaches run
    // faster, without a time-dependent seam where neighbouring velocities change.
    for(let i=0;i<route.length;i++){
      const p=route[i],before=at(p.y-18),after=at(p.y+18),slope=(after.x-before.x)/36;
      p.curve=(after.x-2*p.x+before.x)/324/Math.pow(1+slope*slope,1.5);
      for(let lane=0;lane<3;lane++){
        const key='flow'+lane,previous=route[i-1],offset=laneOffsets[lane];
        const speed=clamp(Math.pow((mobile?85:width*.15)/p.width,.28),.75,1.4)*(1-clamp(p.curve*p.width*offset*2,-.3,.3));
        p[key]=previous?previous[key]+Math.hypot(p.x+p.width*offset-previous.x-previous.width*offset,ROUTE_STEP)/speed:0;
      }
    }
    canvas.dataset.routing='editorial-pools';
    canvas.dataset.channelBounds=JSON.stringify({centerMin:Math.min(...route.map(p=>p.x))/width,centerMax:Math.max(...route.map(p=>p.x))/width,leftBankMin:Math.min(...route.map(p=>p.x-p.width/2))/width,rightBankMax:Math.max(...route.map(p=>p.x+p.width/2))/width});
    canvas.dataset.channelWidths=JSON.stringify({min:Math.min(...route.map(p=>p.width)),max:Math.max(...route.map(p=>p.width))});
    canvas.dataset.landmarks=JSON.stringify(landmarks.map(p=>({id:p.id,y:Math.round(p.y),width:Math.round(at(p.y).width)})));
    textureScale=mobile?.18:.76;poseReady=false;wake();
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
      const next=at(y+step),base=p.distance/textureScale,sy=(base%th+th)%th,sh=Math.min(8,(next.distance-p.distance)/textureScale||step/textureScale);
      ctx.drawImage(texture,0,Math.min(sy,th-sh),tw,sh,p.x-p.width/2,dy,p.width,step);
      for(let i=0;i<flowLayers.length;i++){
        const layer=flowLayers[i],stream=p['flow'+i]/textureScale,flowHeight=Math.min(12,Math.max(.1,(next['flow'+i]-p['flow'+i])/textureScale));
        const flowY=((stream-phase*layer.speed*(mobile?1.6:1)*(portfolioPreview?1.5:1))%th+th)%th;
        ctx.drawImage(layer.image,0,Math.min(flowY,th-flowHeight),tw,flowHeight,p.x-p.width/2,dy,p.width,step);
      }
    }
    drawCurrentHighlights();
  }
  function streamPoint(travel,lane){
    const key='flow'+lane;let low=0,high=route.length-1;
    while(high-low>1){const mid=(low+high)>>1;if(route[mid][key]<travel)low=mid;else high=mid;}
    const a=route[low],b=route[high],t=clamp((travel-a[key])/Math.max(.01,b[key]-a[key]),0,1),y=a.y+(b.y-a.y)*t;
    return{y,...at(y)};
  }
  function drawCurrentHighlights(){
    ctx.save();ctx.lineCap='round';ctx.lineWidth=mobile?.65:.85;
    for(let lane=0;lane<3;lane++){
      const key='flow'+lane,drift=phase*flowLayers[lane].speed*textureScale*(mobile?1.6:1)*(portfolioPreview?1.5:1),spacing=mobile?98:115;
      const first=Math.floor((at(scrollY-40)[key]-drift)/spacing),end=Math.ceil((at(scrollY+height+40)[key]-drift)/spacing);
      for(let n=first;n<=end;n++){
        const seed=n*17+lane*31,travel=n*spacing+grain(seed)*spacing*.6+drift,offset=laneOffsets[lane]+(grain(seed+4)-.5)*.1;
        const length=8+grain(seed+9)*19,alpha=.035+.055*Math.pow(.5+.5*Math.sin(phase*.7+seed),2);
        ctx.strokeStyle=`rgba(228,248,239,${alpha})`;ctx.beginPath();
        for(let k=0;k<=5;k++){const p=streamPoint(travel-length*k/5,lane),x=p.x+p.width*offset;k?ctx.lineTo(x,p.y-scrollY):ctx.moveTo(x,p.y-scrollY);}ctx.stroke();
      }
    }ctx.restore();
  }
  function guidanceAt(y){
    let sum=0,direction=0,strength=0,nearest=null;
    for(const stop of attentionStops){const weight=Math.exp(-.5*((y-stop.y)/stop.radius)**2);sum+=weight;direction+=stop.side*weight;if(weight>strength){strength=weight;nearest=stop;}}
    const p=at(y),turnAllowance=1-clamp(Math.abs(p.curve)*160,0,.85);
    const offset=(sum?direction/sum:0)*Math.min(mobile?14:48,p.width*.2)*strength*turnAllowance;
    return{x:p.x+offset,strength,nearest};
  }
  function courseAt(y){return Math.atan2(guidanceAt(y+BOAT_LENGTH*.4).x-guidanceAt(y-BOAT_LENGTH*.4).x,BOAT_LENGTH*.8);}
  function safePose(y,x,angle){
    return navigation.pose({y,x,angle,points:hull,water:at,obstacles:obstacles.filter(item=>item.bottom>y-90&&item.top<y+90)});
  }
  function drawYacht(dt=1/60){
    const ctx=yachtContext;ctx.clearRect(0,0,width,height);
    if(!boat.complete||!boat.naturalWidth||!texture)return;
    const safeTop=(document.querySelector('.header')?.offsetHeight||88)+BOAT_LENGTH*.65;
    const safeBottom=height-(mobile?165:100);
    const screenTarget=Math.max(safeTop,Math.min(safeBottom,height*.59));
    const target=scrollY+screenTarget,jumped=!poseReady||Math.abs(target-boatY)>height*.45;
    boatY=jumped?target:ease(boatY,target,dt,.13);
    boatY=scrollY+clamp(boatY-scrollY,safeTop,safeBottom);
    const guide=guidanceAt(boatY),course=courseAt(boatY),length=BOAT_LENGTH,beam=length*boat.naturalWidth/boat.naturalHeight;
    const wantedHeading=jumped?course:ease(heading,course,dt,.1),wantedX=jumped?guide.x:ease(boatX,guide.x,dt,.12);
    let pose=safePose(boatY,wantedX,wantedHeading)||safePose(boatY,guide.x,course),recovery=0;
    // A sudden anchor jump may put the bow across an unusually tight bend.
    // Find a nearby navigable position, never shrink the yacht or draw it on land.
    for(let step=8;!pose&&step<height;step+=8)for(const direction of [-1,1]){
      const y=boatY+direction*step;if(y<scrollY+safeTop||y>scrollY+safeBottom)continue;
      pose=safePose(y,guidanceAt(y).x,courseAt(y));if(pose){recovery=direction*step;break;}
    }
    if(!pose){yachtCanvas.dataset.safe='false';return;}
    boatX=pose.x;boatY=pose.y;heading=pose.angle;poseReady=true;
    // Photographic foam follows the channel and dissipates gradually behind the stern.
    ctx.save();ctx.lineCap='round';
    const trail=length*1.7;
    if(foam.complete&&foam.naturalWidth){const step=1/dpr,start=boatY-Math.cos(heading)*length*.43,sternX=boatX-Math.sin(heading)*length*.43,offset=boatX-at(boatY).x;
      for(let dy=0;dy<trail;dy+=step){const t=dy/trail,yy=start-dy,p=at(yy);if(yy<scrollY||yy>scrollY+height)continue;
        const sy=Math.max(0,Math.min(foam.naturalHeight-3,t*(foam.naturalHeight-3)+Math.sin(phase*1.1-t*12)*6)),wakeWidth=Math.min(beam*(.9+1.7*t),p.width*.68);
        const current=p.x+offset*Math.exp(-dy/100),stern=sternX-Math.sin(heading)*dy,center=current+(stern-current)*Math.exp(-dy/35);
        const wakeX=clamp(center,p.x-p.width*.44+wakeWidth/2,p.x+p.width*.44-wakeWidth/2);
        ctx.globalAlpha=.4*Math.pow(1-t,1.65);ctx.drawImage(foam,0,sy,foam.naturalWidth,foam.naturalHeight*step/trail,wakeX-wakeWidth/2,yy-scrollY,wakeWidth,step);
      }
    }
    ctx.globalAlpha=1;
    ctx.translate(boatX,boatY-scrollY);ctx.rotate(Math.PI-heading);
    ctx.shadowColor='#062c36a0';ctx.shadowBlur=9;ctx.shadowOffsetX=5;ctx.shadowOffsetY=-6;ctx.drawImage(boat,-beam/2,-length/2,beam,length);ctx.restore();
    canvas.dataset.position=String(Math.round(boatY));
    canvas.dataset.boatLength=String(BOAT_LENGTH);canvas.dataset.flowPhase=phase.toFixed(2);
    const bounds=navigation.bounds(pose,hull);bounds.y-=scrollY;
    yachtCanvas.dataset.bounds=JSON.stringify(bounds);yachtCanvas.dataset.safe='true';yachtCanvas.dataset.recovery=String(recovery);
    yachtCanvas.dataset.heading=heading.toFixed(4);yachtCanvas.dataset.clearance=pose.clearance.toFixed(2);
    yachtCanvas.dataset.approach=JSON.stringify({target:guide.nearest?.id||'',offset:+(boatX-at(boatY).x).toFixed(2),strength:+guide.strength.toFixed(2)});
    for(const stop of attentionStops){const focus=stop===guide.nearest?guide.strength:0;if(Math.abs(focus-(stop.focus||0))>.025){stop.element.style.setProperty('--river-focus',focus.toFixed(2));stop.focus=focus;}}
  }
  function renderWaterFrame(){ctx.clearRect(0,0,width,height);renderWater();canvas.dataset.variant='atelier';canvas.dataset.material=texture?'ready':'loading';canvas.dataset.viewport=width+'x'+height;
    if(portfolioPreview&&!previewReady&&texture&&boat.complete&&boat.naturalWidth){previewReady=true;parent.postMessage({type:'bangingo:preview-ready'},'*');}
  }
  function tick(now){frame=0;const dt=Math.min((now-last)/1000||1/60,.05);last=now;if(moving())phase+=dt;
    if(dirty||now-lastWater>40){renderWaterFrame();lastWater=now;dirty=false;}drawYacht(dt);if(moving())frame=requestAnimationFrame(tick);
  }
  function wake(){dirty=true;if(!document.hidden&&!frame)frame=requestAnimationFrame(tick);}
  water.onload=prepareTexture;boat.onload=()=>{hull=navigation.hull(BOAT_LENGTH,BOAT_LENGTH*boat.naturalWidth/boat.naturalHeight);resize();};foam.onload=wake;water.src='assets/atelier-water.webp';boat.src='assets/river-yacht.webp';foam.src='assets/atelier-wake.webp';
  addEventListener('resize',resize,{passive:true});addEventListener('scroll',wake,{passive:true});new ResizeObserver(resize).observe(document.querySelector('main'));
  addEventListener('bangingo:palette',wake);document.addEventListener('visibilitychange',()=>{if(document.hidden&&frame){cancelAnimationFrame(frame);frame=0;}else wake();});
  document.fonts.ready.then(resize);resize();
})();
