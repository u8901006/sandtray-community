import {CM_PER_UNIT,STANDARD_ROOM_TRAYS,type RoomTrays,type TrayId} from '../../../packages/protocol/src/index';
                                                                                                                 
                                                                                                                            
const GAP=1.2;
                                                                                    
export function trayOffsets(trays:RoomTrays=STANDARD_ROOM_TRAYS):Record<TrayId,number>{
 const dry=trays.dry.w/CM_PER_UNIT/2,wet=trays.wet.w/CM_PER_UNIT/2,span=dry*2+GAP+wet*2,left=-span/2;
 const round=(v:number)=>Math.round(v*1e6)/1e6;
 return {dry:round(left+dry),wet:round(left+dry*2+GAP+wet)};
}
export const TRAY_OFFSET_X=trayOffsets();
export const CAMERA_FOV=42;
                                                      
export const CAMERA_ANGLE=[0,13,15] as const;
                                                                                                                                         
                                                                                                       
export type CameraKind='angle'|'top'|'dry'|'wet'|'low';
export function cameraPosition(kind:'angle'|'top',aspect:number,trays?:RoomTrays):[number,number,number]{return cameraView(kind,aspect,trays).position;}
                                                                                                      
export function cameraView(kind:CameraKind,aspect:number,trays:RoomTrays=STANDARD_ROOM_TRAYS){
 const t=Math.tan(CAMERA_FOV*Math.PI/360),a=aspect>0&&Number.isFinite(aspect)?aspect:1.6,single=kind==='dry'||kind==='wet';
 const offsets=trayOffsets(trays),half=(id:TrayId)=>({x:trays[id].w/CM_PER_UNIT/2,z:trays[id].h/CM_PER_UNIT/2});
                                                                                                                               
 const scaleX=single?half(kind).x/5:(offsets.wet+half('wet').x)/10.6,scaleZ=single?half(kind).z/3.96:Math.max(half('dry').z,half('wet').z)/3.96;
 const distance=Math.max((single?5.5:11.4)*scaleX/(t*a),(kind==='top'?4.6:5.4)*scaleZ/t)*1.08;
 const dir=kind==='top'?[0,1,0.0005]:kind==='low'?[0,5/Math.hypot(5,15),15/Math.hypot(5,15)]:[0,13/Math.hypot(13,15),15/Math.hypot(13,15)];
 const x=single?offsets[kind]:0;
 return {position:[x+dir[0]*distance,dir[1]*distance,dir[2]*distance] as [number,number,number],target:[x,0,0] as [number,number,number]};
}
