                                                                                    
                                                                             
import {CM_PER_UNIT,type RoomTrays,type TunnelStyle} from '../../../packages/protocol/src/index';
import {trayOffsets} from './tray-layout';
import rows from '../../../packages/asset-catalog/src/tunnel-v1.json' with {type:'json'};

export const TUNNEL_STYLES:readonly TunnelStyle[]=['arch_short','tunnel_long','play_tunnel'];
export const TUNNEL_LABEL:Record<TunnelStyle,string>={arch_short:'短拱隧道',tunnel_long:'長隧道',play_tunnel:'布製遊戲隧道'};
                                                                                                    
export function tunnelAsset(style:TunnelStyle){const row=rows.find(r=>r.id==='TUN_'+style.toUpperCase())!;return {url:row.url,thumbnail:row.thumbnail};}

                                                                                                                               
export const RIM=0.25,RIM_TOP=0.27;
                                                                                                       
const OVERLAP=0.15;
                                                                                                   
export const TUNNEL_MAX_HEIGHT=1.1;
   
                                                                                                                                      
                                                                                                                                   
                                                                                                                  
   
export function tunnelPlacement(trays:RoomTrays){
 const o=trayOffsets(trays),dryEdge=o.dry+trays.dry.w/CM_PER_UNIT/2,wetEdge=o.wet-trays.wet.w/CM_PER_UNIT/2;
 return {x:(dryEdge+wetEdge)/2,y:RIM_TOP,z:0,gap:wetEdge-dryEdge,length:wetEdge-dryEdge+2*OVERLAP,dryEdge,wetEdge};
}
   
                                                                                                                                     
                                                                                                               
   
export function tunnelScale(span:{y:number;z:number},length:number):{across:number;along:number}{
 if(!(span.y>0)||!(span.z>0))return {across:1,along:1};
 const along=length/span.z;return {across:Math.min(along,TUNNEL_MAX_HEIGHT/span.y),along};
}
