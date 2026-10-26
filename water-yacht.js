(() => {
  'use strict';
  const water=document.querySelector('#water-surface');
  if(!water)return;
  water.dataset.objects='yacht-only';
  const canvas=document.createElement('canvas');
  canvas.id='water-yacht';canvas.setAttribute('aria-hidden','true');water.after(canvas);
  const ctx=canvas.getContext('2d'),boat=new Image(),foam=new Image();
  if(!ctx)return;
  const LENGTH=76,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let width=1,height=1,ratio=1,top=100,lane=56,maxScroll=1,y=0,phase=0,last=0,frame=0,ready=false;
  const course=worldY=>width-lane/2+Math.sin(worldY/290)*3.5;
  function measure(){
    width=document.documentElement.clientWidth;height=innerHeight;
    ratio=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    top=(document.querySelector('.header')?.offsetHeight||94)+LENGTH*.7;
    lane=parseFloat(getComputedStyle(document.body).getPropertyValue('--yacht-lane'))||56;
    maxScroll=Math.max(1,document.documentElement.scrollHeight-height);
    wake();
  }
  function draw(dt){
    ctx.clearRect(0,0,width,height);
    if(!boat.complete||!boat.naturalWidth)return;
    const progress=clamp(scrollY/maxScroll,0,1),bottom=Math.max(top,height-100);
    const target=scrollY+clamp(height*(.43+.23*progress),top,bottom);
    if(!ready||Math.abs(target-y)>height*.6){y=target;ready=true;}
    else y+=(target-y)*(1-Math.exp(-dt/.13));
    y=scrollY+clamp(y-scrollY,top,bottom);
    const x=course(y),screenY=y-scrollY,beam=LENGTH*boat.naturalWidth/boat.naturalHeight;
    const heading=Math.atan2(course(y+30)-course(y-30),60),trail=LENGTH*1.5;
    if(foam.complete&&foam.naturalWidth){
      for(let d=0;d<trail;d+=2){
        const t=d/trail,yy=y-LENGTH*.42-d,wakeWidth=Math.min(lane-14,beam*(.75+1.2*t));
        const sy=clamp(t*(foam.naturalHeight-8)+Math.sin(phase-t*9)*3,0,foam.naturalHeight-8);
        ctx.globalAlpha=.44*(1-t)**1.7;
        ctx.drawImage(foam,0,sy,foam.naturalWidth,5,course(yy)-wakeWidth/2,yy-scrollY,wakeWidth,2.2);
      }
    }
    ctx.globalAlpha=1;ctx.save();ctx.translate(x,screenY);ctx.rotate(Math.PI-heading);
    ctx.shadowColor='#04151db0';ctx.shadowBlur=6;ctx.shadowOffsetX=2;ctx.shadowOffsetY=-3;
    ctx.drawImage(boat,-beam/2,-LENGTH/2,beam,LENGTH);ctx.restore();
    const halfWidth=Math.abs(Math.cos(heading))*beam/2+Math.abs(Math.sin(heading))*LENGTH/2;
    const halfHeight=Math.abs(Math.cos(heading))*LENGTH/2+Math.abs(Math.sin(heading))*beam/2;
    canvas.dataset.bounds=JSON.stringify({left:x-halfWidth,right:x+halfWidth,top:screenY-halfHeight,bottom:screenY+halfHeight});
    canvas.dataset.length=String(LENGTH);canvas.dataset.position=y.toFixed(1);
    canvas.dataset.heading=heading.toFixed(4);canvas.dataset.progress=progress.toFixed(3);
    canvas.dataset.safe=String(x-halfWidth>width-lane&&x+halfWidth<width&&screenY-halfHeight>top-LENGTH*.7);
    canvas.dataset.ready='true';canvas.dataset.phase=phase.toFixed(2);
  }
  function tick(now){
    frame=0;if(document.hidden)return;
    const dt=Math.min(.06,(now-last)/1000||1/60);last=now;phase+=dt;draw(dt);
    frame=requestAnimationFrame(tick);
  }
  function wake(){if(!frame&&!document.hidden){last=performance.now();frame=requestAnimationFrame(tick);}}
  boat.onload=measure;boat.src='assets/river-yacht.webp';foam.onload=wake;foam.src='assets/atelier-wake.webp';
  addEventListener('resize',measure,{passive:true});addEventListener('scroll',wake,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else wake();});
  new ResizeObserver(measure).observe(document.querySelector('main'));
  window.BangingoLanguage?.subscribe(()=>requestAnimationFrame(measure));
  document.fonts.ready.then(measure);measure();
})();
