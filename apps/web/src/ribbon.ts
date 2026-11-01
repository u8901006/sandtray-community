                                                                                         
                                                                        
                                                                   
import {CatmullRomCurve3,Vector3} from 'three';
import {RIBBON_MAX,type Ribbon,type TrayId} from '../../../packages/protocol/src/index';
export {RIBBON_MAX};
type Vec3=readonly [number,number,number];
type Placed={id:string;trayId?:string;transform:{position:Vec3;scale:number}};
export type Cover=ReadonlyMap<string,{position:Vec3;top:number}>;
                                                             
export const RIBBON_PICK_MAX=6;
                                                                                                                                              
const TOUCH_SHARE=0.55,RIBBON_TOUCH_MAX=2;
                                                                                                                       
export const LOOP_MARGIN=0.6,LOOP_LIFT=0.2;
                                                                                                                 
export const RIBBON_WIDTH=0.14,LOOP_WIDTH=0.2;

export interface RibbonAnchors {trayId:TrayId;points:Vec3[];bases:number[]}
   
                                                                                                                                        
                                                                                                                                         
                                                                                         
   
export function ribbonAnchors(ribbon:Ribbon,items:readonly Placed[],heights:Readonly<Record<string,number|undefined>>,offsets:Readonly<Record<TrayId,number>>,cover:Cover):RibbonAnchors|null{
 const found=ribbon.objectIds.map(id=>items.find(item=>item.id===id)).filter((item):item is Placed=>!!item);
 if(found.length<2)return null;
 const trayId=(found[0].trayId??'dry') as TrayId;if(found.some(item=>(item.trayId??'dry')!==trayId))return null;
 const ox=offsets[trayId],points:Vec3[]=[],bases:number[]=[];
 for(const item of found){
  const under=cover.get(item.id);
  if(under){const [x,y,z]=under.position;points.push([ox+x,under.top+0.05,z]);bases.push(y);continue;}
  const [x,y,z]=item.transform.position,h=(heights[item.id]??1)*item.transform.scale;
  points.push([ox+x,y+Math.min(h*TOUCH_SHARE,RIBBON_TOUCH_MAX),z]);bases.push(y);
 }
 return {trayId,points,bases};
}

                                                                                                                                          
export function lineControls(points:readonly Vec3[]):Vec3[]{
 const out:Vec3[]=[];
 points.forEach((p,i)=>{
  if(i>0){const q=points[i-1],d=Math.hypot(p[0]-q[0],p[2]-q[2]);out.push([(p[0]+q[0])/2,Math.max(p[1],q[1])+0.2+0.12*d,(p[2]+q[2])/2]);}
  out.push([p[0],p[1],p[2]]);
 });
 return out;
}

                                                                                                    
export function hull2d(points:readonly (readonly [number,number])[]):[number,number][]{
 const p=[...points].map(([x,z])=>[x,z] as [number,number]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 if(p.length<3)return p;
 const cross=(o:[number,number],a:[number,number],b:[number,number])=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
 const lower:[number,number][]=[],upper:[number,number][]=[];
 for(const q of p){while(lower.length>=2&&cross(lower[lower.length-2],lower[lower.length-1],q)<=1e-9)lower.pop();lower.push(q);}
 for(const q of [...p].reverse()){while(upper.length>=2&&cross(upper[upper.length-2],upper[upper.length-1],q)<=1e-9)upper.pop();upper.push(q);}
 return lower.slice(0,-1).concat(upper.slice(0,-1));
}
   
                                                                                                                                         
                                                                                                                             
   
export function loopControls(anchors:RibbonAnchors):Vec3[]{
 const ring:[number,number][]=[];
 for(const [x,,z] of anchors.points)for(let k=0;k<12;k++){const a=k/12*Math.PI*2;ring.push([x+Math.cos(a)*LOOP_MARGIN,z+Math.sin(a)*LOOP_MARGIN]);}
 const y=Math.max(...anchors.bases)+LOOP_LIFT;
 return hull2d(ring).map(([x,z])=>[x,y,z]);
}

                                                                                                             
export function ribbonSamples(controls:readonly Vec3[],closed:boolean,perSegment=10):Vec3[]{
 if(controls.length<2)return [];
 const curve=new CatmullRomCurve3(controls.map(([x,y,z])=>new Vector3(x,y,z)),closed,'centripetal');
 const n=Math.max(8,(closed?controls.length:controls.length-1)*perSegment);
 return curve.getSpacedPoints(n).slice(0,closed?n:n+1).map(v=>[v.x,v.y,v.z] as Vec3);
}

   
                                                                                                                                           
                                                                                                
   
export function ribbonStrip(samples:readonly Vec3[],closed:boolean,width:number,upright:boolean){
 const n=samples.length,positions=new Float32Array(n*6),half=width/2;
 for(let i=0;i<n;i++){
  const prev=samples[closed?(i-1+n)%n:Math.max(0,i-1)],next=samples[closed?(i+1)%n:Math.min(n-1,i+1)];
  let sx=0,sy=1,sz=0;
  if(!upright){const tx=next[0]-prev[0],tz=next[2]-prev[2],len=Math.hypot(tx,tz);if(len>1e-6){sx=-tz/len;sy=0;sz=tx/len;}else{sx=1;sy=0;sz=0;}}
  const [x,y,z]=samples[i];
  positions.set([x-sx*half,y-sy*half,z-sz*half,x+sx*half,y+sy*half,z+sz*half],i*6);
 }
 const quads=closed?n:n-1,indices=new Uint32Array(Math.max(0,quads)*6);
 for(let i=0;i<quads;i++){const a=i*2,b=((i+1)%n)*2;indices.set([a,a+1,b,a+1,b+1,b],i*6);}
 return {positions,indices};
}

                                                                                             
export function ribbonPath(ribbon:Ribbon,items:readonly Placed[],heights:Readonly<Record<string,number|undefined>>,offsets:Readonly<Record<TrayId,number>>,cover:Cover){
 const anchors=ribbonAnchors(ribbon,items,heights,offsets,cover);if(!anchors)return null;
 const closed=ribbon.closed;
 return {trayId:anchors.trayId,closed,samples:ribbonSamples(closed?loopControls(anchors):lineControls(anchors.points),closed)};
}

export type PickResult={picked:string[];notice?:string};
                                                                                                                                                  
export function pickRibbonObject(picked:readonly string[],item:{id:string;trayId?:string},trayOf:(id:string)=>string|undefined):PickResult{
 if(picked.includes(item.id))return {picked:picked.filter(id=>id!==item.id)};
 if(picked.length&&trayOf(picked[0])!==(item.trayId??'dry'))return {picked:[...picked],notice:'緞帶只能連同一盤裡的物件。'};
 if(picked.length>=RIBBON_PICK_MAX)return {picked:[...picked],notice:'一條緞帶最多連 6 件物件。'};
 return {picked:[...picked,item.id]};
}
