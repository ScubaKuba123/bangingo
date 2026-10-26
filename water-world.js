(() => {
  'use strict';
  const canvas=document.querySelector('#water-surface');
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,powerPreference:'low-power'});
  const reduce=matchMedia('(prefers-reduced-motion:reduce)'),mobile=matchMedia('(max-width:680px)');
  const textureImage=new Image();
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
  // Document-relative depth remains consistent after translation and on mobile.
  const depthStops=[
    {at:0,deep:[.018,.12,.17],light:[.16,.57,.55],sun:[.94,.98,1]},
    {at:.28,deep:[.014,.10,.16],light:[.07,.34,.41],sun:[.92,.96,1]},
    {at:.62,deep:[.011,.055,.11],light:[.045,.20,.31],sun:[.83,.92,1]},
    {at:1,deep:[.009,.024,.052],light:[.025,.09,.17],sun:[.75,.85,1]}
  ];
  const palettes={
    lagoon:{deep:[.012,.14,.20],light:[.12,.66,.63],sun:[1,.95,.79]},
    sunset:{deep:[.075,.07,.13],light:[.45,.32,.36],sun:[1,.74,.45]},
    midnight:{deep:[.008,.037,.10],light:[.07,.24,.37],sun:[.79,.88,1]}
  };
  let w=1,h=1,dpr=1,time=0,frame=0,last=0,painted=0,mode='auto',maxScroll=1,ready=false;
  let depth=0,depthTarget=0,meterStart=0,meterFrames=0,lastTouch=0,rippleIndex=0;
  let colours={deep:[...depthStops[0].deep],light:[...depthStops[0].light],sun:[...depthStops[0].sun]};
  const ripples=Array.from({length:3},()=>[-1000,-1000,-100,0]);
  let program,uniforms={};
  const vertex="attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}";
  const fragment=`precision highp float;
  varying vec2 uv;
  uniform vec2 resolution;
  uniform float time,depth,scroll;
  uniform sampler2D surface;
  uniform vec3 deep,light,sun;
  uniform vec4 ripple0,ripple1,ripple2;
  vec2 mirror(vec2 p){return 1.-abs(mod(p,2.)-1.);}
  float luminance(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
  // Analytic wave derivatives produce normals instead of translating painted highlights.
  vec3 wave(vec2 p,vec2 direction,float frequency,float amplitude,float phase){
    float angle=dot(p,direction)*frequency-sqrt(9.81*frequency)*time*.32+phase;
    float slope=cos(angle)*amplitude*frequency;
    return vec3(sin(angle)*amplitude,direction*slope);
  }
  vec3 swell(vec2 p){
    vec3 s=wave(p,vec2(.80,-.60),2.13,.047,1.3);
    s+=wave(p,vec2(.38,-.925),3.71,.029,2.6);
    s+=wave(p,vec2(.64,-.768),6.23,.017,4.1);
    s+=wave(p,vec2(-.31,-.951),10.93,.009,1.8);
    s+=wave(p,vec2(.92,-.392),18.57,.0046,5.4);
    s+=wave(p,vec2(.13,-.992),31.17,.0021,3.2);
    s+=wave(p,vec2(-.67,-.742),53.43,.0009,6.1);
    return s;
  }
  vec2 touch(vec2 screen,vec4 ripple){
    float age=time-ripple.z;
    vec2 delta=screen-ripple.xy;
    float distance=length(delta),front=distance-age*44.;
    float envelope=exp(-front*front/650.)*exp(-age*.95)*step(0.,age)*step(age,4.5);
    return delta/max(distance,1.)*cos(front*.11)*envelope*.07*ripple.w;
  }
  void main(){
    vec2 screen=vec2(uv.x,1.-uv.y)*resolution;
    // Wave size remains stable in CSS pixels, including high-density mobile screens.
    vec2 p=screen/205.+vec2(0.,scroll*.00016);
    vec3 waves=swell(p);
    float scale=max(resolution.x,resolution.y)/.87;
    vec2 materialUV=screen/scale+vec2(.045,.055);
    materialUV+=vec2(sin(scroll*.00007),cos(scroll*.00005))*.025;
    materialUV+=waves.yz*.012;
    // Two overlapping flow phases avoid a hard reset or travelling mirror seams.
    float cycle=fract(time*.025),second=fract(cycle+.5),blend=abs(cycle*2.-1.);
    vec2 flow=vec2(.018,-.029);
    vec2 firstUV=materialUV-flow*(cycle-.5),secondUV=materialUV-flow*(second-.5);
    vec3 photo=mix(texture2D(surface,mirror(firstUV)).rgb,texture2D(surface,mirror(secondUV)).rgb,blend);
    float detail=luminance(photo),epsilon=.0016;
    float dx=luminance(texture2D(surface,mirror(firstUV+vec2(epsilon,0.))).rgb)-luminance(texture2D(surface,mirror(firstUV-vec2(epsilon,0.))).rgb);
    float dy=luminance(texture2D(surface,mirror(firstUV+vec2(0.,epsilon))).rgb)-luminance(texture2D(surface,mirror(firstUV-vec2(0.,epsilon))).rgb);
    vec2 slope=waves.yz+vec2(dx,dy)*.48*(1.-blend);
    slope+=touch(screen,ripple0)+touch(screen,ripple1)+touch(screen,ripple2);
    vec3 normal=normalize(vec3(-slope,1.));
    vec3 view=normalize(vec3(0.,.20,1.)),lightDirection=normalize(vec3(-.30,-.38,1.));
    vec3 halfVector=normalize(view+lightDirection);
    float ndv=max(dot(normal,view),0.);
    float fresnel=.0204+.9796*pow(1.-ndv,5.);
    float roughHighlight=pow(max(dot(normal,halfVector),0.),36.);
    float sunHighlight=pow(max(dot(normal,halfVector),0.),230.);
    float bodyLight=clamp(.10+detail*.95+waves.x*.38,.08,.90);
    vec3 colour=mix(deep,light,bodyLight);
    colour*=.91+dot(normal,lightDirection)*.09;
    vec3 reflectedSky=mix(vec3(.24,.39,.47),vec3(.77,.86,.88),clamp(normal.y*.65+.45,0.,1.));
    colour=mix(colour,reflectedSky,fresnel*1.5);
    float sunPath=exp(-pow((uv.x-.57+waves.x*.15)/.46,2.));
    float textureBreakup=.32+smoothstep(.18,.64,detail)*.68;
    colour+=sun*(sunHighlight*.29+roughHighlight*.026)*sunPath*textureBreakup*mix(1.,.36,depth);
    // Refracted fine detail fades with depth instead of resembling foam everywhere.
    colour+=light*pow(smoothstep(.36,.76,detail),2.)*.13*(1.-depth);
    colour*=mix(.73,1.,smoothstep(.02,.62,uv.x));
    gl_FragColor=vec4(colour,1.);
  }`;
  function compile(type,source){
    const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  function fallback(){
    ready=false;canvas.style.visibility='hidden';canvas.dataset.renderer='css-fallback';canvas.dataset.material='fallback';
    document.body.classList.add('water-fallback');
  }
  function setup(){
    if(!gl){fallback();return;}
    try{
      program=gl.createProgram();
      const shaders=[compile(gl.VERTEX_SHADER,vertex),compile(gl.FRAGMENT_SHADER,fragment)];
      shaders.forEach(shader=>gl.attachShader(program,shader));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
      shaders.forEach(shader=>gl.deleteShader(shader));gl.useProgram(program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      for(const key of ['resolution','time','depth','scroll','surface','deep','light','sun','ripple0','ripple1','ripple2'])uniforms[key]=gl.getUniformLocation(program,key);
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,textureImage);
      ready=true;canvas.style.visibility='';document.body.classList.remove('water-fallback');
      canvas.dataset.renderer='webgl';canvas.dataset.material='ready';canvas.dataset.waveModel='directional-spectrum-v2';
    }catch(error){fallback();console.warn('Water surface: using photographic fallback.',error.message);}
  }
  function measure(){
    w=document.documentElement.clientWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,mobile.matches?1.5:1.75);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    if(gl)gl.viewport(0,0,canvas.width,canvas.height);
    maxScroll=Math.max(1,document.documentElement.scrollHeight-h);
    canvas.dataset.viewport=w+'x'+h;canvas.dataset.pixelRatio=dpr.toFixed(2);wake();
  }
  function targetColour(){
    if(mode!=='auto'){
      const tint=palettes[mode],absorption=mix(1.,.44,depth);
      return{deep:tint.deep.map(v=>v*absorption),light:tint.light.map(v=>v*absorption),sun:tint.sun};
    }
    let index=0;
    while(index<depthStops.length-2&&depth>depthStops[index+1].at)index++;
    const a=depthStops[index],b=depthStops[index+1],t=clamp((depth-a.at)/(b.at-a.at),0,1),smooth=t*t*(3-2*t);
    return Object.fromEntries(['deep','light','sun'].map(key=>[key,a[key].map((v,i)=>mix(v,b[key][i],smooth))]));
  }
  function paintSurface(dt){
    depthTarget=clamp(scrollY/maxScroll,0,1);depth=mix(depth,depthTarget,1-Math.exp(-dt/1.05));
    const target=targetColour(),blend=1-Math.exp(-dt/.65);
    for(const key of ['deep','light','sun'])colours[key]=colours[key].map((v,i)=>mix(v,target[key][i],blend));
    const tint=colours.deep.map((v,i)=>Math.round(mix(v,colours.light[i],.5)*255)).join(',');
    document.body.style.setProperty('--depth-tint','rgb('+tint+')');
    document.body.style.setProperty('--depth-shade',(.08+depth*.58).toFixed(3));
    canvas.dataset.depth=depth.toFixed(3);canvas.dataset.depthTarget=depthTarget.toFixed(3);
    canvas.dataset.colour=mode==='auto'?(depth<.28?'turquoise':depth<.62?'ocean-blue':'deep-blue'):mode;
    canvas.dataset.colourRgb=tint;
    if(!ready)return;
    gl.uniform2f(uniforms.resolution,w,h);gl.uniform1f(uniforms.time,time);gl.uniform1f(uniforms.scroll,scrollY);gl.uniform1f(uniforms.depth,depth);
    for(const key of ['deep','light','sun'])gl.uniform3fv(uniforms[key],colours[key]);
    for(let i=0;i<3;i++)gl.uniform4fv(uniforms['ripple'+i],ripples[i]);
    gl.uniform1i(uniforms.surface,0);gl.drawArrays(gl.TRIANGLES,0,6);
  }
  function tick(now){
    frame=0;if(document.hidden)return;
    const dt=Math.min(.06,(now-last)/1000||1/60);last=now;time+=dt*(reduce.matches?.28:1);
    const interval=mobile.matches?1000/30:1000/60,elapsed=now-painted;
    if(elapsed>=interval-.5){
      paintSurface(Math.min(.1,elapsed/1000));painted=now-(elapsed%interval);
      canvas.dataset.phase=time.toFixed(2);meterFrames++;
    }
    if(now-meterStart>2000){canvas.dataset.fps=String(Math.round(meterFrames*1000/(now-meterStart)));meterFrames=0;meterStart=now;}
    frame=requestAnimationFrame(tick);
  }
  function wake(){if(!frame&&!document.hidden){last=performance.now();painted=last;meterStart=last;meterFrames=0;frame=requestAnimationFrame(tick);}}
  function disturb(event){
    if(reduce.matches||performance.now()-lastTouch<220)return;lastTouch=performance.now();
    ripples[rippleIndex]=[event.clientX,event.clientY,time,event.pointerType==='touch'?.7:.35];rippleIndex=(rippleIndex+1)%3;
  }
  const labels={
    pl:['← Rzeka','Laguna','Zachód słońca','Noc','Kolor wody','Głębia'],en:['← River','Lagoon','Sunset','Night','Water colour','Depth'],de:['← Fluss','Lagune','Sonnenuntergang','Nacht','Wasserfarbe','Tiefe'],fr:['← Rivière','Lagon','Coucher de soleil','Nuit','Couleur de l’eau','Profondeur'],es:['← Río','Laguna','Atardecer','Noche','Color del agua','Profundidad'],it:['← Fiume','Laguna','Tramonto','Notte','Colore dell’acqua','Profondità'],pt:['← Rio','Lagoa','Pôr do sol','Noite','Cor da água','Profundidade'],ar:['← النهر','بحيرة','غروب','ليل','لون الماء','العمق'],ja:['← 川','ラグーン','夕日','夜','水の色','深さ'],zh:['← 河流','潟湖','日落','夜色','水的颜色','深度']
  };
  window.BangingoLanguage.subscribe(({locale})=>{
    const text=labels[locale]||labels.en;
    document.querySelector('[data-water-label=back]').textContent=text[0];document.querySelector('.water-studio').setAttribute('aria-label',text[4]);
    document.querySelector('[data-water-mode=auto]').textContent=text[5];
    ['lagoon','sunset','midnight'].forEach((key,i)=>{const button=document.querySelector('[data-water-mode='+key+']');button.setAttribute('aria-label',text[i+1]);button.title=text[i+1];});
    requestAnimationFrame(measure);
  });
  document.querySelectorAll('[data-water-mode]').forEach(button=>button.addEventListener('click',()=>{
    mode=button.dataset.waterMode;canvas.dataset.mode=mode;
    document.querySelectorAll('[data-water-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));wake();
  }));
  canvas.dataset.mode='auto';canvas.dataset.material='loading';canvas.dataset.objects='none';
  textureImage.onload=()=>{setup();measure();};textureImage.onerror=()=>{fallback();wake();};textureImage.src='assets/water-world-surface.webp';
  addEventListener('resize',measure,{passive:true});addEventListener('pointermove',disturb,{passive:true});addEventListener('pointerdown',disturb,{passive:true});
  addEventListener('scroll',()=>{ripples.forEach(r=>r[2]=-100);wake();},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&frame){cancelAnimationFrame(frame);frame=0;}else wake();});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fallback();});
  canvas.addEventListener('webglcontextrestored',()=>{setup();measure();});
  new ResizeObserver(measure).observe(document.querySelector('main'));
  document.fonts.ready.then(measure);measure();depth=clamp(scrollY/maxScroll,0,1);wake();
})();
