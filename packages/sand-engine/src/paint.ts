import {CELLS_PER_CM,type Heightmap,type BrushTool} from './core';
import {strokeTray} from './tray';
                                                                                                                              
                                                                                                                             
                                                                                                                           
                                                                                                                          
export const SPRAY_RADIUS_CM=4;
const SPRAY_RC=SPRAY_RADIUS_CM*CELLS_PER_CM;
                                                                                                                                     
const SPRAY_CORE_Q8=128;
export function createPaint(hm:Heightmap){return new Uint8Array(hm.w*hm.h);}
                                                                                                     
function mist(i:number,j:number,ci:number,cj:number){
 let h=Math.imul(i,73856093)^Math.imul(j,19349663)^Math.imul(ci,83492791)^Math.imul(cj,50331653);
 h=Math.imul(h^(h>>>15),0x2c1b3c6d);h=Math.imul(h^(h>>>12),0x297a2d39);return (h^(h>>>15))&255;
}
                                                                                                                                      
                                                                                             
export function sprayTray(hm:Heightmap,paint:Uint8Array,color:number,points:readonly (readonly [number,number])[]){
 const {w,h,mask}=hm,rc2=SPRAY_RC*SPRAY_RC,core2=(rc2*SPRAY_CORE_Q8*SPRAY_CORE_Q8)>>16;
 for(const [ci,cj] of points){
  for(let j=Math.max(0,cj-SPRAY_RC);j<=Math.min(h-1,cj+SPRAY_RC);j++)for(let i=Math.max(0,ci-SPRAY_RC);i<=Math.min(w-1,ci+SPRAY_RC);i++){
   const k=j*w+i;if(!mask[k])continue;const d2=(i-ci)*(i-ci)+(j-cj)*(j-cj);if(d2>rc2)continue;
   if(d2<=core2||mist(i,j,ci,cj)<(((rc2-d2)*256)/(rc2-core2)|0))paint[k]=color;
  }
 }
}
                                                                                                                               
                                                            
export function strokeTrayPainted(hm:Heightmap,paint:Uint8Array,tool:BrushTool,points:readonly (readonly [number,number])[]){
 if(tool==='smooth'){strokeTray(hm,tool,points);return;}
 const before=hm.data.slice();strokeTray(hm,tool,points);
 for(let k=0;k<before.length;k++)if(before[k]!==hm.data[k])paint[k]=0;
}
                                                                                                                   
export function hasPaint(paint:Uint8Array){for(let k=0;k<paint.length;k++)if(paint[k])return true;return false;}
