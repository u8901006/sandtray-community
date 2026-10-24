import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {BufferGeometry,DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {finialGeometry,finialBandGeometry,finialMatrices,FINIAL_SINK,toroParts,toroPlacements,toroColliders,toroLocal,TORO_BASE_RADIUS,TORO_GLOW,glowIntensity,cloneGlowMaterial} from '../apps/web/src/garden-bridge-details';
import {FINIAL_POSTS,BRIDGE_POSTS,POND_TORO,gardenFloor,inTrayFocus} from '../apps/web/src/garden-layout';
import {createPaletteMaterial} from '../apps/web/src/garden-materials';
import {createFogUniforms} from '../apps/web/src/garden-shaders';
                                                                               
const tris=(g:BufferGeometry)=>(g.index?g.index.count:g.getAttribute('position').count)/3;
const finite=(g:BufferGeometry)=>{for(const name of ['position','normal']){const a=g.getAttribute(name);expect(a,name).toBeTruthy();for(let i=0;i<a.array.length;i++)if(!Number.isFinite(a.array[i]))return false;}return true;};
const box=(g:BufferGeometry)=>{g.computeBoundingBox();return g.boundingBox!.clone();};
describe('bronze finials (擬寶珠)',()=>{
 it('one per rail post outside the sandtray focus, seated on the post top',()=>{
  const m=finialMatrices();expect(FINIAL_POSTS.length).toBe(14);expect(m.length).toBe(FINIAL_POSTS.length);
  expect(BRIDGE_POSTS.length-FINIAL_POSTS.length).toBe(4);                                           
  const b=box(finialGeometry());
  m.forEach((matrix,i)=>{const p=FINIAL_POSTS[i],o=new Vector3().setFromMatrixPosition(matrix);
   expect(o.x).toBeCloseTo(p.x,6);expect(o.z).toBeCloseTo(p.z,6);expect(inTrayFocus(o.x,o.z)).toBe(false);
   const base=o.y+b.min.y;expect(Math.abs(base-p.top)).toBeLessThan(.02);expect(base).toBeLessThan(p.top);                               
  });
  expect(FINIAL_SINK).toBeGreaterThan(0);expect(FINIAL_SINK).toBeLessThan(.02);
 });
 it('about 0.16 m wide and 0.32 m tall, collar wider than the 0.065 m post, under 400 triangles',()=>{
  const g=finialGeometry(),b=box(g),s=b.getSize(new Vector3());
  expect(s.x).toBeGreaterThan(.13);expect(s.x).toBeLessThan(.19);expect(s.z).toBeGreaterThan(.13);expect(s.z).toBeLessThan(.19);
  expect(s.y).toBeGreaterThan(.28);expect(s.y).toBeLessThan(.36);expect(b.min.y).toBeCloseTo(0,6);
                                                   
  const p=g.getAttribute('position');let baseR=0;for(let i=0;i<p.count;i++)if(p.getY(i)<.03)baseR=Math.max(baseR,Math.hypot(p.getX(i),p.getZ(i)));expect(baseR).toBeGreaterThan(.065);
  expect(tris(g)).toBeLessThan(400);expect(finite(g)).toBe(true);
  const band=finialBandGeometry();expect(tris(band)).toBeLessThan(100);expect(finite(band)).toBe(true);
 });
});
describe('kasuga stone lanterns (春日石燈籠)',()=>{
 it('both pond-bank spots used, on the floor, outside the sandtray focus',()=>{
  const ps=toroPlacements();expect(ps.length).toBe(2);expect(POND_TORO.length).toBe(2);
  ps.forEach((p,i)=>{expect([p.x,p.z]).toEqual([...POND_TORO[i]]);expect(Math.abs(p.y-gardenFloor(p.x,p.z))).toBeLessThan(.05);
   for(let a=0;a<12;a++)expect(inTrayFocus(p.x+Math.cos(a)*.7,p.z+Math.sin(a)*.7)).toBe(false);});
  const cs=toroColliders();expect(cs.length).toBe(2);cs.forEach((c,i)=>{expect(c.x).toBe(ps[i].x);expect(c.z).toBe(ps[i].z);expect(c.radius).toBeGreaterThanOrEqual(TORO_BASE_RADIUS);expect(c.radius).toBeLessThan(1);});
 });
 it('2.0 to 2.3 m tall above the floor, base sunk under the whole footprint so nothing floats',()=>{
  const [granite]=toroParts();const pos=granite.geometry.getAttribute('position');
  for(const p of toroPlacements()){let top=-Infinity,low=Infinity;
   for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);if(Math.hypot(x-p.x,z-p.z)>1)continue;top=Math.max(top,pos.getY(i));low=Math.min(low,pos.getY(i));}
   expect(top-p.y).toBeGreaterThan(2.0);expect(top-p.y).toBeLessThan(2.3);
                                                                                                                       
   for(let a=0;a<6;a++){const th=a*Math.PI/3+p.yaw;expect(low).toBeLessThan(gardenFloor(p.x+Math.sin(th)*TORO_BASE_RADIUS,p.z+Math.cos(th)*TORO_BASE_RADIUS));}
   expect(p.y-low).toBeLessThan(.2);}
 });
 it('merged per material: one granite and one window-glow geometry; glow sits inside the firebox, under the roof',()=>{
  const parts=toroParts();expect(parts.map(p=>p.material)).toEqual(['granite','lanternGlow']);
  const glow=parts[1].geometry,pos=glow.getAttribute('position');expect(pos.count).toBeGreaterThan(0);
  for(const p of toroPlacements()){let n=0;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);if(Math.hypot(x-p.x,z-p.z)>1)continue;n++;
   const y=pos.getY(i)-p.y;expect(y).toBeGreaterThan(1.2);expect(y).toBeLessThan(1.65);expect(Math.hypot(x-p.x,z-p.z)).toBeLessThan(.25);}
   expect(n).toBeGreaterThan(0);}                                 
  for(const p of parts)expect(finite(p.geometry)).toBe(true);
 });
 it('the firebox has open windows: corner posts with gaps where the glow core shows',()=>{
  const {granite}=toroLocal();const stone=new Mesh(mergeGeometries(granite,false)!,new MeshBasicMaterial({side:DoubleSide}));
  const cast=(th:number,y:number)=>{const ray=new Raycaster(new Vector3(Math.sin(th)*.21,y,Math.cos(th)*.21),new Vector3(Math.sin(th),0,Math.cos(th)),0,.5);return ray.intersectObject(stone).length;};
  for(let k=0;k<6;k++){const face=k*Math.PI/3+Math.PI/6,corner=k*Math.PI/3;
   for(const y of [1.32,1.42,1.52]){expect(cast(face,y),`window ${k} ${y}`).toBe(0);expect(cast(corner,y),`post ${k} ${y}`).toBeGreaterThan(0);}}
                                                   
  expect(cast(Math.PI/6,1.25)).toBeGreaterThan(0);expect(cast(Math.PI/6,1.6)).toBeGreaterThan(0);
 });
 it('each lantern under 1500 triangles; positions and normals finite',()=>{
  const {granite,glow}=toroLocal();const n=[...granite,...glow].reduce((s,g)=>s+tris(g),0);expect(n).toBeLessThan(1500);expect(n).toBeGreaterThan(200);
  const parts=toroParts();const total=parts.reduce((s,p)=>s+tris(p.geometry),0);expect(total).toBe(n*2);
  for(const g of [...granite,...glow])expect(finite(g)).toBe(true);
 });
 it('the roof corners turn up: a corner of the eave is higher than the middle of an edge',()=>{
  const {granite}=toroLocal();const roof=granite.find(g=>{const b=box(g);return b.max.x-b.min.x>1&&b.max.y>1.9;})!;expect(roof).toBeTruthy();
  const pos=roof.getAttribute('position');let corner=-Infinity,edge=-Infinity;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),r=Math.hypot(x,z);if(r<.5)continue;const th=Math.atan2(x,z),c=Math.abs(Math.cos(3*th));
   if(c>.99)corner=Math.max(corner,pos.getY(i));else if(c<.01)edge=Math.max(edge,pos.getY(i));}
  expect(corner-edge).toBeGreaterThan(.05);
 });
});
describe('lantern glow',()=>{
 it('glowIntensity follows lit',()=>{expect(glowIntensity(true)).toBe(TORO_GLOW);expect(TORO_GLOW).toBeGreaterThan(1);expect(TORO_GLOW).toBeLessThan(2.5);expect(glowIntensity(false)).toBe(0);});
 it('the clone is lit, keeps the fog patch, and the shared material stays at 0',()=>{
  const shared=createPaletteMaterial('lanternGlow',createFogUniforms());expect(shared.emissiveIntensity).toBe(0);
  const lit=cloneGlowMaterial(shared,true),dark=cloneGlowMaterial(shared,false);
  expect(lit).not.toBe(shared);expect(lit.emissiveIntensity).toBe(TORO_GLOW);expect(dark.emissiveIntensity).toBe(0);expect(shared.emissiveIntensity).toBe(0);
  expect(lit.emissive.getHex()).toBe(shared.emissive.getHex());expect(lit.onBeforeCompile).toBe(shared.onBeforeCompile);expect(lit.customProgramCacheKey()).toBe(shared.customProgramCacheKey());
  lit.dispose();dark.dispose();shared.dispose();
 });
 it('the component clones the glow material and never writes the shared one',()=>{
  const src=BridgeSource();expect(src).toContain('cloneGlowMaterial(materials.get(\'lanternGlow\')');expect(src).toContain('glow.dispose()');
  expect(src).not.toMatch(/materials\.get\('lanternGlow'\)\.emissiveIntensity/);expect(src).not.toMatch(/materials\.dispose|\.get\([^)]*\)\.dispose/);
 });
});
const BridgeSource=()=>readFileSync(new URL('../apps/web/src/garden-bridge-details.tsx',import.meta.url),'utf8');
