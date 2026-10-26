(() => {
  'use strict';
  const canvas=document.querySelector('#water-surface'),objects=document.querySelector('#water-objects');
  const ctx=objects.getContext('2d'),gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,powerPreference:'low-power'});
  const reduce=matchMedia('(prefers-reduced-motion:reduce)'),mobile=matchMedia('(max-width:680px)');
  const textureImage=new Image(),atlas=new Image(),yacht=new Image(),foam=new Image();
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
  const palettes={
    lagoon:{deep:[.014,.13,.18],light:[.11,.63,.61],sun:[.85,.97,.83]},
    sunset:{deep:[.09,.07,.14],light:[.62,.38,.36],sun:[1,.72,.39]},
    midnight:{deep:[.018,.035,.10],light:[.17,.30,.44],sun:[.69,.63,1]},
    emerald:{deep:[.018,.12,.13],light:[.20,.49,.36],sun:[1,.84,.51]}
  };
  let w=1,h=1,dpr=1,time=0,frame=0,last=0,painted=0,mode='auto',sectionStops=[],decor=[],ready=false;
  let meterStart=0,meterFrames=0;
  let colours={...palettes.lagoon},ripples=Array.from({length:4},()=>[-1000,-1000,-100,0]),rippleIndex=0,lastTouch=0;
  let program,uniforms={},gpuTexture;
  const vertex=`attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
  const fragment=`precision highp float;
  varying vec2 uv;uniform vec2 resolution;uniform float time,scroll;uniform sampler2D surface;
  uniform vec3 deep,light,sun;uniform vec4 ripple0,ripple1,ripple2,ripple3;
  vec2 mirror(vec2 p){return 1.-abs(mod(p,2.)-1.);}
  vec2 touch(vec2 p,vec4 r){
    float age=time-r.z;vec2 v=p-r.xy;float d=length(v),front=d-age*48.;
    float a=exp(-front*front/480.)*exp(-age*.8)*step(0.,age)*step(age,5.);
    return v/max(d,1.)*sin(front*.13)*a*2.5*r.w;
  }
  void main(){
    vec2 screen=vec2(uv.x,1.-uv.y)*resolution;
    float scale=max(resolution.x,resolution.y)/.84;
    vec2 p=(screen+vec2(0.,scroll*.24))/scale;
    vec2 flow=vec2(.009,-.018)*time;
    vec2 wave=vec2(sin(p.y*8.8+p.x*2.1-time*.8),cos(p.x*9.1-p.y*2.4+time*.65));
    wave+=.4*vec2(sin(p.y*23.+time*1.2),cos(p.x*19.-time*.9));
    vec2 disturbance=(touch(screen,ripple0)+touch(screen,ripple1)+touch(screen,ripple2)+touch(screen,ripple3))/scale;
    vec2 q=p+flow+wave*.012+disturbance;
    vec3 photo=texture2D(surface,mirror(q)).rgb;
    vec3 cross=texture2D(surface,mirror(p*1.37-flow*.63+wave*.019+vec2(.23,.57))).rgb;
    float detail=dot(mix(photo,cross,.24),vec3(.21,.58,.21));
    float crest=smoothstep(.28,.78,detail);
    vec3 colour=mix(deep,light,clamp(detail*1.24,.0,1.));
    float a=p.x*13.+p.y*9.-time*1.25;
    float b=p.x*-19.+p.y*12.-time*1.4;
    float c=p.x*33.+p.y*24.+time*.85;
    vec2 grad=vec2(13.,9.)*cos(a)*.007+vec2(-19.,12.)*cos(b)*.0035+vec2(33.,24.)*cos(c)*.0015;
    grad+=vec2(photo.r-cross.b,photo.g-cross.g)*.4;
    vec3 normal=normalize(vec3(grad,1.));
    vec3 halfLight=normalize(vec3(-.13,.08,1.));
    float spec=pow(max(dot(normal,halfLight),0.),95.);
    float sunLane=exp(-pow((screen.x/resolution.x-.7+sin(p.y*.9)*.1)/.25,2.));
    float shimmer=spec*sunLane*(.06+crest*.8);
    colour+=sun*shimmer*.58;
    colour+=light*pow(crest,3.)*.12;
    float shade=mix(.72,1.,smoothstep(.03,.58,screen.x/resolution.x));
    colour*=shade;
    gl_FragColor=vec4(colour,1.);
  }`;
  function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;}
  function setup(){
    if(!gl){canvas.dataset.renderer='css-fallback';canvas.dataset.material='fallback';document.body.classList.add('water-fallback');return;}
    try{
      program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      for(const key of ['resolution','time','scroll','surface','deep','light','sun','ripple0','ripple1','ripple2','ripple3'])uniforms[key]=gl.getUniformLocation(program,key);
      gpuTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,gpuTexture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,textureImage);ready=true;canvas.dataset.renderer='webgl';canvas.dataset.material='ready';
    }catch(error){canvas.dataset.renderer='css-fallback';canvas.dataset.material='fallback';document.body.classList.add('water-fallback');canvas.style.visibility='hidden';console.warn('Water surface: using the photographic fallback.',error.message);}
  }
  function measure(){
    w=document.documentElement.clientWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,mobile.matches?1.15:1.4);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);objects.width=canvas.width;objects.height=canvas.height;ctx.setTransform(dpr,0,0,dpr,0,0);
    if(gl)gl.viewport(0,0,canvas.width,canvas.height);
    const sections=[['home','lagoon'],['packages','sunset'],['golden-hour','emerald'],['after-dark','midnight'],['film','sunset'],['beyond','lagoon'],['programme','midnight'],['contact','emerald']];
    sectionStops=sections.map(([id,palette])=>{const el=document.getElementById(id),r=el.getBoundingClientRect();return{id,palette,y:r.top+scrollY,height:r.height};});
    decor=[];
    for(let i=0;i<sectionStops.length;i++){
      const s=sectionStops[i],phone=mobile.matches;
      if(i===0){
        const copyBottom=document.querySelector('.intro-copy').getBoundingClientRect().bottom+scrollY;
        decor.push({kind:'buoy',x:phone?.085:.39,y:phone?copyBottom+200:s.y+s.height*.59,size:phone?30:49,seed:2});
        decor.push({kind:'wood',x:phone?.12:.36,y:s.y+(phone?790:s.height*.84),size:phone?76:105,seed:5});
        decor.push({kind:'yacht',x:phone?.76:.49,y:phone?copyBottom+62:s.y+s.height*.26,size:phone?78:112,seed:8});
      }else{
        decor.push({kind:i%2?'wood':'buoy',x:phone?(i%2?.94:.04):.50,y:s.y+(i===1?30:Math.min(s.height*.52,560)),size:phone?(i%2?78:27):(i%2?112:41),seed:i*7});
        if(!phone)decor.push({kind:i%2?'buoy':'wood',x:i%2?.025:.975,y:s.y+s.height*.8,size:i%2?30:90,seed:i*13});
      }
    }
    canvas.dataset.viewport=w+'x'+h;wake();
  }
  function targetColour(){
    if(mode!=='auto'){canvas.dataset.colour=mode;return palettes[mode];}
    const y=scrollY+h*.45;let current=sectionStops[0],next=current;
    for(let i=0;i<sectionStops.length;i++)if(sectionStops[i].y<y){current=sectionStops[i];next=sectionStops[i+1]||current;}
    const t=clamp((y-(next.y-450))/650,0,1),smooth=t*t*(3-2*t),a=palettes[current.palette],b=palettes[next.palette];
    canvas.dataset.colour=current.palette;
    return Object.fromEntries(['deep','light','sun'].map(key=>[key,a[key].map((value,i)=>mix(value,b[key][i],smooth))]));
  }
  function paintSurface(dt){
    const target=targetColour(),blend=1-Math.exp(-dt/1.2);
    for(const key of ['deep','light','sun'])colours[key]=colours[key].map((v,i)=>mix(v,target[key][i],blend));
    if(!ready)return;
    gl.uniform2f(uniforms.resolution,w,h);gl.uniform1f(uniforms.time,time);gl.uniform1f(uniforms.scroll,scrollY);
    for(const key of ['deep','light','sun'])gl.uniform3fv(uniforms[key],colours[key]);
    for(let i=0;i<4;i++)gl.uniform4fv(uniforms['ripple'+i],ripples[i]);
    gl.uniform1i(uniforms.surface,0);gl.drawArrays(gl.TRIANGLES,0,6);
  }
  function ring(x,y,size,seed){
    ctx.save();ctx.translate(x,y);ctx.rotate(-.2);ctx.scale(1,.75);
    for(let i=0;i<3;i++){
      const cycle=(time*.28+seed*.19+i/3)%1,r=size*(.6+cycle*.85);
      ctx.strokeStyle=`rgba(214,245,223,${.22*(1-cycle)})`;ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(0,0,r,r*.72,0,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle=`rgba(0,24,35,${.2*(1-cycle)})`;ctx.beginPath();ctx.ellipse(1,2,r+1,r*.72+1,0,0,Math.PI*2);ctx.stroke();
    }ctx.restore();
  }
  function paintObjects(){
    ctx.clearRect(0,0,w,h);let visible=0;
    for(const item of decor){
      const drift=item.kind==='wood'?Math.sin(time*.045+item.seed)*55:0;
      const px=item.x*w+Math.sin(time*.15+item.seed)*9+drift*.2,py=item.y-scrollY+Math.sin(time*.35+item.seed)*4+drift;
      if(py<-180||py>h+180)continue;visible++;
      const size=item.size,rotation=Math.sin(time*.23+item.seed)*.055;
      if(item.kind!=='yacht')ring(px,py,size*(item.kind==='buoy'?.7:.45),item.seed);
      ctx.save();ctx.translate(px,py);ctx.rotate(rotation);ctx.shadowColor='#001d39a0';ctx.shadowBlur=8;ctx.shadowOffsetX=5;ctx.shadowOffsetY=7;
      if(atlas.complete&&atlas.naturalWidth){
        if(item.kind==='buoy')ctx.drawImage(atlas,60,210,560,500,-size/2,-size*.45,size,size*.9);
        if(item.kind==='wood'){ctx.rotate(-.2+item.seed*.07);ctx.drawImage(atlas,810,70,940,740,-size/2,-size*.394,size,size*.788);}
      }
      if(item.kind==='yacht'&&yacht.complete&&yacht.naturalWidth){
        ctx.rotate(.7);
        if(foam.complete&&foam.naturalWidth){
          ctx.shadowColor='transparent';
          for(let i=0;i<48;i++){const t=i/48,span=size*(.38+t*.7),sy=clamp(t*(foam.naturalHeight-40)+Math.sin(time*1.2-t*6)*12,0,foam.naturalHeight-40);ctx.globalAlpha=.38*(1-t)**1.6;ctx.drawImage(foam,0,sy,foam.naturalWidth,35,-span/2+Math.sin(time*.6+t*3)*t*3,size*.35+t*size*1.5,span,size*1.5/48+1);}
          ctx.globalAlpha=1;
        }
        ctx.shadowColor='#001d39a0';ctx.shadowBlur=14;ctx.drawImage(yacht,-size*.2,-size*.5,size*.4,size);
      }
      ctx.restore();
    }
    objects.dataset.visible=String(visible);objects.dataset.phase=time.toFixed(2);
  }
  function tick(now){
    frame=0;if(document.hidden)return;
    const dt=Math.min(.06,(now-last)/1000||1/60);last=now;time+=dt*(reduce.matches?.32:1);
    // Water gets a separate bounded GPU pass; scroll and touch remain native.
    if(now-painted>(mobile.matches?32:24)){paintSurface(dt*(mobile.matches?2:1.5));paintObjects();painted=now;canvas.dataset.phase=time.toFixed(2);meterFrames++;}
    if(now-meterStart>2000){canvas.dataset.fps=String(Math.round(meterFrames*1000/(now-meterStart)));meterFrames=0;meterStart=now;}
    frame=requestAnimationFrame(tick);
  }
  function wake(){if(!frame&&!document.hidden){last=performance.now();frame=requestAnimationFrame(tick);}}
  function disturb(event){
    if(reduce.matches||performance.now()-lastTouch<180)return;lastTouch=performance.now();
    ripples[rippleIndex]=[event.clientX,event.clientY,time,event.pointerType==='touch'?1.3:.75];rippleIndex=(rippleIndex+1)%4;
  }
  const labels={
    pl:['← Rzeka','Laguna','Zachód słońca','Noc','Kolor wody'],en:['← River','Lagoon','Sunset','Night','Water colour'],de:['← Fluss','Lagune','Sonnenuntergang','Nacht','Wasserfarbe'],fr:['← Rivière','Lagon','Coucher de soleil','Nuit','Couleur de l’eau'],es:['← Río','Laguna','Atardecer','Noche','Color del agua'],it:['← Fiume','Laguna','Tramonto','Notte','Colore dell’acqua'],pt:['← Rio','Lagoa','Pôr do sol','Noite','Cor da água'],ar:['← النهر','بحيرة','غروب','ليل','لون الماء'],ja:['← 川','ラグーン','夕日','夜','水の色'],zh:['← 河流','潟湖','日落','夜色','水的颜色']
  };
  window.BangingoLanguage.subscribe(({locale})=>{
    const text=labels[locale]||labels.en;document.querySelector('[data-water-label=back]').textContent=text[0];document.querySelector('.water-studio').setAttribute('aria-label',text[4]);
    ['lagoon','sunset','midnight'].forEach((key,i)=>{const button=document.querySelector('[data-water-mode='+key+']');button.setAttribute('aria-label',text[i+1]);button.title=text[i+1];});
    requestAnimationFrame(measure);
  });
  document.querySelectorAll('[data-water-mode]').forEach(button=>button.addEventListener('click',()=>{
    mode=button.dataset.waterMode;canvas.dataset.mode=mode;
    document.querySelectorAll('[data-water-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));wake();
  }));
  canvas.dataset.mode='auto';canvas.dataset.material='loading';
  textureImage.onload=()=>{setup();measure();};textureImage.onerror=()=>{canvas.dataset.material='fallback';wake();};
  atlas.onload=wake;yacht.onload=wake;foam.onload=wake;
  textureImage.src='assets/water-world-surface.webp';atlas.src='assets/water-world-objects.webp';yacht.src='assets/river-yacht.webp';foam.src='assets/atelier-wake.webp';
  addEventListener('resize',measure,{passive:true});addEventListener('pointermove',disturb,{passive:true});addEventListener('pointerdown',disturb,{passive:true});
  addEventListener('scroll',()=>{ripples.forEach(r=>r[2]=-100);wake();},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&frame){cancelAnimationFrame(frame);frame=0;}else wake();});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();ready=false;canvas.style.visibility='hidden';canvas.dataset.renderer='css-fallback';});
  canvas.addEventListener('webglcontextrestored',()=>{canvas.style.visibility='';setup();measure();});
  new ResizeObserver(measure).observe(document.querySelector('main'));
  document.fonts.ready.then(measure);measure();wake();
})();
