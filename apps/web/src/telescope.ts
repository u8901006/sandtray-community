                                                                                   
                                                                     
import {cameraView} from './tray-layout';
import type {RoomTrays,TrayId} from '../../../packages/protocol/src/index';

type Vec3=[number,number,number];
                       
export const SCOPE_DURATIONS=[30,60,null] as const;
export type ScopeDuration=typeof SCOPE_DURATIONS[number];
export const SCOPE_DURATION_LABEL:Record<string,string>={'30':'30 秒','60':'1 分鐘','null':'不限時'};
                                        
export const SCOPE_ZOOM_DEFAULT=0.45;
                                                                             
export const ORBIT_MIN=4,ORBIT_MAX=70;
export type Scope={tray:TrayId;zoom:number;duration:ScopeDuration};

export const otherTray=(tray:TrayId):TrayId=>tray==='dry'?'wet':'dry';
const clamp=(v:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,v));

                                                                
export function scopeRange(focusDistance:number){
 const far=clamp(focusDistance*1.5,ORBIT_MIN,ORBIT_MAX),near=clamp(focusDistance*0.35,ORBIT_MIN,far);
 return {near,far};
}
                                           
export function scopePose(tray:TrayId,zoom:number,aspect:number,trays?:RoomTrays):{position:Vec3;target:Vec3}{
 const base=cameraView(tray,aspect,trays),t=base.target,d=base.position.map((v,i)=>v-t[i]) as Vec3;
 const length=Math.hypot(...d),{near,far}=scopeRange(length),distance=far+(near-far)*clamp(zoom,0,1);
 return {position:t.map((v,i)=>v+d[i]/length*distance) as Vec3,target:[...t] as Vec3};
}
                                   
export function scopeRemaining(endsAt:number|null,now:number){return endsAt===null?null:Math.max(0,Math.ceil((endsAt-now)/1000));}
export function formatRemaining(seconds:number){return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
                             
export const hiddenTrayOf=(scope:Scope|null):TrayId|null=>scope?otherTray(scope.tray):null;
