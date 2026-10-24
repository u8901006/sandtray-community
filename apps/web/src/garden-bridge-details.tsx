import {useEffect,useMemo} from 'react';
import {BoxGeometry,BufferGeometry,CylinderGeometry,InstancedMesh,LatheGeometry,Matrix4,Vector2,type MeshStandardMaterial} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {FINIAL_POSTS,POND_TORO,gardenFloor} from './garden-layout';
import type {GardenMaterials} from './garden-materials';
                                                                                      
                                                                   
                                         

                                                                                                                          
const FINIAL_PROFILE:[number,number][]=[[0,0],[.075,0],[.075,.06],[.062,.072],[.05,.09],[.068,.11],[.08,.14],[.077,.17],[.064,.2],[.046,.222],[.034,.236],[.042,.25],[.04,.27],[.026,.295],[0,.32]];
                                                              
export const FINIAL_SINK=.01;
export function finialGeometry(){return new LatheGeometry(FINIAL_PROFILE.map(([r,y])=>new Vector2(r,y)),12);}
                                                                                     
export function finialBandGeometry(){const g=new CylinderGeometry(.079,.079,.022,12,1,true);g.translate(0,.045,0);return g;}
                                                                                                          
export function finialMatrices(){return FINIAL_POSTS.map(p=>new Matrix4().makeTranslation(p.x,p.top-FINIAL_SINK,p.z));}

                                                                                                                              
export const TORO_YAW=[.35,-.5];
export function toroPlacements(){return POND_TORO.map(([x,z],i)=>({x,z,y:gardenFloor(x,z),yaw:TORO_YAW[i]??0}));}
                                                                                                           
export const TORO_SINK=.1;
export const TORO_BASE_RADIUS=.42;
export const TORO_GLOW=1.6;
export const glowIntensity=(lit:boolean)=>lit?TORO_GLOW:0;

const flat=(g:BufferGeometry)=>{const n=g.index?g.toNonIndexed():g;if(n!==g)g.dispose();return n;};
                                                                                                             
const hexPrism=(rTop:number,rBottom:number,y0:number,y1:number)=>{const g=new CylinderGeometry(rTop,rBottom,y1-y0,6,1);g.translate(0,(y0+y1)/2,0);return g;};
const round=(rTop:number,rBottom:number,y0:number,y1:number,seg=10)=>{const g=new CylinderGeometry(rTop,rBottom,y1-y0,seg,1);g.translate(0,(y0+y1)/2,0);return g;};
                                                                                                                                 
function hexRoofShape(g:BufferGeometry,R:number,lift:number,sag:number,rTop:number){
 const p=g.getAttribute('position');
 for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const th=Math.atan2(x,z);
  const phi=((th%(Math.PI/3))+Math.PI/3)%(Math.PI/3)-Math.PI/6,s=Math.cos(Math.PI/6)/Math.cos(phi);x*=s;z*=s;
  const r=Math.hypot(x,z)/R,corner=Math.cos(3*th)**8,t=Math.min(1,Math.max(0,(Math.hypot(x,z)-rTop)/(R-rTop)));
  y+=lift*corner*Math.max(0,(r-.55)/.45)**2-sag*Math.sin(Math.PI*t);p.setXYZ(i,x,y,z);}
 p.needsUpdate=true;g.computeVertexNormals();return g;
}
                                                            
export const TORO_LEVELS={baseTop:.18,tierTop:.26,shaftTop:1.0,platformTop:1.16,slabTop:1.22,railLow:1.27,fireTop:1.57,railTop:1.62,eaveTop:1.67,roofTop:1.93,ukebanaTop:1.98,top:2.22};
                                                                                                  
export function toroLocal(){
 const L=TORO_LEVELS,granite:BufferGeometry[]=[],glow:BufferGeometry[]=[];
 granite.push(hexPrism(TORO_BASE_RADIUS,TORO_BASE_RADIUS,-TORO_SINK,L.baseTop),hexPrism(.3,.36,L.baseTop,L.tierTop));     
 granite.push(round(.11,.13,L.tierTop,L.shaftTop),round(.145,.145,.6,.65));                      
 granite.push(hexPrism(.36,.2,L.shaftTop,L.platformTop),hexPrism(.36,.36,L.platformTop,L.slabTop));     
                                                                                                                       
 granite.push(hexPrism(.28,.28,L.slabTop,L.railLow),hexPrism(.29,.28,L.fireTop,L.railTop));
 for(let k=0;k<6;k++){const th=k*Math.PI/3,b=new BoxGeometry(.075,L.fireTop-L.railLow,.075);b.rotateY(th);b.translate(.25*Math.sin(th),(L.railLow+L.fireTop)/2,.25*Math.cos(th));granite.push(b);}
 glow.push(hexPrism(.2,.2,L.railLow,L.fireTop));
                                                                                
 const R=.62;const eave=new CylinderGeometry(R,R,L.eaveTop-L.railTop,12,1);eave.translate(0,(L.railTop+L.eaveTop)/2,0);granite.push(hexRoofShape(eave,R,.09,0,0));
 const roof=new CylinderGeometry(.09,R,L.roofTop-L.eaveTop,12,3);roof.translate(0,(L.eaveTop+L.roofTop)/2,0);granite.push(hexRoofShape(roof,R,.09,.04,.09));
 granite.push(round(.1,.08,L.roofTop,L.ukebanaTop,8));
 const jewel=new LatheGeometry([[0,0],[.06,0],[.1,.05],[.11,.1],[.09,.15],[.05,.19],[.02,.22],[0,L.top-L.ukebanaTop]].map(([r,y])=>new Vector2(r,y)),10);jewel.translate(0,L.ukebanaTop,0);granite.push(jewel);
 return {granite:granite.map(flat),glow:glow.map(flat)};
}
export type ToroPart={material:'granite'|'lanternGlow';geometry:BufferGeometry};
                                                                                                            
export function toroParts():ToroPart[]{
 const granite:BufferGeometry[]=[],glow:BufferGeometry[]=[];
 for(const p of toroPlacements()){const m=new Matrix4().makeRotationY(p.yaw).setPosition(p.x,p.y,p.z);const local=toroLocal();
  for(const g of local.granite){g.applyMatrix4(m);granite.push(g);}for(const g of local.glow){g.applyMatrix4(m);glow.push(g);}}
 const merge=(list:BufferGeometry[])=>{const g=mergeGeometries(list,false);for(const s of list)s.dispose();if(!g)throw new Error('toro merge failed');g.computeBoundingSphere();return g;};
 return [{material:'granite',geometry:merge(granite)},{material:'lanternGlow',geometry:merge(glow)}];
}
                                                                  
export function toroColliders(){return toroPlacements().map(({x,z})=>({x,z,radius:TORO_BASE_RADIUS+.08}));}
                                                                                                                        
export function cloneGlowMaterial(shared:MeshStandardMaterial,lit:boolean){
 const m=shared.clone();m.onBeforeCompile=shared.onBeforeCompile;m.customProgramCacheKey=shared.customProgramCacheKey;m.name=shared.name+'_toro';m.emissiveIntensity=glowIntensity(lit);return m;
}

                                                                                                                      
export function BridgeDetails({materials,lit}:{materials:GardenMaterials;lit:boolean}){
 const geo=useMemo(()=>({finial:finialGeometry(),band:finialBandGeometry(),toro:toroParts()}),[]);
 const finials=useMemo(()=>{const matrices=finialMatrices();const make=(g:BufferGeometry,name:'bronze'|'lacquer')=>{const mesh=new InstancedMesh(g,materials.get(name),matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=true;mesh.raycast=()=>{};mesh.name='Garden_finial_'+name;return mesh;};
  return [make(geo.finial,'bronze'),make(geo.band,'lacquer')];},[geo,materials]);
 const glow=useMemo(()=>cloneGlowMaterial(materials.get('lanternGlow'),false),[materials]);
 useEffect(()=>{glow.emissiveIntensity=glowIntensity(lit);},[glow,lit]);
 useEffect(()=>()=>glow.dispose(),[glow]);
 useEffect(()=>()=>{for(const m of finials)m.dispose();},[finials]);
 useEffect(()=>()=>{geo.finial.dispose();geo.band.dispose();for(const p of geo.toro)p.geometry.dispose();},[geo]);
 return <group name="Garden_bridge_details">
  {finials.map(m=><primitive key={m.name} object={m}/>)}
  {geo.toro.map(p=><mesh key={p.material} geometry={p.geometry} material={p.material==='lanternGlow'?glow:materials.get('granite')} castShadow={p.material==='granite'} receiveShadow raycast={()=>null}/>)}
 </group>;
}
