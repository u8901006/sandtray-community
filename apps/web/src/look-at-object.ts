                                                                  
                                         
export type Vec3=[number,number,number];
export const FOCUS_NEAR=5;
export const FOCUS_FAR=12;
                                             
export const FOCUS_MIN_ELEVATION=0.3;
const DEFAULT_DIR:Vec3=[0,13/Math.hypot(13,15),15/Math.hypot(13,15)];

                                               
export function focusPose(camera:Vec3,target:Vec3,object:Vec3,height:number,near=FOCUS_NEAR,far=FOCUS_FAR):{position:Vec3;target:Vec3}{
 const aim:Vec3=[object[0],object[1]+Math.max(0,Math.min(height,4))*0.4,object[2]];
 let dir:Vec3=[camera[0]-target[0],camera[1]-target[1],camera[2]-target[2]];
 const length=Math.hypot(...dir);
 dir=length>1e-6&&dir.every(Number.isFinite)?[dir[0]/length,dir[1]/length,dir[2]/length]:DEFAULT_DIR;
 if(dir[1]<FOCUS_MIN_ELEVATION){
  const flat=Math.hypot(dir[0],dir[2]),cos=Math.sqrt(1-FOCUS_MIN_ELEVATION**2);
  dir=flat>1e-6?[dir[0]/flat*cos,FOCUS_MIN_ELEVATION,dir[2]/flat*cos]:DEFAULT_DIR;
 }
 const distance=Math.min(far,Math.max(near,Number.isFinite(length)&&length>0?length:far));
 return {position:[aim[0]+dir[0]*distance,aim[1]+dir[1]*distance,aim[2]+dir[2]*distance],target:aim};
}

                                         
export function easeOut(t:number){const k=Math.min(1,Math.max(0,t));return 1-(1-k)**3;}
export function lerp3(a:Vec3,b:Vec3,t:number):Vec3{return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
