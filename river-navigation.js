(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.BangingoRiverNavigation=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
  const ease=(value,target,dt,time)=>value+(target-value)*(1-Math.exp(-dt/time));
  // Conservative cross-sections of the actual yacht: rounded stern, tapered bow.
  function hull(length,beam){
    const sections=[[-.48,.34],[-.4,.45],[-.3,.49],[-.15,.5],[0,.48],[.15,.4],[.3,.28],[.4,.16],[.49,.025]];
    return sections.flatMap(([forward,half])=>[-1,1].map(side=>({x:side*beam*half,y:forward*length})));
  }
  function rotatedHull(points,angle){
    const sin=Math.sin(angle),cos=Math.cos(angle);
    return points.map(p=>({x:p.x*cos+p.y*sin,y:p.y*cos-p.x*sin}));
  }
  function corridor(y,angle,points,water,obstacles=[]){
    let low=-Infinity,high=Infinity;
    for(const p of rotatedHull(points,angle)){
      const worldY=y+p.y,channel=water(worldY),margin=Math.max(5,channel.width*.105);
      low=Math.max(low,channel.x-channel.width/2+margin-p.x);
      high=Math.min(high,channel.x+channel.width/2-margin-p.x);
      for(const item of obstacles){
        if(worldY<item.top-8||worldY>item.bottom+8)continue;
        if(item.side<0)low=Math.max(low,item.right+8-p.x);
        else high=Math.min(high,item.left-8-p.x);
      }
    }
    return{low,high};
  }
  function pose({y,x,angle,points,water,obstacles=[]}){
    let best=null;
    // The previous smooth heading is preferred; only small corrections are allowed.
    for(const delta of [0,-.04,.04,-.09,.09,-.16,.16,-.24,.24]){
      const heading=angle+delta,limits=corridor(y,heading,points,water,obstacles);
      if(limits.low>limits.high)continue;
      const fittedX=clamp(x,limits.low,limits.high),score=(fittedX-x)**2+delta**2*4500;
      if(!best||score<best.score)best={x:fittedX,y,angle:heading,score,clearance:Math.min(fittedX-limits.low,limits.high-fittedX)};
    }
    return best;
  }
  function bounds(pose,points){
    const outline=rotatedHull(points,pose.angle);
    const left=Math.min(...outline.map(p=>p.x)),right=Math.max(...outline.map(p=>p.x));
    const top=Math.min(...outline.map(p=>p.y)),bottom=Math.max(...outline.map(p=>p.y));
    return{x:pose.x+left,y:pose.y+top,width:right-left,height:bottom-top};
  }
  return{clamp,ease,hull,rotatedHull,corridor,pose,bounds};
});
