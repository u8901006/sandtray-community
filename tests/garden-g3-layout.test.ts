import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {inTrayFocus,builtGround,plantedTrunks,GATE,BAMBOO_GROVE,PAGODA,POND_TORO,FINIAL_POSTS,LILY_ZONE,KOI_ZONE,WATER_Y,POND,POND_MIRROR,BRIDGE_POSTS,BRIDGE_WALK,TRAYS,LANTERNS,GARDEN_STOPS,PAVILION_POSTS,MOOD_SUN,VISIBLE_SUN,sunVector,azimuthOf,elevationOf,gardenFloor} from '../apps/web/src/garden-layout';
import {gardenStops,gardenFloor as navigationFloor} from '../apps/web/src/garden-navigation';
import {LANTERNS as extrasLanterns,BEAM_SUNS} from '../apps/web/src/garden-extras';
                                                                                    
function glbPositions(file:string,nodeName:string){
 const b=readFileSync(file),view=new DataView(b.buffer,b.byteOffset,b.byteLength),len=view.getUint32(12,true),j=JSON.parse(new TextDecoder().decode(b.subarray(20,20+len))),bin=20+len+8;
 const f=(o:number)=>view.getFloat32(bin+o,true);
 const node=j.nodes.find((n:any)=>n.name===nodeName),t=node.translation??[0,0,0];expect(node.rotation).toBeUndefined();expect(node.scale).toBeUndefined();
 const out:[number,number,number][]=[];
 for(const p of j.meshes[node.mesh].primitives){const a=j.accessors[p.attributes.POSITION],v=j.bufferViews[a.bufferView],stride=v.byteStride??12;
  for(let i=0;i<a.count;i++){const o=(v.byteOffset??0)+(a.byteOffset??0)+i*stride;out.push([f(o)+t[0],f(o+4)+t[1],f(o+8)+t[2]]);}}
 return out;
}
describe('single source of garden coordinates',()=>{
 it('keeps the values the other files used to hard-code',()=>{
  expect(POND_MIRROR).toEqual({x:-23,y:-.697,z:10,radiusX:11.5,radiusZ:8.5});expect(POND_MIRROR.x).toBe(POND.x);
  expect(TRAYS).toEqual({halfX:10.85,halfZ:4.21});expect(BRIDGE_WALK).toEqual({minX:-35,maxX:-10.8,z:10,halfWidth:1.3});
  expect(PAVILION_POSTS.length).toBe(6);expect(LANTERNS.length).toBe(8);expect(extrasLanterns).toBe(LANTERNS);
  expect(gardenStops).toBe(GARDEN_STOPS);expect(navigationFloor).toBe(gardenFloor);
  expect(MOOD_SUN).toEqual({day:[24,38,12],sunset:[-35,12,18],evening:[-25,4,-25]});expect(BEAM_SUNS).toEqual([MOOD_SUN.day,MOOD_SUN.sunset]);
 });
 it('bridge posts match the posts in the shipped garden GLB (Weathered_Cedar)',()=>{
  const cedar=glbPositions('apps/web/public/environments/garden-v3/garden-low.glb','Garden_Weathered_Cedar');
  expect(BRIDGE_POSTS.length).toBe(18);
  for(const post of BRIDGE_POSTS){const near=cedar.filter(([x,,z])=>Math.hypot(x-post.x,z-post.z)<.12);expect(near.length,`${post.x},${post.z}`).toBeGreaterThan(0);
   const top=Math.max(...near.map(v=>v[1]));expect(Math.abs(top-post.top),`${post.x},${post.z} top ${top}`).toBeLessThan(.08);}
 });
});
describe('sun directions',()=>{
 it('azimuth and elevation round-trip',()=>{for(const [a,e] of [[0,10],[45,30],[-120,8],[170,60]]){const v=sunVector(a,e);expect(azimuthOf(v)).toBeCloseTo(a,9);expect(elevationOf(v)).toBeCloseTo(e,9);}});
 it('only the visible sunset sun drops to 8 degrees, on the light\'s own azimuth; the light keeps lighting the trays as before',()=>{
  expect(elevationOf(MOOD_SUN.sunset)).toBeGreaterThan(15);expect(elevationOf(VISIBLE_SUN.sunset)).toBeCloseTo(8,9);expect(azimuthOf(VISIBLE_SUN.sunset)).toBeCloseTo(azimuthOf(MOOD_SUN.sunset),9);
  expect(VISIBLE_SUN.day).toBe(MOOD_SUN.day);expect(VISIBLE_SUN.evening).toBe(MOOD_SUN.evening);
                                                                                                               
  const yaw=GARDEN_STOPS.water.yaw*180/Math.PI,off=((azimuthOf(VISIBLE_SUN.sunset)-yaw+540)%360)-180;expect(Math.abs(off)).toBeLessThan(31);expect(elevationOf(VISIBLE_SUN.sunset)).toBeLessThan(21);
 });
});
describe('G3 sites',()=>{
 const pondR=(x:number,z:number)=>Math.hypot((x-POND.x)/POND.radiusX,(z-POND.z)/POND.radiusZ);
 it('gate, bamboo grove, pagoda and pond lanterns sit outside the sandtray focus and off built ground',()=>{
  for(let dx=-GATE.width/2;dx<=GATE.width/2;dx+=.5)expect(inTrayFocus(GATE.x+dx,GATE.z)||builtGround(GATE.x+dx,GATE.z)).toBe(false);
  for(let x=BAMBOO_GROVE.minX;x<=BAMBOO_GROVE.maxX;x+=.5)for(let z=BAMBOO_GROVE.minZ;z<=BAMBOO_GROVE.maxZ;z+=.5)expect(inTrayFocus(x,z)||builtGround(x,z),`${x},${z}`).toBe(false);
  expect(Math.hypot(PAGODA.x,PAGODA.z)).toBeGreaterThan(80);expect(Math.hypot(PAGODA.x,PAGODA.z)).toBeLessThan(108);
  for(const [x,z] of POND_TORO){expect(inTrayFocus(x,z)).toBe(false);expect(pondR(x,z)).toBeGreaterThan(1.05);expect(pondR(x,z)).toBeLessThan(1.3);
   for(const [lx,,lz] of LANTERNS)expect(Math.hypot(x-lx,z-lz)).toBeGreaterThan(5);}
  for(const t of plantedTrunks()){expect(Math.hypot(t.x-GATE.x,t.z-GATE.z),'gate').toBeGreaterThan(GATE.width/2+.5);for(const [x,z] of POND_TORO)expect(Math.hypot(t.x-x,t.z-z)).toBeGreaterThan(1);}
 });
 it('finials only on bridge posts outside the focus; lily and koi zones inside the pond',()=>{
  expect(FINIAL_POSTS.length).toBe(14);for(const p of FINIAL_POSTS)expect(inTrayFocus(p.x,p.z)).toBe(false);
  expect(LILY_ZONE.maxR).toBeLessThan(1);expect(KOI_ZONE.maxR).toBeLessThan(1);expect(WATER_Y).toBe(POND_MIRROR.y);
 });
});
