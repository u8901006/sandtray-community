                                                                             
                                                                                            
import {useEffect,useMemo,useState} from 'react';
import {useThree} from '@react-three/fiber';
import {Box3,Group,Vector3} from 'three';
import {acquireAsset} from './asset-pool';
import {tunnelAsset,tunnelPlacement,tunnelScale,TUNNEL_STYLES,TUNNEL_LABEL} from './tunnel';
import type {RoomTrays,Tunnel,TunnelStyle} from '../../../packages/protocol/src/index';

export function TunnelView({style,trays,onReady}:{style:TunnelStyle;trays:RoomTrays;onReady?:(ok:boolean)=>void}){
 const [model,setModel]=useState<Group>();const {invalidate}=useThree();
 const place=useMemo(()=>tunnelPlacement(trays),[trays]);
 useEffect(()=>{let active=true;const handle=acquireAsset(tunnelAsset(style).url);setModel(undefined);
  void handle.promise.then(root=>{if(!active)return;const instance=root.clone(true);
                                                                                                               
   const size=new Box3().setFromObject(instance).getSize(new Vector3()),k=tunnelScale({y:size.y,z:size.z},place.length);
   instance.scale.set(k.across,k.across,k.along);instance.traverse(node=>{node.raycast=()=>{};});
   const wrapper=new Group();wrapper.rotation.y=Math.PI/2;wrapper.add(instance);wrapper.name='tunnel';wrapper.userData.style=style;
   setModel(wrapper);onReady?.(true);invalidate();
  }).catch(()=>{if(active)onReady?.(false);});
  return()=>{active=false;handle.release();invalidate();};
 },[style,place.length]);
 if(!model)return null;
 return <primitive object={model} position={[place.x,place.y,place.z]}/>;
}

                                                                                                                               
export function TunnelPanel({tunnel,disabled,onChange,onClose}:{tunnel:Tunnel;disabled:boolean;onChange:(next:{enabled:boolean;style:TunnelStyle})=>void;onClose:()=>void}){
 return <div id="tunnel-panel" className="tunnel-panel" role="group" aria-label="隧道">
  <label className="tunnel-switch"><input type="checkbox" checked={tunnel.enabled} disabled={disabled} onChange={e=>onChange({enabled:e.target.checked,style:tunnel.style})}/>在兩盤之間放隧道</label>
  <div className="tunnel-row" role="radiogroup" aria-label="隧道外觀">{TUNNEL_STYLES.map(style=><button key={style} role="radio" aria-checked={tunnel.style===style} disabled={disabled} onClick={()=>{if(style!==tunnel.style||!tunnel.enabled)onChange({enabled:true,style});}}><img src={tunnelAsset(style).thumbnail} alt="" loading="lazy" draggable={false}/><span>{TUNNEL_LABEL[style]}</span></button>)}</div>
  <small>只是連接兩盤的樣子，物件不會從一盤走到另一盤。會談中雙方都看得到，也都能開關。</small>
  <button onClick={onClose}>完成</button>
 </div>;
}
