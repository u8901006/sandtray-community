import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {Box3,BufferGeometry,InstancedMesh,Mesh,Vector3} from 'three';
import {gateParts,gateColliders,gateBase,postGround,GATE_SPEC,growGrove,bambooCulms,bambooColliders,BAMBOO_COUNT,BAMBOO_LIMITS,culmMatrix,culmGeometry,nodeRingGeometry,leafClusterGeometry,leafMatrices,pagodaGeometry,buildLandmarks} from '../apps/web/src/garden-landmarks';
import {GATE,BAMBOO_GROVE,PAGODA,gardenFloor,inTrayFocus,builtGround,plantedTrunks} from '../apps/web/src/garden-layout';
import {createGardenMaterials} from '../apps/web/src/garden-materials';
import {createFogUniforms} from '../apps/web/src/garden-shaders';
                                                                         
const tiers=['low','high','cinema'] as const;
const bounds=(list:BufferGeometry[])=>{const b=new Box3();for(const g of list){g.computeBoundingBox();b.union(g.boundingBox!);}return b;};
const triangles=(g:BufferGeometry)=>(g.index?g.index.count:g.getAttribute('position').count)/3;
function expectSane(g:BufferGeometry,label:string){
 const p=g.getAttribute('position'),n=g.getAttribute('normal');expect(p.count,label).toBeGreaterThan(0);expect(n.count,label).toBe(p.count);
 for(let i=0;i<p.count;i++){for(const v of [p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i)])expect(Number.isFinite(v),`${label} ${i}`).toBe(true);
  expect(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1),`${label} normal ${i}`).toBeLessThan(1e-3);}
}
const eachVertex=(g:BufferGeometry,f:(x:number,y:number,z:number)=>void)=>{const p=g.getAttribute('position');for(let i=0;i<p.count;i++)f(p.getX(i),p.getY(i),p.getZ(i));};

describe('wooden garden gate (木造庭門)',()=>{
 const parts=gateParts(),box=bounds(parts.map(p=>p.geometry)),floor=gardenFloor(GATE.x,GATE.z);
 it('one merged geometry per material: cedar, roof tile, lacquer',()=>{
  expect(parts.map(p=>p.material).sort()).toEqual(['agedCedar','lacquer','roofTile']);
 });
 it('opening as wide as GATE.width, roof a little wider, total height GATE.height',()=>{
  const [a,b]=gateColliders();expect(Math.abs(b.x-a.x)-GATE_SPEC.post).toBeCloseTo(GATE.width,5);
  const width=box.max.x-box.min.x;expect(width).toBeGreaterThan(GATE.width+2*GATE_SPEC.post);expect(width).toBeLessThan(GATE.width*1.6);
  expect(box.max.y-gateBase()).toBeCloseTo(GATE.height,2);
  const depth=box.max.z-box.min.z;expect(depth).toBeGreaterThan(1.5);expect(depth).toBeLessThan(3.5);                               
  expect((box.min.x+box.max.x)/2).toBeCloseTo(GATE.x,3);expect((box.min.z+box.max.z)/2).toBeCloseTo(GATE.z,3);
 });
 it('stands on the ground: frame at the centre ground, each post reaches just below its own ground, nothing buried deep',()=>{
  expect(gateBase()).toBe(floor);
  const cedar=parts.find(p=>p.material==='agedCedar')!.geometry;
  gateColliders().forEach((c,i)=>{const sx=i?1:-1,ground=postGround(sx);let foot=Infinity;
   eachVertex(cedar,(x,y,z)=>{if(Math.abs(x-c.x)<.22&&Math.abs(z-c.z)<.22)foot=Math.min(foot,y);});
   for(const [dx,dz] of [[-.21,-.21],[.21,-.21],[-.21,.21],[.21,.21]])expect(foot,`post ${sx}`).toBeLessThan(gardenFloor(c.x+dx,c.z+dz));                     
   expect(foot,`post ${sx}`).toBeGreaterThan(ground-.1);expect(foot,`post ${sx} sunk`).toBeLessThan(ground-.03);});                                                               
                                                                                                                                     
  const lowest=Math.min(postGround(-1),postGround(1));expect(box.min.y).toBeLessThan(lowest);expect(box.min.y).toBeGreaterThan(lowest-.1);
  expect(box.min.y).toBeGreaterThan(floor-.25);
 });
 it('outside the sandtray focus (guardrail 1)',()=>{for(const p of parts)eachVertex(p.geometry,(x,_y,z)=>expect(inTrayFocus(x,z)).toBe(false));});
 it('two post colliders at the posts, sized to the post',()=>{
  const c=gateColliders();expect(c.length).toBe(2);
  for(const p of c){expect(p.z).toBeCloseTo(GATE.z,5);expect(p.radius).toBeGreaterThanOrEqual(GATE_SPEC.post/2);expect(p.radius).toBeLessThan(.3);}
  expect(c[0].x).toBeCloseTo(GATE.x-(GATE.width+GATE_SPEC.post)/2,5);expect(c[1].x).toBeCloseTo(GATE.x+(GATE.width+GATE_SPEC.post)/2,5);
 });
});

describe('bamboo grove (竹林)',()=>{
 it('count scales by tier and every tier gets its full count',()=>{
  for(const t of tiers)expect(bambooCulms(t).length).toBe(BAMBOO_COUNT[t]);
  expect(BAMBOO_COUNT.low).toBeLessThan(BAMBOO_COUNT.high);expect(BAMBOO_COUNT.high).toBeLessThan(BAMBOO_COUNT.cinema);
  expect(BAMBOO_COUNT).toEqual({low:60,high:120,cinema:200});
 });
 it('deterministic, and a lower tier is a prefix of a higher one (a tier switch moves nothing)',()=>{
  expect(JSON.parse(JSON.stringify(bambooCulms('cinema')))).toEqual(JSON.parse(JSON.stringify(bambooCulms('cinema'))));
  expect(bambooCulms('cinema').slice(0,60)).toEqual(bambooCulms('low'));expect(bambooCulms('cinema').slice(0,120)).toEqual(bambooCulms('high'));
 });
 it('inside the grove, off built ground, out of the focus, at least 1 m from planted trunks',()=>{
  const trunks=plantedTrunks(),G=BAMBOO_GROVE;
  for(const c of bambooCulms('cinema')){
   expect(c.x).toBeGreaterThan(G.minX);expect(c.x).toBeLessThan(G.maxX);expect(c.z).toBeGreaterThan(G.minZ);expect(c.z).toBeLessThan(G.maxZ);
   expect(inTrayFocus(c.x,c.z)).toBe(false);expect(builtGround(c.x,c.z)).toBe(false);
   for(const t of trunks)expect(Math.hypot(t.x-c.x,t.z-c.z),`trunk ${t.x},${t.z}`).toBeGreaterThanOrEqual(BAMBOO_LIMITS.trunkClearance);}
 });
 it('the trunk clearance is enforced (a synthetic trunk in the grove, since no planted trunk stands there today)',()=>{
  const G=BAMBOO_GROVE,free=growGrove([]);
                                                                                      
  const at=free[Math.floor(free.length/2)],trunk={x:at.x,z:at.z,radius:.4},grove=growGrove([trunk]);
  expect(grove.length).toBe(BAMBOO_COUNT.cinema);expect(grove).not.toEqual(free);
  for(const c of grove)expect(Math.hypot(c.x-trunk.x,c.z-trunk.z)).toBeGreaterThanOrEqual(BAMBOO_LIMITS.trunkClearance+trunk.radius);
  expect(free.some(c=>Math.hypot(c.x-trunk.x,c.z-trunk.z)<1.4)).toBe(true);
  expect(G.maxX-G.minX).toBeGreaterThan(0);
 });
 it('heights 6..11 m, radius 3..6 cm, small lean',()=>{
  for(const c of bambooCulms('cinema')){expect(c.height).toBeGreaterThanOrEqual(6);expect(c.height).toBeLessThanOrEqual(11);
   expect(c.radius).toBeGreaterThanOrEqual(.03);expect(c.radius).toBeLessThanOrEqual(.06);expect(c.lean).toBeGreaterThanOrEqual(0);expect(c.lean).toBeLessThanOrEqual(.1);}
  const h=bambooCulms('cinema').map(c=>c.height);expect(Math.max(...h)-Math.min(...h)).toBeGreaterThan(2.5);                     
 });
 it('clumped, not uniform: mean nearest-neighbour distance well under the uniform expectation (Clark-Evans R < 0.8)',()=>{
  const G=BAMBOO_GROVE,list=bambooCulms('cinema'),area=(G.maxX-G.minX)*(G.maxZ-G.minZ);
  const nn=list.map((a,i)=>Math.min(...list.filter((_,j)=>j!==i).map(b=>Math.hypot(a.x-b.x,a.z-b.z))));
  const mean=nn.reduce((s,v)=>s+v,0)/nn.length;expect(mean/(.5/Math.sqrt(list.length/area))).toBeLessThan(.8);
  expect(Math.min(...nn)).toBeGreaterThanOrEqual(.16);                      
 });
 it('culms stand on the floor and leaves sit in the top quarter',()=>{
  for(const c of bambooCulms('low')){const m=culmMatrix(c),foot=new Vector3(0,0,0).applyMatrix4(m),top=new Vector3(0,1,0).applyMatrix4(m),floor=gardenFloor(c.x,c.z);
   expect(foot.y).toBeLessThan(floor);expect(foot.y).toBeGreaterThan(floor-.2);expect(top.distanceTo(foot)).toBeCloseTo(c.height,4);
   expect(Math.hypot(top.x-foot.x,top.z-foot.z)).toBeLessThanOrEqual(Math.sin(BAMBOO_LIMITS.maxLean)*c.height+1e-6);}
  const culms=bambooCulms('low'),leaves=leafMatrices(culms);expect(leaves.length).toBeGreaterThanOrEqual(2*culms.length);expect(leaves.length).toBeLessThanOrEqual(3*culms.length);
  const lowest=Math.min(...culms.map(c=>gardenFloor(c.x,c.z)+.7*c.height-.1));for(const m of leaves)expect(new Vector3().setFromMatrixPosition(m).y).toBeGreaterThan(lowest);
 });
 it('colliders: one small circle per culm',()=>{
  for(const t of tiers){const c=bambooColliders(t),culms=bambooCulms(t);expect(c.length).toBe(culms.length);
   c.forEach((p,i)=>{expect(p.x).toBe(culms[i].x);expect(p.z).toBe(culms[i].z);expect(p.radius).toBeGreaterThan(culms[i].radius);expect(p.radius).toBeLessThan(.15);});}
 });
});

describe('distant five-storey pagoda (遠景五重塔)',()=>{
 const g=pagodaGeometry();g.computeBoundingBox();const b=g.boundingBox!,floor=gardenFloor(PAGODA.x,PAGODA.z);
 it('height within 10 % of PAGODA.height, base on the ground, centred on PAGODA',()=>{
  expect(Math.abs(b.max.y-floor-PAGODA.height)/PAGODA.height).toBeLessThan(.1);
  expect(b.min.y).toBeLessThanOrEqual(floor);expect(b.min.y).toBeGreaterThan(floor-1);
  expect((b.min.x+b.max.x)/2).toBeCloseTo(PAGODA.x,3);expect((b.min.z+b.max.z)/2).toBeCloseTo(PAGODA.z,3);
  expect(b.max.x-b.min.x).toBeLessThan(PAGODA.height*.5);                      
 });
 it('under the 2k triangle budget',()=>{expect(triangles(g)).toBeLessThan(2000);expect(triangles(g)).toBeGreaterThan(100);});
 it('five storeys: wide eaves at five heights, each narrower than the one below',()=>{
                                                                                   
  const band=new Map<number,number>();eachVertex(g,(x,y)=>{const k=Math.round((y-floor)/.25);band.set(k,Math.max(band.get(k)??0,Math.abs(x-PAGODA.x)));});
  const keys=[...band.keys()].sort((a,c)=>a-c),w=keys.map(k=>band.get(k)!),eaves:number[]=[];
  for(let i=1;i<w.length-1;i++)if(w[i]>w[i-1]&&w[i]>=w[i+1]&&w[i]>2)eaves.push(w[i]);
  expect(eaves.length).toBe(5);for(let i=1;i<5;i++)expect(eaves[i]).toBeLessThan(eaves[i-1]);
 });
});

describe('geometry sanity and lifecycle',()=>{
 it('every geometry has finite positions and unit normals',()=>{
  for(const p of gateParts())expectSane(p.geometry,'gate '+p.material);
  expectSane(pagodaGeometry(),'pagoda');expectSane(culmGeometry(),'culm');expectSane(nodeRingGeometry(),'nodes');expectSane(leafClusterGeometry(),'leaves');
 });
 it('static (guardrail 3): no per-frame code',()=>{
  const text=readFileSync(new URL('../apps/web/src/garden-landmarks.tsx',import.meta.url),'utf8');expect(text).not.toMatch(/useFrame|requestAnimationFrame|AnimationMixer/);
 });
 it('few draw calls, shadows as specified, no raycast, disposes its geometries but never the shared materials',()=>{
  const materials=createGardenMaterials(createFogUniforms());
  try{
   for(const t of tiers){const built=buildLandmarks(materials,t),meshes:Mesh[]=[];built.group.traverse(o=>{if((o as Mesh).isMesh)meshes.push(o as Mesh);});
    expect(meshes.length).toBe(7);                                              
    const disposed=new Set<string>(),materialDisposed:string[]=[];
    for(const m of meshes){m.geometry.addEventListener('dispose',()=>disposed.add(m.name));(m.material as any).addEventListener('dispose',()=>materialDisposed.push(m.name));
     const hits:unknown[]=[];m.raycast({} as any,hits as any);expect(hits.length).toBe(0);
     const gate=m.name.startsWith('Garden_gate_'),bamboo=m.name.startsWith('Garden_bamboo_');expect(gate||bamboo||m.name==='Garden_pagoda').toBe(true);
     expect(m.castShadow,m.name).toBe(gate||bamboo);if(gate)expect(m.receiveShadow).toBe(true);}
    const culms=meshes.find(m=>m.name==='Garden_bamboo_culms') as InstancedMesh;expect(culms.count).toBe(BAMBOO_COUNT[t]);
    built.dispose();expect(disposed.size).toBe(7);expect(materialDisposed).toEqual([]);}
   expect(()=>materials.get('bamboo')).not.toThrow();
  }finally{materials.dispose();}
 });
});
