const test=require('node:test');
const assert=require('node:assert/strict');
const nav=require('../river-navigation.js');
const hull=nav.hull(124,49);

function assertOnWater(pose,water){
  assert.ok(pose,'a safe pose must exist');
  for(const point of nav.rotatedHull(hull,pose.angle)){
    const cross=water(pose.y+point.y),x=pose.x+point.x;
    assert.ok(x>=cross.x-cross.width/2+4.99,'port side stays inside the water');
    assert.ok(x<=cross.x+cross.width/2-4.99,'starboard side stays inside the water');
  }
}

test('The whole yacht fits through both directions of a mobile S-bend',()=>{
  const water=y=>({x:180+42*Math.sin(y/125),width:94+17*Math.cos(y/125)**2});
  for(let y=-500;y<1800;y+=4){
    const angle=Math.atan2(water(y+50).x-water(y-50).x,100);
    assertOnWater(nav.pose({y,x:water(y).x,angle,points:hull,water}),water);
  }
});

test('Approaching an attraction stops before the bank and foreground content',()=>{
  const water=()=>({x:300,width:190}),obstacles=[{top:0,bottom:500,left:370,right:600,side:1}];
  const pose=nav.pose({y:250,x:390,angle:.16,points:hull,water,obstacles});
  assertOnWater(pose,water);assert.ok(pose.x>300,'the yacht approaches the requested bank');
  for(const point of nav.rotatedHull(hull,pose.angle))assert.ok(pose.x+point.x<=362.001,'the entire hull clears the card');
});

test('An unnavigable channel is rejected instead of placing the hull on shore',()=>{
  assert.equal(nav.pose({y:200,x:100,angle:0,points:hull,water:()=>({x:100,width:25})}),null);
});

test('Steering smoothing has the same response at 30, 60 and 120 fps',()=>{
  const responses=[30,60,120].map(fps=>{let value=-.5;for(let i=0;i<fps;i++)value=nav.ease(value,.7,1/fps,.12);return value;});
  assert.ok(Math.max(...responses)-Math.min(...responses)<1e-10);
});
