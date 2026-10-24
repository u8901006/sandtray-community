import {useEffect,useState} from 'react';
import {useThree} from '@react-three/fiber';
import {BoxGeometry,BufferGeometry,CylinderGeometry,Float32BufferAttribute,Group,InstancedMesh,Matrix4,Mesh,Quaternion,Vector3} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {GATE,BAMBOO_GROVE,PAGODA,gardenFloor,inTrayFocus,builtGround,plantedTrunks,type GardenTier} from './garden-layout';
import type {GardenMaterials,PaletteName} from './garden-materials';
                                                                       
                                                                                          
                                                                

export type LandmarkPart={material:PaletteName;geometry:BufferGeometry};
export type Collider={x:number;z:number;radius:number};
const box=(w:number,h:number,d:number,x:number,y:number,z:number,rx=0)=>{const g=new BoxGeometry(w,h,d);if(rx)g.rotateX(rx);g.translate(x,y,z);return g;};
const merge=(list:BufferGeometry[])=>{const g=mergeGeometries(list);for(const p of list)p.dispose();if(!g)throw new Error('merge failed');g.computeBoundingBox();g.computeBoundingSphere();return g;};

                                
                                                                                           
export const GATE_SPEC={post:.28,postHeight:3.45,beamY:2.75,roofSpanX:3.05,eaveZ:1.2,eaveY:3.78,ridgeY:4.44,sink:.08};
                                                  
const postX=GATE.width/2+GATE_SPEC.post/2;
                                                                                               
export const gateBase=()=>gardenFloor(GATE.x,GATE.z);
                                                                                                                 
export function postGround(sx:number){let low=Infinity;for(const dx of [-.21,.21])for(const dz of [-.21,.21]){const [x,z]=gateToWorld(sx*postX+dx,dz);low=Math.min(low,gardenFloor(x,z));}return low;}
const gateToWorld=(lx:number,lz:number):[number,number]=>{const c=Math.cos(GATE.yaw),s=Math.sin(GATE.yaw);return [GATE.x+lx*c+lz*s,GATE.z-lx*s+lz*c];};
export function gateParts():LandmarkPart[]{
 const S=GATE_SPEC,p=S.post,cedar:BufferGeometry[]=[],tile:BufferGeometry[]=[],lacquer:BufferGeometry[]=[],base=gateBase();
 for(const sx of [-1,1]){const foot=postGround(sx)-base-S.sink;                                                                
  cedar.push(box(p,S.postHeight-foot,p,sx*postX,(S.postHeight+foot)/2,0));            
  cedar.push(box(.42,.14,.42,sx*postX,foot+.07,0));              
  lacquer.push(box(p+.03,.05,p+.03,sx*postX,S.beamY+.33,0));                                   
 }
 cedar.push(box(GATE.width+2*p+.5,.2,.16,0,S.beamY,0));               
 cedar.push(box(GATE.width+2*p+1.1,.26,.24,0,S.postHeight-.13,0));                                      
 cedar.push(box(.12,S.ridgeY-S.postHeight-.05,.12,0,(S.ridgeY+S.postHeight)/2,0));                                
 for(const sx of [-1,1])cedar.push(box(.14,.14,2*S.eaveZ-.2,sx*postX,S.postHeight+.07,0));                             
 for(const sx of [-1,1])lacquer.push(box(.06,.27,.25,sx*(GATE.width/2+p+.55+.03),S.postHeight-.13,0));                   
                                                                                        
 const run=S.eaveZ,drop=S.ridgeY-S.eaveY,slope=Math.hypot(run,drop),angle=Math.atan2(drop,run),midY=(S.ridgeY+S.eaveY)/2;
 for(const sz of [-1,1])tile.push(box(2*S.roofSpanX,.12,slope+.06,0,midY,sz*run/2,sz*angle));
 tile.push(box(2*S.roofSpanX+.2,GATE.height-S.ridgeY+.06,.26,0,(GATE.height+S.ridgeY-.06)/2,0));                                
 const world=new Matrix4().makeRotationY(GATE.yaw).setPosition(GATE.x,base,GATE.z);
 return ([['agedCedar',cedar],['roofTile',tile],['lacquer',lacquer]] as const).map(([material,list])=>{const g=merge(list);g.applyMatrix4(world);g.computeBoundingBox();g.computeBoundingSphere();return {material,geometry:g};});
}
                                                                             
export const gateColliders=():Collider[]=>[-1,1].map(sx=>{const [x,z]=gateToWorld(sx*postX,0);return {x,z,radius:.21};});

               
export type BambooCulm={x:number;z:number;height:number;radius:number;lean:number;leanAngle:number;rotation:number};
export const BAMBOO_COUNT:Record<GardenTier,number>={low:60,high:120,cinema:200};
export const BAMBOO_LIMITS={height:[6,11] as const,radius:[.03,.06] as const,maxLean:.07,trunkClearance:1,margin:.2};
function rng(seed:number){let s=seed>>>0;return()=>{s=(s+0x6d2b79f5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
export const BAMBOO_CLUMPS={count:12,radius:.95,spacing:2.2};
let allCulms:BambooCulm[]|undefined;
const fullGrove=()=>allCulms??=growGrove(plantedTrunks());
                                                                                                                                                   
                                                                                                                                         
export function growGrove(trunks:readonly {x:number;z:number;radius:number}[]){
 const random=rng(20261021),G=BAMBOO_GROVE,m=BAMBOO_LIMITS.margin,out:BambooCulm[]=[];
 const ok=(x:number,z:number)=>x>G.minX+m&&x<G.maxX-m&&z>G.minZ+m&&z<G.maxZ-m&&!inTrayFocus(x,z)&&!builtGround(x,z)&&!trunks.some(t=>Math.hypot(t.x-x,t.z-z)<BAMBOO_LIMITS.trunkClearance+t.radius);
 const clumps:{x:number;z:number}[]=[];
 for(let a=0;a<4000&&clumps.length<BAMBOO_CLUMPS.count;a++){const x=G.minX+random()*(G.maxX-G.minX),z=G.minZ+random()*(G.maxZ-G.minZ);if(ok(x,z)&&!clumps.some(c=>Math.hypot(c.x-x,c.z-z)<BAMBOO_CLUMPS.spacing))clumps.push({x,z});}
 const target=BAMBOO_COUNT.cinema;
 for(let a=0;a<target*60&&out.length<target;a++){const c=clumps[a%clumps.length],ang=random()*Math.PI*2,r=Math.sqrt(random())*BAMBOO_CLUMPS.radius;
  const x=c.x+Math.cos(ang)*r,z=c.z+Math.sin(ang)*r;if(!ok(x,z)||out.some(p=>Math.hypot(p.x-x,p.z-z)<.16))continue;
  const [h0,h1]=BAMBOO_LIMITS.height,[r0,r1]=BAMBOO_LIMITS.radius,size=random();
  out.push({x,z,height:h0+(h1-h0)*(.35*size+.65*random()),radius:r0+(r1-r0)*size,lean:random()*BAMBOO_LIMITS.maxLean,leanAngle:random()*Math.PI*2,rotation:random()*Math.PI*2});}
 return out;
}
export const bambooCulms=(tier:GardenTier):BambooCulm[]=>fullGrove().slice(0,BAMBOO_COUNT[tier]);
export const bambooColliders=(tier:GardenTier):Collider[]=>bambooCulms(tier).map(c=>({x:c.x,z:c.z,radius:c.radius+.05}));
                                                          
const taper=(t:number)=>1-.4*t;
                                                                                                 
export function culmGeometry(){const g=new CylinderGeometry(taper(1),1,1,6,1);g.translate(0,.5,0);return g;}
                                                                                            
export const NODE_RINGS=16;
export function nodeRingGeometry(){const list:BufferGeometry[]=[];for(let k=1;k<=NODE_RINGS;k++){const t=k/(NODE_RINGS+1)*.97,r=taper(t)*1.18,g=new CylinderGeometry(r,r,.006,6,1,true);g.translate(0,t,0);list.push(g);}return merge(list);}
                                                                                                     
export function leafClusterGeometry(){
 const random=rng(33),position:number[]=[],uv:number[]=[];
 for(let i=0;i<12;i++){const yaw=i/12*Math.PI*2+random()*.4,len=.28+random()*.16,w=.035+random()*.015,droop=-.35-random()*.5;
  const base=new Vector3(Math.cos(yaw)*.18*random(),(random()-.5)*.35,Math.sin(yaw)*.18*random()),dir=new Vector3(Math.cos(yaw),droop,Math.sin(yaw)).normalize(),side=new Vector3(-Math.sin(yaw),0,Math.cos(yaw)).multiplyScalar(w);
  const tip=base.clone().addScaledVector(dir,len),mid=base.clone().addScaledVector(dir,len*.4);
  const a=mid.clone().add(side),b=mid.clone().sub(side);
  for(const v of [base,a,tip,base,tip,b])position.push(v.x,v.y,v.z);uv.push(0,0,1,.5,0,1,0,0,0,1,1,.5);}
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(position,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.computeVertexNormals();g.computeBoundingSphere();return g;
}
const UP=new Vector3(0,1,0);
                                                                                             
export function culmMatrix(c:BambooCulm){
 const axis=new Vector3(Math.cos(c.leanAngle),0,Math.sin(c.leanAngle)).cross(UP).normalize().negate();
 const q=new Quaternion().setFromAxisAngle(axis,c.lean).multiply(new Quaternion().setFromAxisAngle(UP,c.rotation));
 return new Matrix4().compose(new Vector3(c.x,gardenFloor(c.x,c.z)-.1,c.z),q,new Vector3(c.radius,c.height,c.radius));
}
                                                            
export function leafMatrices(culms:BambooCulm[]){
 const random=rng(77),out:Matrix4[]=[];
 for(const c of culms){const m=culmMatrix(c),n=2+(random()<.5?1:0);
  for(let k=0;k<n;k++){const t=.74+random()*.22,p=new Vector3(0,t,0).applyMatrix4(m),s=.8+random()*.6;
   out.push(new Matrix4().compose(p,new Quaternion().setFromAxisAngle(UP,random()*Math.PI*2),new Vector3(s,s*.8,s)));}}
 return out;
}

                  
export const PAGODA_STOREYS=5;
                                                                                                                           
export function pagodaGeometry(){
 const list:BufferGeometry[]=[],H=PAGODA.height,square=(rTop:number,rBottom:number,h:number,y:number)=>{const g=new CylinderGeometry(rTop*Math.SQRT2,rBottom*Math.SQRT2,h,4,1);g.rotateY(Math.PI/4);g.translate(0,y+h/2,0);return g;};
 const sink=.4;let y=-sink;
 list.push(box(9,1.2+sink,9,0,y+(1.2+sink)/2,0));y+=1.2+sink;                      
 const storey=[3.6,3.15,3,2.85,2.75];
 for(let i=0;i<PAGODA_STOREYS;i++){const half=3.1-i*.38,body=storey[i]-1.05,eave=half*1.85;
  list.push(box(2*half,body,2*half,0,y+body/2,0));y+=body;              
  list.push(square(eave,eave*.98,.18,y));                  
  list.push(square(half*.95,eave*.96,.87,y+.18));y+=1.05;               
 }
 list.push(square(.9,1.1,.5,y));y+=.5;                      
 const spire=H-y-.7;
 list.push(new CylinderGeometry(.12,.16,spire,8,1).translate(0,y+spire/2,0));       
 for(let k=0;k<9;k++){const r=.62-k*.03,g=new CylinderGeometry(r,r,.09,8,1);g.translate(0,y+.6+k*spire*.075,0);list.push(g);}                  
 const top=y+spire;list.push(new CylinderGeometry(0,.24,.7,8,1).translate(0,top+.35,0));             
 const g=merge(list);g.translate(PAGODA.x,gardenFloor(PAGODA.x,PAGODA.z),PAGODA.z);g.computeBoundingBox();g.computeBoundingSphere();return g;
}

                      
const noRaycast=()=>{};
export type Built={group:Group;dispose():void};
export function buildLandmarks(materials:GardenMaterials,tier:GardenTier):Built{
 const group=new Group();group.name='Garden_landmarks';const geometries:BufferGeometry[]=[],instanced:InstancedMesh[]=[];
 for(const part of gateParts()){const mesh=new Mesh(part.geometry,materials.get(part.material));mesh.name='Garden_gate_'+part.material;mesh.castShadow=true;mesh.receiveShadow=true;mesh.raycast=noRaycast;geometries.push(part.geometry);group.add(mesh);}
 const culms=bambooCulms(tier),matrices=culms.map(culmMatrix),leaves=leafMatrices(culms);
 const parts:[string,BufferGeometry,PaletteName,Matrix4[]][]=[['culms',culmGeometry(),'bamboo',matrices],['nodes',nodeRingGeometry(),'bambooNode',matrices],['leaves',leafClusterGeometry(),'bambooLeaf',leaves]];
 for(const [name,geometry,material,list] of parts){const mesh=new InstancedMesh(geometry,materials.get(material),Math.max(1,list.length));mesh.count=list.length;list.forEach((m,i)=>mesh.setMatrixAt(i,m));
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=true;mesh.raycast=noRaycast;mesh.name='Garden_bamboo_'+name;geometries.push(geometry);instanced.push(mesh);group.add(mesh);}
 const pagoda=pagodaGeometry(),tower=new Mesh(pagoda,materials.get('silhouette'));tower.name='Garden_pagoda';tower.raycast=noRaycast;geometries.push(pagoda);group.add(tower);
                                                                                                                  
 return {group,dispose(){for(const mesh of instanced)mesh.dispose();for(const g of geometries)g.dispose();}};
}
                                                                                                                           
export function GardenLandmarks({materials,tier}:{materials:GardenMaterials;tier:GardenTier}){
 const invalidate=useThree(s=>s.invalidate);const [group,setGroup]=useState<Group>();
 useEffect(()=>{const built=buildLandmarks(materials,tier);setGroup(built.group);invalidate();return()=>{setGroup(undefined);built.dispose();};},[materials,tier,invalidate]);
 return group?<primitive object={group} dispose={null}/>:null;
}
