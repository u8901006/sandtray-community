import {describe,expect,it} from 'vitest';
import {BufferAttribute,BufferGeometry,Color,InstancedMesh,Matrix4,Vector3} from 'three';
import {pondR,lilyPadSpots,lilyPadGeometry,lotusSpots,lotusFlowerGeometry,lotusBudGeometry,koiCount,koiPosition,koiGeometry,koiPattern,koiScale,buildPondLife,padAllowed,LILY,LOTUS_SHARE,KOI_COLORS,KOI_REACH,KOI_SUBMERGE,type KoiPattern} from '../apps/web/src/garden-pond-life';
import {LILY_ZONE,KOI_ZONE,BRIDGE_WALK,WATER_Y,TRAY_FOCUS,inTrayFocus,type GardenTier} from '../apps/web/src/garden-layout';
import {createGardenMaterials} from '../apps/web/src/garden-materials';
import {createFogUniforms} from '../apps/web/src/garden-shaders';
                                                                                 
const TIERS:GardenTier[]=['low','high','cinema'];
const positions=(g:BufferGeometry)=>{const a=g.getAttribute('position') as BufferAttribute,out:Vector3[]=[];for(let i=0;i<a.count;i++)out.push(new Vector3().fromBufferAttribute(a,i));return out;};
const finite=(g:BufferGeometry)=>Array.from((g.getAttribute('position') as BufferAttribute).array as Float32Array).every(Number.isFinite);
                                                                                              
const flatArea=(g:BufferGeometry)=>{const p=positions(g);let s=0;for(let i=0;i<p.length;i+=3)s+=Math.abs((p[i+1].x-p[i].x)*(p[i+2].z-p[i].z)-(p[i+2].x-p[i].x)*(p[i+1].z-p[i].z))/2;return s;};
const covers=(g:BufferGeometry,x:number,z:number)=>{const p=positions(g);for(let i=0;i<p.length;i+=3){const [a,b,c]=[p[i],p[i+1],p[i+2]];const d=(u:Vector3,v:Vector3)=>(v.x-u.x)*(z-u.z)-(v.z-u.z)*(x-u.x);const d1=d(a,b),d2=d(b,c),d3=d(c,a);if(!((d1<0||d2<0||d3<0)&&(d1>0||d2>0||d3>0)))return true;}return false;};
const hasColour=(g:BufferGeometry,c:Color)=>{const a=g.getAttribute('color') as BufferAttribute;for(let i=0;i<a.count;i++)if(Math.abs(a.getX(i)-c.r)<1e-5&&Math.abs(a.getY(i)-c.g)<1e-5&&Math.abs(a.getZ(i)-c.b)<1e-5)return true;return false;};

describe('lily pads',()=>{
 it('tier counts are ordered, near their targets, and each lower tier is a prefix of the next (switching tier moves nothing)',()=>{
  const [low,high,cinema]=TIERS.map(lilyPadSpots);
  expect(low.length).toBeLessThan(high.length);expect(high.length).toBeLessThan(cinema.length);
  for(const t of TIERS)expect(lilyPadSpots(t).length).toBeGreaterThanOrEqual(Math.round(LILY.count[t]*.9));
  expect(cinema.slice(0,low.length)).toEqual(low);expect(cinema.slice(0,high.length)).toEqual(high);
 });
 it('are deterministic, sized 0.25-0.55 m, inside the lily zone, off the bridge strip and fully outside the sandtray focus',()=>{
  expect(JSON.stringify(lilyPadSpots('cinema'))).toBe(JSON.stringify(lilyPadSpots('cinema')));
  for(const p of lilyPadSpots('cinema')){
   expect(p.radius).toBeGreaterThanOrEqual(.25);expect(p.radius).toBeLessThanOrEqual(.55);
   const r=pondR(p.x,p.z);expect(r).toBeGreaterThanOrEqual(LILY_ZONE.minR);expect(r).toBeLessThanOrEqual(LILY_ZONE.maxR);
   expect(Math.abs(p.z-BRIDGE_WALK.z)-p.radius,`${p.x},${p.z}`).toBeGreaterThanOrEqual(LILY_ZONE.bridgeHalfWidth-1e-9);
   for(let k=0;k<16;k++){const a=k/16*Math.PI*2;expect(inTrayFocus(p.x+Math.cos(a)*p.radius,p.z+Math.sin(a)*p.radius)).toBe(false);}
   expect(p.x+p.radius).toBeLessThan(-TRAY_FOCUS.halfX);                                                    
  }
                                                                 
  expect(padAllowed(-15.5,6,.3)).toBe(false);expect(padAllowed(-28,10.5,.3)).toBe(false);expect(padAllowed(-28,5,.3)).toBe(true);
 });
 it('grow in clusters and overlap each other by no more than 20% of the smaller radius',()=>{
  const pads=lilyPadSpots('cinema');let clustered=0;
  for(let i=0;i<pads.length;i++){let near=false;for(let j=0;j<pads.length;j++){if(i===j)continue;const a=pads[i],b=pads[j],d=Math.hypot(a.x-b.x,a.z-b.z);
   expect(a.radius+b.radius-d).toBeLessThanOrEqual(LILY.overlap*Math.min(a.radius,b.radius)+1e-9);if(d<2.5)near=true;}if(near)clustered++;}
  expect(clustered/pads.length).toBeGreaterThan(.9);
  expect(new Set(pads.map(p=>p.notch)).size).toBe(2);
 });
 it('geometry: a flat unit disc with normals up and a wedge actually missing',()=>{
  for(const half of LILY.notch){const g=lilyPadGeometry(half);expect(finite(g)).toBe(true);
   const n=g.getAttribute('normal') as BufferAttribute;for(let i=0;i<n.count;i++)expect([n.getX(i),n.getY(i),n.getZ(i)]).toEqual([0,1,0]);
   for(const v of positions(g)){expect(v.y).toBe(0);expect(Math.hypot(v.x,v.z)).toBeLessThanOrEqual(1+1e-6);}
                                                                                  
   const p=positions(g);for(let i=0;i<p.length;i+=3)expect(new Vector3().subVectors(p[i+1],p[i]).cross(new Vector3().subVectors(p[i+2],p[i])).y).toBeGreaterThan(0);
   const full=Math.PI*(1-half/Math.PI),area=flatArea(g);expect(area).toBeLessThan(full);expect(area).toBeGreaterThan(full*.97);
   expect(covers(g,.7,0)).toBe(false);expect(covers(g,-.7,0)).toBe(true);expect(covers(g,0,.7)).toBe(true);}
 });
});
describe('lotus',()=>{
 it('about a fifth of the pads carry a flower or a bud, on a pad, deterministic, both kinds present',()=>{
  const pads=lilyPadSpots('cinema'),lotus=lotusSpots('cinema');
  expect(lotus.length/pads.length).toBeGreaterThan(LOTUS_SHARE*.5);expect(lotus.length/pads.length).toBeLessThan(LOTUS_SHARE*1.6);
  expect(JSON.stringify(lotusSpots('cinema'))).toBe(JSON.stringify(lotus));
  expect(new Set(lotus.map(l=>l.kind))).toEqual(new Set(['flower','bud']));expect(new Set(lotus.map(l=>l.pad)).size).toBe(lotus.length);
  for(const l of lotus){const p=pads[l.pad];expect(Math.hypot(l.x-p.x,l.z-p.z)).toBeLessThan(p.radius*.5);expect(inTrayFocus(l.x,l.z)).toBe(false);expect(l.x+.15).toBeLessThan(-TRAY_FOCUS.halfX);}
                                                      
  for(const l of lotusSpots('low'))expect(lotus).toContainEqual(l);
  expect(lotusSpots('low').length).toBeLessThan(lotusSpots('high').length);
 });
 it('flower is two rings of petals ~0.25 m across, cupped upward; bud is a closed teardrop ~0.12 m tall',()=>{
  const f=lotusFlowerGeometry();expect(finite(f)).toBe(true);f.computeBoundingBox();const b=f.boundingBox!;
  expect(b.max.x-b.min.x).toBeGreaterThan(.2);expect(b.max.x-b.min.x).toBeLessThan(.3);expect(b.min.y).toBeGreaterThanOrEqual(-.01);expect(b.max.y).toBeGreaterThan(.05);
  expect((f.getAttribute('position') as BufferAttribute).count).toBe((8+7)*4*3);
  const bud=lotusBudGeometry();expect(finite(bud)).toBe(true);bud.computeBoundingBox();const c=bud.boundingBox!;
  expect(c.max.y-c.min.y).toBeGreaterThan(.1);expect(c.max.y-c.min.y).toBeLessThan(.14);expect(c.max.x-c.min.x).toBeLessThan(.09);
 });
});
describe('koi',()=>{
 it('counts per tier',()=>{expect(TIERS.map(koiCount)).toEqual([12,18,24]);});
 it('never enter the sandtray focus (whole fish) and stay inside the koi zone at every sampled time',()=>{
  for(let i=0;i<koiCount('cinema');i++)for(let t=0;t<=600;t+=7){const [x,z,h]=koiPosition(i,t);
   const r=pondR(x,z);expect(r,`${i} ${t}`).toBeGreaterThanOrEqual(KOI_ZONE.minR);expect(r,`${i} ${t}`).toBeLessThanOrEqual(KOI_ZONE.maxR);expect(Number.isFinite(h)).toBe(true);
   for(let k=0;k<8;k++){const a=k/8*Math.PI*2;expect(inTrayFocus(x+Math.cos(a)*KOI_REACH,z+Math.sin(a)*KOI_REACH),`${i} ${t}`).toBe(false);}}
 });
 it('move with time, smoothly, nose first, deterministic',()=>{
  for(let i=0;i<koiCount('cinema');i++){
   expect(koiPosition(i,42)).toEqual(koiPosition(i,42));
   const [x0,z0]=koiPosition(i,0),[x1,z1]=koiPosition(i,30);expect(Math.hypot(x1-x0,z1-z0)).toBeGreaterThan(.5);
   for(let t=0;t<120;t+=.5){const [ax,az,h]=koiPosition(i,t),[bx,bz]=koiPosition(i,t+.5),step=Math.hypot(bx-ax,bz-az);
    expect(step).toBeGreaterThan(.02);expect(step).toBeLessThan(.6);                                     
    const nose=new Vector3(1,0,0).applyAxisAngle(new Vector3(0,1,0),h);expect(nose.x*(bx-ax)+nose.z*(bz-az)).toBeGreaterThan(0);}}
 });
 it('geometry: flat fish ~0.45-0.6 m with pattern vertex colours pre-mixed toward deep water',()=>{
  const want:Record<KoiPattern,{has:(keyof typeof KOI_COLORS)[];not:(keyof typeof KOI_COLORS)[]}>={kohaku:{has:['red','white'],not:['black','gold']},sanke:{has:['red','white','black'],not:['gold']},ogon:{has:['gold'],not:['red','white','black']}};
  for(const pattern of Object.keys(want) as KoiPattern[]){const g=koiGeometry(pattern);expect(finite(g)).toBe(true);g.computeBoundingBox();const b=g.boundingBox!;
   for(const s of [.8,1]){expect((b.max.x-b.min.x)*s).toBeGreaterThanOrEqual(.45);expect((b.max.x-b.min.x)*s).toBeLessThanOrEqual(.6);}
   expect(b.max.y-b.min.y).toBe(0);expect(Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)).toBeLessThanOrEqual(KOI_REACH);
   const col=g.getAttribute('color') as BufferAttribute;expect(col.itemSize).toBe(3);expect(col.count).toBe((g.getAttribute('position') as BufferAttribute).count);
   for(const k of want[pattern].has)expect(hasColour(g,KOI_COLORS[k]),`${pattern} ${k}`).toBe(true);
   for(const k of want[pattern].not)expect(hasColour(g,KOI_COLORS[k]),`${pattern} ${k}`).toBe(false);}
  const teal=new Color('#285258'),raw=new Color('#d4442a');expect(KOI_SUBMERGE).toBeCloseTo(.3);
  expect(KOI_COLORS.red.r).toBeCloseTo(raw.r+(teal.r-raw.r)*.3,6);expect(KOI_COLORS.red.g).toBeCloseTo(raw.g+(teal.g-raw.g)*.3,6);
  expect(new Set(Array.from({length:24},(_,i)=>koiPattern(i)))).toEqual(new Set(['kohaku','sanke','ogon']));
  for(let i=0;i<24;i++){expect(koiScale(i)).toBeGreaterThanOrEqual(.8);expect(koiScale(i)).toBeLessThanOrEqual(1);}
 });
});
describe('PondLife meshes',()=>{
 it('few instanced draw calls, heights just above the water with koi below the pads, nothing in focus, koi swim on swim(t), dispose frees geometry only',()=>{
  const materials=createGardenMaterials(createFogUniforms());
  for(const tier of TIERS){const built=buildPondLife(materials,tier),meshes=built.group.children as InstancedMesh[];
   expect(meshes.length).toBe(7);expect(meshes.every(m=>m instanceof InstancedMesh&&!m.castShadow)).toBe(true);
   const by=(prefix:string)=>meshes.filter(m=>m.name.startsWith(prefix));
   expect(by('Garden_lily_pads').reduce((s,m)=>s+m.count,0)).toBe(lilyPadSpots(tier).length);expect(by('Garden_lily_pads').every(m=>m.receiveShadow)).toBe(true);
   expect(by('Garden_koi').reduce((s,m)=>s+m.count,0)).toBe(koiCount(tier));
   const p=new Vector3(),m4=new Matrix4(),y=(m:InstancedMesh)=>{const ys:number[]=[];for(let i=0;i<m.count;i++){m.getMatrixAt(i,m4);p.setFromMatrixPosition(m4);ys.push(p.y);expect(inTrayFocus(p.x,p.z)).toBe(false);}return ys;};
   const padYs=by('Garden_lily_pads').flatMap(y),koiYs=by('Garden_koi').flatMap(y);
   for(const v of padYs){expect(v-WATER_Y).toBeGreaterThanOrEqual(.004-1e-5);expect(v-WATER_Y).toBeLessThanOrEqual(.015+1e-5);}
   for(const v of koiYs){expect(v-WATER_Y).toBeGreaterThanOrEqual(.008-1e-5);expect(v-WATER_Y).toBeLessThanOrEqual(.015+1e-5);}                   
   expect(Math.max(...koiYs)).toBeLessThan(Math.min(...padYs));
   const koi=by('Garden_koi')[0],before=new Matrix4(),after=new Matrix4();koi.getMatrixAt(0,before);built.swim(25);koi.getMatrixAt(0,after);expect(after.equals(before)).toBe(false);
   let freed=0;for(const m of meshes)m.geometry.addEventListener('dispose',()=>freed++);built.dispose();expect(freed).toBe(7);
   expect(materials.get('koi').name).toBe('G3_koi');                                 
  }
  materials.dispose();
 });
});
