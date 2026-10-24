import {useEffect,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import {BufferAttribute,BufferGeometry,Color,Euler,Group,InstancedMesh,LatheGeometry,Matrix4,Quaternion,Vector2,Vector3,type Material} from 'three';
import {POND,WATER_Y,LILY_ZONE,KOI_ZONE,BRIDGE,BRIDGE_WALK,inTrayFocus,type GardenTier} from './garden-layout';
import type {GardenMaterials} from './garden-materials';
                                                                             
                                                          
                                                              
                                                                        

                                                                
export const pondR=(x:number,z:number)=>Math.hypot((x-POND.x)/POND.radiusX,(z-POND.z)/POND.radiusZ);
function rng(seed:number){let s=seed>>>0;return()=>{s=(s+0x6d2b79f5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const frac=(v:number)=>v-Math.floor(v);
export const LILY={count:{low:40,high:80,cinema:140} as Record<GardenTier,number>,radius:[.25,.55] as const,spread:1.7,overlap:.2,
                                                                                      
 notch:[.14,.26] as const,
                                                                                                                                
 heights:[.010,.012,.014] as const};
export type LilyPadSpot={x:number;z:number;radius:number;rotation:number;notch:0|1};
                                                                                                                               
export function padAllowed(x:number,z:number,radius:number){
 const r=pondR(x,z);if(r<LILY_ZONE.minR||r>LILY_ZONE.maxR)return false;
 if(x>=BRIDGE.minX&&x<=BRIDGE.maxX&&Math.abs(z-BRIDGE_WALK.z)<LILY_ZONE.bridgeHalfWidth+radius)return false;
 return !inTrayFocus(x,z)&&!inTrayFocus(x+radius,z)&&!inTrayFocus(x-radius,z)&&!inTrayFocus(x,z+radius)&&!inTrayFocus(x,z-radius);
}
let allPads:LilyPadSpot[]|undefined;
                                                                                                                                   
function padsFull(){
 if(allPads)return allPads;const random=rng(20261021),out:LilyPadSpot[]=[],target=LILY.count.cinema;
 for(let cluster=0;cluster<400&&out.length<target;cluster++){
  const a=random()*Math.PI*2,r=Math.sqrt(.3**2+random()*(.8**2-.3**2)),cx=POND.x+Math.cos(a)*r*POND.radiusX,cz=POND.z+Math.sin(a)*r*POND.radiusZ;
  if(!padAllowed(cx,cz,LILY.radius[0]))continue;
  const want=4+Math.floor(random()*7);let placed=0;
  for(let k=0;k<want*8&&placed<want&&out.length<target;k++){
   const radius=LILY.radius[0]+random()**1.5*(LILY.radius[1]-LILY.radius[0]),d=Math.sqrt(random())*LILY.spread,b=random()*Math.PI*2,x=cx+Math.cos(b)*d,z=cz+Math.sin(b)*d;
   if(!padAllowed(x,z,radius))continue;
   if(out.some(p=>Math.hypot(p.x-x,p.z-z)<p.radius+radius-LILY.overlap*Math.min(p.radius,radius)))continue;
   out.push({x,z,radius,rotation:random()*Math.PI*2,notch:random()<.5?0:1});placed++;}
 }
 allPads=out;return out;
}
export const lilyPadSpots=(tier:GardenTier):LilyPadSpot[]=>padsFull().slice(0,LILY.count[tier]);
                                                                                          
export function lilyPadGeometry(notchHalf:number=LILY.notch[0],segments=28){
 const p:number[]=[],span=Math.PI*2-notchHalf*2;
 for(let s=0;s<segments;s++){const a0=notchHalf+span*s/segments,a1=notchHalf+span*(s+1)/segments;tri(p,[0,0,0],[Math.cos(a0),0,Math.sin(a0)],[Math.cos(a1),0,Math.sin(a1)]);}
 return flat(p);
}
                                                                                             
function tri(out:number[],a:number[],b:number[],c:number[],colours?:number[],ca?:Color,cb?:Color,cc?:Color){
 const up=(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]);
 if(up<0){out.push(...a,...c,...b);colours?.push(...ca!.toArray(),...cc!.toArray(),...cb!.toArray());}
 else {out.push(...a,...b,...c);colours?.push(...ca!.toArray(),...cb!.toArray(),...cc!.toArray());}
}
                                               
function flat(p:number[],colours?:number[]){
 const g=new BufferGeometry();g.setAttribute('position',new BufferAttribute(new Float32Array(p),3));
 const n=new Float32Array(p.length);for(let i=1;i<n.length;i+=3)n[i]=1;g.setAttribute('normal',new BufferAttribute(n,3));
 if(colours)g.setAttribute('color',new BufferAttribute(new Float32Array(colours),3));g.computeBoundingSphere();return g;
}
export type LotusSpot={pad:number;kind:'flower'|'bud';x:number;z:number;rotation:number;scale:number};
export const LOTUS_SHARE=.2;
                                                                                                                                     
export function lotusSpots(tier:GardenTier):LotusSpot[]{
 const out:LotusSpot[]=[];lilyPadSpots(tier).forEach((p,i)=>{const h=frac(Math.sin(i*12.9898+4.1)*43758.5453);if(h>=LOTUS_SHARE)return;
  const g=frac(Math.sin(i*78.233+1.7)*43758.5453),off=p.radius*.25;
  out.push({pad:i,kind:g<.55?'flower':'bud',x:p.x+Math.cos(p.rotation+2)*off,z:p.z+Math.sin(p.rotation+2)*off,rotation:g*Math.PI*2,scale:.85+frac(g*7.3)*.3});});
 return out;
}
                                                                                                           
export function lotusFlowerGeometry(){
 const p:number[]=[],v=new Vector3(),up=new Vector3(0,1,0);
 const ring=(count:number,length:number,width:number,tilt:number,base:number,lift:number,turn:number)=>{for(let k=0;k<count;k++){
  const yaw=turn+k/count*Math.PI*2,at=(s:number,c:number)=>{v.set(base+s*Math.cos(tilt),lift+s*Math.sin(tilt)-Math.abs(c)*.15,c).applyAxisAngle(up,yaw);return [v.x,v.y,v.z];};
  const b=at(0,0),l=at(length*.45,-width/2),r=at(length*.45,width/2),t=at(length,0),m=at(length*.5,0);
  m[1]+=.006;p.push(...b,...l,...m,...b,...m,...r,...l,...t,...m,...m,...t,...r);}};
 ring(8,.115,.055,30*Math.PI/180,.012,0,0);ring(7,.085,.045,58*Math.PI/180,.006,.008,Math.PI/7);
 const g=new BufferGeometry();g.setAttribute('position',new BufferAttribute(new Float32Array(p),3));g.computeVertexNormals();g.computeBoundingSphere();return g;
}
                                                      
export function lotusBudGeometry(){
 const g=new LatheGeometry([[0,0],[.022,.008],[.036,.03],[.038,.052],[.03,.078],[.016,.102],[.004,.118],[0,.122]].map(([r,y])=>new Vector2(r,y)),10);g.computeBoundingSphere();return g;
}
                
export const KOI_COUNT:Record<GardenTier,number>={low:12,high:18,cinema:24};
export const koiCount=(tier:GardenTier)=>KOI_COUNT[tier];
export type KoiPattern='kohaku'|'sanke'|'ogon';
export const KOI_PATTERNS:readonly KoiPattern[]=['kohaku','sanke','ogon'];
                                                                           
export const KOI_SUBMERGE=.3;
const DEEP_WATER=new Color('#285258');
const submerged=(hex:string)=>new Color(hex).lerp(DEEP_WATER,KOI_SUBMERGE);
                                                 
export const KOI_COLORS={red:submerged('#d4442a'),white:submerged('#f1ece2'),black:submerged('#1c1c1e'),gold:submerged('#e6a93a')};
                                                                                          
export const KOI_REACH=.36;
                                                                                                                                         
const KOI_EAST=.53;
const koiHash=(i:number,n:number)=>frac(Math.sin(i*73.13+n*29.71)*43758.5453);
function koiAt(i:number,t:number):[number,number]{
 const h=(n:number)=>koiHash(i,n),dir=h(1)<.5?-1:1,w=.06+h(2)*.05;
                                                                                                                              
 const theta=h(3)*Math.PI*2+dir*(w*t+.12*Math.sin(.3*t+h(4)*6.3)),lo=KOI_ZONE.minR+.02,cos=Math.cos(theta);
 const limit=cos>KOI_EAST/(KOI_ZONE.maxR-.03)?KOI_EAST/cos:KOI_ZONE.maxR-.03;
 const s=Math.min(.95,Math.max(.05,.15+h(5)*.7+.12*Math.sin((2+Math.floor(h(6)*2))*theta+h(7)*6.3))),r=lo+(limit-lo)*s;
 return [POND.x+cos*r*POND.radiusX,POND.z+Math.sin(theta)*r*POND.radiusZ];
}
                                                                                                                                 
export function koiPosition(i:number,t:number):[number,number,number]{
 const [x,z]=koiAt(i,t),[x2,z2]=koiAt(i,t+.05);return [x,z,Math.atan2(-(z2-z),x2-x)];
}
export const koiPattern=(i:number)=>KOI_PATTERNS[i%KOI_PATTERNS.length];
export const koiScale=(i:number)=>.8+koiHash(i,8)*.2;
                                                                                                                                    
export function koiGeometry(pattern:KoiPattern){
 const C=KOI_COLORS,p:number[]=[],c:number[]=[];
 const bodyColour=(x:number,side:number)=>{
  if(pattern==='ogon')return C.gold;
  if(pattern==='sanke'&&((side===0&&x>-.17&&x<-.12)||(side===1&&x>.05&&x<.09)))return C.black;
  return side===0&&((x>.0&&x<.17)||(x>-.12&&x<-.03))?C.red:C.white;
 };
 const fin=pattern==='ogon'?C.gold:C.white,tailMid=pattern==='sanke'?C.black:fin;
 const stations=9,xs=Array.from({length:stations},(_,k)=>-.2+k*(.43/(stations-1))),half=(x:number)=>Math.max(.014,.078*Math.sqrt(Math.max(0,1-((x-.02)/.225)**2)));
 for(let k=0;k<stations-1;k++){const [x0,x1]=[xs[k],xs[k+1]],[w0,w1]=[half(x0),half(x1)];
  for(const sgn of [-1,1]){const a=[x0,0,0],b=[x0,0,sgn*w0],d=[x1,0,0],e=[x1,0,sgn*w1],side=sgn<0?-1:1;
   tri(p,a,b,e,c,bodyColour(x0,0),bodyColour(x0,side),bodyColour(x1,side));tri(p,a,e,d,c,bodyColour(x0,0),bodyColour(x1,side),bodyColour(x1,0));}}
 const root=[-.2,0,0],mid=[-.31,0,0];
 tri(p,root,[-.35,0,-.1],mid,c,fin,fin,tailMid);tri(p,root,mid,[-.35,0,.1],c,fin,tailMid,fin);
 for(const sgn of [-1,1])tri(p,[.1,0,sgn*.065],[.03,0,sgn*.07],[0,0,sgn*.15],c,fin,fin,fin);
 return flat(p,c);
}
                  
const KOI_LIFT:Record<KoiPattern,number>={kohaku:.008,sanke:.0087,ogon:.0094};
type Built={group:Group;swim(t:number):void;dispose():void};
                                                                                                                                          
export function buildPondLife(materials:GardenMaterials,tier:GardenTier):Built{
 const group=new Group();group.name='Garden_pond_life';const geometries:BufferGeometry[]=[],meshes:InstancedMesh[]=[];
 const m=new Matrix4(),q=new Quaternion(),e=new Euler(),pos=new Vector3(),scl=new Vector3();
 const add=(name:string,geometry:BufferGeometry,material:Material,count:number,fill:(i:number)=>void,receive=false)=>{
  geometries.push(geometry);const mesh=new InstancedMesh(geometry,material,Math.max(1,count));mesh.count=count;mesh.name=name;mesh.castShadow=false;mesh.receiveShadow=receive;mesh.raycast=()=>{};
  for(let i=0;i<count;i++){fill(i);mesh.setMatrixAt(i,m);}mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);meshes.push(mesh);return mesh;};
 const pads=lilyPadSpots(tier),padY=(i:number)=>WATER_Y+LILY.heights[i%LILY.heights.length];
 for(const notch of [0,1] as const){const list=pads.map((p,i)=>({p,i})).filter(({p})=>p.notch===notch);
  add(`Garden_lily_pads_${notch}`,lilyPadGeometry(LILY.notch[notch]),materials.get('lilyPad'),list.length,k=>{const {p,i}=list[k];m.compose(pos.set(p.x,padY(i),p.z),q.setFromEuler(e.set(0,p.rotation,0)),scl.set(p.radius,1,p.radius));},true);}
 const lotus=lotusSpots(tier);
 for(const kind of ['flower','bud'] as const){const list=lotus.filter(l=>l.kind===kind);
  add(`Garden_lotus_${kind}s`,kind==='flower'?lotusFlowerGeometry():lotusBudGeometry(),materials.get(kind==='flower'?'lotusPetal':'lotusBud'),list.length,k=>{const l=list[k];m.compose(pos.set(l.x,padY(l.pad)+.002,l.z),q.setFromEuler(e.set(kind==='bud'?.12:0,l.rotation,0)),scl.setScalar(l.scale));});}
 const fish=Array.from({length:koiCount(tier)},(_,i)=>i),schools:{mesh:InstancedMesh;members:number[];lift:number}[]=[];
 const placeKoi=(i:number,lift:number,t:number)=>{const [x,z,heading]=koiPosition(i,t);m.compose(pos.set(x,WATER_Y+lift,z),q.setFromEuler(e.set(0,heading+.08*Math.sin(t*2.6+i*1.7),0)),scl.setScalar(koiScale(i)));};
 for(const pattern of KOI_PATTERNS){const members=fish.filter(i=>koiPattern(i)===pattern),lift=KOI_LIFT[pattern];
  const mesh=add(`Garden_koi_${pattern}`,koiGeometry(pattern),materials.get('koi'),members.length,k=>placeKoi(members[k],lift,0));mesh.frustumCulled=false;schools.push({mesh,members,lift});}
                                                                                                                               
 return {group,
  swim(t){for(const {mesh,members,lift} of schools){members.forEach((i,k)=>{placeKoi(i,lift,t);mesh.setMatrixAt(k,m);});mesh.instanceMatrix.needsUpdate=true;}},
  dispose(){for(const mesh of meshes)mesh.dispose();for(const g of geometries)g.dispose();}};
}
                                                                                                                             
export function PondLife({materials,tier}:{materials:GardenMaterials;tier:GardenTier}){
 const reduced=useMemo(()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches,[]);
 const built=useMemo(()=>buildPondLife(materials,tier),[materials,tier]);
 useEffect(()=>()=>built.dispose(),[built]);
 useFrame(state=>{if(reduced)return;built.swim(state.clock.elapsedTime);});
 return <primitive object={built.group} dispose={null}/>;
}
