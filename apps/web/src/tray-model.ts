import {base64ToBytes,surfaceU8,type Heightmap,type BrushTool} from '../../../packages/sand-engine/src/core';
import {createTrayHeightmap,strokeTray,quantizeWater} from '../../../packages/sand-engine/src/tray';
import {CM_PER_UNIT,STANDARD_TRAY_CONFIG,trayConfigSchema,clampToTray,type TrayId,type TrayConfig} from '../../../packages/protocol/src/index';
export {CM_PER_UNIT};
                                                                                                                               
                                                                                                                              
                                                                                                   
                                                                                                                                  
export type Point=[number,number];
export interface TrayChanged {trayId:TrayId;trayRevision:number;operationId:string;stroke?:{tool:BrushTool;points:Point[]};waterLevel:number}
export interface SnapshotTray {id:string;shape?:string;sizeCm?:{w:number;h:number;depth:number};heightmap:{w:number;h:number;data:string};waterLevel:number;revision?:number}
                                                                                                        
export function traySize(config:TrayConfig){return {x:config.w/CM_PER_UNIT,z:config.h/CM_PER_UNIT,depth:config.depth/CM_PER_UNIT};}
                                                                             
export const TRAY_SIZE=traySize(STANDARD_TRAY_CONFIG);
                                                                                                                                     
                                                                                                                                  
                                              
export const MOUND_DISPLAY_SCALE=3;
                                                                                                                                    
                                                                                         
export function u8ToY(v:number,depthCm=7){const above=v-surfaceU8(depthCm);return (above>0?above*MOUND_DISPLAY_SCALE:above)/255*(depthCm+3)/CM_PER_UNIT;}
                                                                                                                                     
                                                                                                                                         
                                                                                                                                        
                                                                                                                                   
                                                                                                                                     
                                                                                                                        
const DUNE_BLUR_RADIUS=2,DUNE_BLUR_PASSES=3;
function blurPass(src:Float32Array,dst:Float32Array,w:number,h:number,r:number,horizontal:boolean){
 const lines=horizontal?h:w,len=horizontal?w:h,step=horizontal?1:w,stride=horizontal?w:1;
 for(let line=0;line<lines;line++){const base=line*stride;let sum=0;
  for(let k=0;k<=Math.min(r,len-1);k++)sum+=src[base+k*step];
  for(let k=0;k<len;k++){dst[base+k*step]=sum;const add=k+r+1,drop=k-r;if(add<len)sum+=src[base+add*step];if(drop>=0)sum-=src[base+drop*step];}}
}
                                                                                                                 
export const SAND_SINK=.08;
                                                                                                                                    
                                                                                                    
const FLOOR_SKIRT=SAND_SINK;
                                                                                                                                      
                                                                                                                            
const FLOOR_SINK_U8=12;
                                                                                                                                      
                                                                                                                                       
                                                                                                                           
export const BLUE_WALL_INSET=.25/CM_PER_UNIT;
                                                                   
export const CIRCLE_SEGMENTS=72;
                                                                                                                      
export const BLUE_LIP_Y=-.002;
                                                                                                                                      
                                                                                                                                                                
                                                                                                        
export function sandHeightsY(hm:Heightmap,out=new Float32Array(hm.data.length)){
 const s=surfaceU8(hm.depthCm),{w,h,data,mask}=hm,n=data.length,unit=(hm.depthCm+3)/255/CM_PER_UNIT,bottom=-hm.depthCm/CM_PER_UNIT-SAND_SINK;
                                                                                                                            
 let v=new Float32Array(n),m=new Float32Array(n),tv=new Float32Array(n),tm=new Float32Array(n),flat=true;
 for(let k=0;k<n;k++)if(mask[k]){const d=data[k]-s;m[k]=1;if(d>0){v[k]=d*MOUND_DISPLAY_SCALE*unit;flat=false;}}
 if(!flat)for(let pass=0;pass<DUNE_BLUR_PASSES;pass++){
  blurPass(v,tv,w,h,DUNE_BLUR_RADIUS,true);blurPass(m,tm,w,h,DUNE_BLUR_RADIUS,true);blurPass(tv,v,w,h,DUNE_BLUR_RADIUS,false);blurPass(tm,m,w,h,DUNE_BLUR_RADIUS,false);
  for(let k=0;k<n;k++){v[k]=mask[k]&&m[k]>0?v[k]/m[k]:0;m[k]=mask[k];}
 }
                                                                                                                                         
                                                                                                                                      
                                                                                                                                         
                                                                                                                                       
                                                                                                        
 for(let k=0;k<n;k++){const y=v[k]+Math.min(data[k]-s,0)*unit;out[k]=!mask[k]?0:data[k]<FLOOR_SINK_U8?y-SAND_SINK*Math.max(0,1-v[k]/FLOOR_SKIRT)*(1-data[k]/FLOOR_SINK_U8):y;}
 return out;
}
                                                                                                                                         
                                                                                                                                           
export function insideBlueWall(config:TrayConfig,x:number,z:number){
 const hx=config.w/CM_PER_UNIT/2-BLUE_WALL_INSET,hz=config.h/CM_PER_UNIT/2-BLUE_WALL_INSET;
 if(config.shape==='circle')return Math.hypot(x,z)<=(config.w/CM_PER_UNIT/2)*Math.cos(Math.PI/CIRCLE_SEGMENTS)-BLUE_WALL_INSET;
 if(config.shape==='octagon')return Math.max(Math.abs(x),Math.abs(z),(Math.abs(x)+Math.abs(z))/Math.SQRT2)<=hx;
 return Math.abs(x)<=hx&&Math.abs(z)<=hz;
}
                                                                                                                                  
                                                                                                                                   
                                                                                                           
export function insideBlueWallPolygon(config:TrayConfig,x:number,z:number){
 if(config.shape!=='circle')return insideBlueWall(config,x,z);
 const step=Math.PI*2/CIRCLE_SEGMENTS,sector=Math.floor(Math.atan2(z,x)/step),normal=(sector+.5)*step;
 return x*Math.cos(normal)+z*Math.sin(normal)<=(config.w/CM_PER_UNIT/2-BLUE_WALL_INSET)*Math.cos(Math.PI/CIRCLE_SEGMENTS);
}
                                                                                                                
export function cellAt(hm:Heightmap,x:number,z:number):Point|undefined{
 const i=Math.floor((x/(hm.sizeCm.w/CM_PER_UNIT)+.5)*hm.w),j=Math.floor((z/(hm.sizeCm.h/CM_PER_UNIT)+.5)*hm.h);
 return i>=0&&j>=0&&i<hm.w&&j<hm.h&&hm.mask[j*hm.w+i]?[i,j]:undefined;
}
const configOf=(hm:Heightmap):TrayConfig=>({shape:hm.shape,w:hm.sizeCm.w,h:hm.sizeCm.h,depth:hm.depthCm});
                                                                                                                                        
                                                                                                                                     
                                                                                                
                                                             
export function sandVerticesXZ(hm:Heightmap){
 const {w,h,mask}=hm,config=configOf(hm),sx=hm.sizeCm.w/CM_PER_UNIT,sz=hm.sizeCm.h/CM_PER_UNIT,out=new Float32Array(w*h*2);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const k=j*w+i;let x=((i+.5)/w-.5)*sx,z=((j+.5)/h-.5)*sz;if(!mask[k])[x,z]=clampToTray(config,x,z);out[k*2]=x;out[k*2+1]=z;}
 return out;
}
                                                                                                                                   
                                                        
                                                                                                                                       
                                                                                                                                        
             
export function sandIndex(hm:Heightmap){
 const {w,h}=hm,xz=sandVerticesXZ(hm),index:number[]=[];
 for(let j=0;j<h-1;j++)for(let i=0;i<w-1;i++){const a=j*w+i;if(!quadHasSand(hm,a))continue;
  if(facesUp(xz,a,a+w,a+1))index.push(a,a+w,a+1);if(facesUp(xz,a+1,a+w,a+w+1))index.push(a+1,a+w,a+w+1);}
 return index;
}
const facesUp=(xz:Float32Array,a:number,b:number,c:number)=>(xz[b*2]-xz[a*2])*(xz[c*2+1]-xz[a*2+1])-(xz[c*2]-xz[a*2])*(xz[b*2+1]-xz[a*2+1])<-1e-12;
export function quadHasSand(hm:Heightmap,a:number){const {w,mask}=hm;return !!(mask[a]||mask[a+1]||mask[a+w]||mask[a+w+1]);}
                                                                                                   
const heightCache=new WeakMap<Heightmap,{data:Uint8Array;heights:Float32Array;xz:Float32Array}>();
function cached(hm:Heightmap){
 const hit=heightCache.get(hm);if(hit&&hit.data.length===hm.data.length&&hit.data.every((v,k)=>v===hm.data[k]))return hit;
 const next={data:hm.data.slice(),heights:sandHeightsY(hm),xz:hit&&hit.xz.length===hm.data.length*2?hit.xz:sandVerticesXZ(hm)};heightCache.set(hm,next);return next;
}
                                                                                                                                      
                                                                                                                                    
                                 
export function surfaceY(hm:Heightmap,x:number,z:number){
 const {heights:y,xz}=cached(hm),{w,h}=hm,floor=-hm.depthCm/CM_PER_UNIT;
                                                                                                                                
                                                                                                            
 const behind=!insideBlueWallPolygon(configOf(hm),x,z),seen=(sand:number)=>behind?Math.max(sand,BLUE_LIP_Y):Math.max(sand,floor);
 const gx=(x/(hm.sizeCm.w/CM_PER_UNIT)+.5)*w-.5,gz=(z/(hm.sizeCm.h/CM_PER_UNIT)+.5)*h-.5;
 const tri=(p:number,q:number,r:number)=>{
  const [x1,z1,x2,z2,x3,z3]=[xz[p*2],xz[p*2+1],xz[q*2],xz[q*2+1],xz[r*2],xz[r*2+1]],det=(z2-z3)*(x1-x3)+(x3-x2)*(z1-z3);if(Math.abs(det)<1e-12)return undefined;
  const l1=((z2-z3)*(x-x3)+(x3-x2)*(z-z3))/det,l2=((z3-z1)*(x-x3)+(x1-x3)*(z-z3))/det,l3=1-l1-l2,e=-1e-9;
  return l1>=e&&l2>=e&&l3>=e?l1*y[p]+l2*y[q]+l3*y[r]:undefined;};
                                                                                                                          
 const ci=Math.floor(gx),cj=Math.floor(gz);
 for(let j=Math.max(0,cj-2);j<=Math.min(h-2,cj+2);j++)for(let i=Math.max(0,ci-2);i<=Math.min(w-2,ci+2);i++){
  const a=j*w+i;if(!quadHasSand(hm,a))continue;const found=(facesUp(xz,a,a+w,a+1)?tri(a,a+w,a+1):undefined)??(facesUp(xz,a+1,a+w,a+w+1)?tri(a+1,a+w,a+w+1):undefined);if(found!==undefined)return seen(found);
 }
                                                                                                                                       
                                                                                                                                         
 let best=Infinity,near=0;
 const closest=(p:number,q:number,r:number)=>{const P=[p,q,r];
  for(let e=0;e<3;e++){const A=P[e],B=P[(e+1)%3],ax=xz[A*2],az=xz[A*2+1],dx=xz[B*2]-ax,dz=xz[B*2+1]-az,len=dx*dx+dz*dz;if(len<1e-18)continue;
   const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/len)),d=Math.hypot(x-ax-t*dx,z-az-t*dz);if(d<best){best=d;near=y[A]+(y[B]-y[A])*t;}}};
 for(let j=Math.max(0,cj-2);j<=Math.min(h-2,cj+2);j++)for(let i=Math.max(0,ci-2);i<=Math.min(w-2,ci+2);i++){
  const a=j*w+i;if(!quadHasSand(hm,a))continue;if(facesUp(xz,a,a+w,a+1))closest(a,a+w,a+1);if(facesUp(xz,a+1,a+w,a+w+1))closest(a+1,a+w,a+w+1);
 }
 if(best<=SLIVER&&!behind)return seen(near);                                                
 return behind?BLUE_LIP_Y:0;                                                                                          
}
                                                                                            
const SLIVER=.015/CM_PER_UNIT;
const sameConfig=(a:TrayConfig,b:TrayConfig)=>a.shape===b.shape&&a.w===b.w&&a.h===b.h&&a.depth===b.depth;
export class TrayModel {
 config:TrayConfig;confirmed:Heightmap;display:Heightmap;revision=0;water=0;version=0;
 pending:{id:string;tool:BrushTool;points:Point[]}[]=[];
 private listeners=new Set<()=>void>();
 private rippleListeners=new Set<(x:number,z:number,strength:number)=>void>();
 constructor(readonly id:TrayId,config:TrayConfig=STANDARD_TRAY_CONFIG){this.config=config;this.confirmed=createTrayHeightmap(config);this.display=createTrayHeightmap(config);}
 subscribe(listener:()=>void){this.listeners.add(listener);return()=>{this.listeners.delete(listener);};}
 private changed(){this.version++;for(const listener of this.listeners)listener();}
                                                                                                                       
 onRipple(listener:(x:number,z:number,strength:number)=>void){this.rippleListeners.add(listener);return()=>{this.rippleListeners.delete(listener);};}
 ripple(x:number,z:number,strength=1){for(const listener of this.rippleListeners)listener(x,z,strength);}
 private rippleAt([i,j]:Point){const size=traySize(this.config);this.ripple(((i+.5)/this.confirmed.w-.5)*size.x,((j+.5)/this.confirmed.h-.5)*size.z,.6);}
 private rebuild(){this.display.data.set(this.confirmed.data);for(const p of this.pending)strokeTray(this.display,p.tool,p.points);this.changed();}
                                                                                                                                        
 configure(config:TrayConfig){
  if(sameConfig(config,this.config))return false;
  this.config=config;this.confirmed=createTrayHeightmap(config);this.display=createTrayHeightmap(config);this.revision=0;this.water=0;this.pending=[];this.changed();return true;
 }
                                                                                         
 adopt(tray:SnapshotTray){
  if(tray.shape&&tray.sizeCm){const parsed=trayConfigSchema.safeParse({shape:tray.shape,...tray.sizeCm});if(!parsed.success)throw new Error('TRAY_SHAPE_UNSUPPORTED');this.configure(parsed.data);}
  const revision=tray.revision??0;if(revision<this.revision)return;
  const data=base64ToBytes(tray.heightmap.data);if(tray.heightmap.w!==this.confirmed.w||tray.heightmap.h!==this.confirmed.h||data.length!==this.confirmed.data.length)throw new Error('TRAY_SHAPE_UNSUPPORTED');
  this.confirmed.data.set(data);this.revision=revision;this.water=tray.waterLevel;this.rebuild();
 }
                                                                                                    
 replay(event:TrayChanged){
  if(event.trayRevision<=this.revision)return true;if(event.trayRevision!==this.revision+1)return false;
  if(event.stroke){strokeTray(this.confirmed,event.stroke.tool,event.stroke.points);
                                                                                                         
   if(!this.pending.some(p=>p.id===event.operationId))this.rippleAt(event.stroke.points[event.stroke.points.length-1]);}
  this.water=event.waterLevel;this.revision=event.trayRevision;
  this.pending=this.pending.filter(p=>p.id!==event.operationId);this.rebuild();return true;
 }
                                                                                      
 stroke(id:string,tool:BrushTool,point:Point){
  let open=this.pending.at(-1);if(!open||open.id!==id){open={id,tool,points:[]};this.pending.push(open);}
  open.points.push(point);strokeTray(this.display,tool,[point]);this.rippleAt(point);this.changed();
 }
 drop(id:string){const before=this.pending.length;this.pending=this.pending.filter(p=>p.id!==id);if(this.pending.length!==before)this.rebuild();}
                                                                 
 applyLocal(tool:BrushTool,point:Point){strokeTray(this.confirmed,tool,[point]);strokeTray(this.display,tool,[point]);this.rippleAt(point);this.changed();}
 setLocalWater(level:number){this.water=quantizeWater(level);this.changed();}
                                                                         
 restoreLocal(data:Uint8Array,water:number){this.confirmed.data.set(data);this.water=water;this.rebuild();}
                                                                                                                                  
 clearPending(){if(this.pending.length){this.pending=[];this.rebuild();}}
}
