                                                                                   
                                                          
import {useEffect,useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import {BufferAttribute,BufferGeometry,DoubleSide} from 'three';
import {SPRAY_COLORS,type Ribbon,type TrayId} from '../../../packages/protocol/src/index';
import {ribbonPath,ribbonStrip,RIBBON_WIDTH,LOOP_WIDTH,RIBBON_PICK_MAX,type Cover} from './ribbon';

type Placed={id:string;trayId?:string;transform:{position:readonly [number,number,number];scale:number}};
const noRaycast=()=>{};

function RibbonMesh({ribbon,items,heights,offsets,cover,opacity=1}:{ribbon:Ribbon;items:readonly Placed[];heights:Readonly<Record<string,number|undefined>>;offsets:Readonly<Record<TrayId,number>>;cover:Cover;opacity?:number}){
 const {invalidate}=useThree();
 const geometry=useMemo(()=>{
  const path=ribbonPath(ribbon,items,heights,offsets,cover);if(!path||path.samples.length<2)return null;
  const strip=ribbonStrip(path.samples,path.closed,path.closed?LOOP_WIDTH:RIBBON_WIDTH,path.closed);
  const g=new BufferGeometry();g.setAttribute('position',new BufferAttribute(strip.positions,3));g.setIndex(new BufferAttribute(strip.indices,1));g.computeVertexNormals();return g;
 },[ribbon,items,heights,offsets,cover]);
 useEffect(()=>{invalidate();return()=>{geometry?.dispose();invalidate();};},[geometry,invalidate]);
 if(!geometry)return null;
 return <mesh geometry={geometry} raycast={noRaycast} name="ribbon" userData={{ribbonId:ribbon.id,closed:ribbon.closed}} castShadow={false}>
  <meshStandardMaterial color={SPRAY_COLORS[ribbon.color-1].hex} side={DoubleSide} roughness={0.55} transparent={opacity<1} opacity={opacity}/>
 </mesh>;
}

                                                                                                                               
export function RibbonsView({ribbons,preview,items,heights,offsets,cover,hiddenTray}:{ribbons:readonly Ribbon[];preview?:Ribbon|null;items:readonly Placed[];heights:Readonly<Record<string,number|undefined>>;offsets:Readonly<Record<TrayId,number>>;cover:Cover;hiddenTray?:TrayId|null}){
 const visible=(ribbon:Ribbon)=>{const first=items.find(item=>item.id===ribbon.objectIds[0]);return !!first&&(first.trayId??'dry')!==hiddenTray;};
 return <>
  {ribbons.filter(visible).map(ribbon=><RibbonMesh key={ribbon.id} ribbon={ribbon} items={items} heights={heights} offsets={offsets} cover={cover}/>)}
  {preview&&visible(preview)&&<RibbonMesh key="preview" ribbon={preview} items={items} heights={heights} offsets={offsets} cover={cover} opacity={0.5}/>}
 </>;
}

   
                                                                                                                                     
                                                                                               
   
export function RibbonPanel({ribbons,picked,color,disabled,onColor,onTie,onClear,onUntie,onClose}:{ribbons:readonly Ribbon[];picked:readonly string[];color:number;disabled:boolean;onColor:(color:number)=>void;onTie:(closed:boolean)=>void;onClear:()=>void;onUntie:(ribbonId:string)=>void;onClose:()=>void}){
 const ready=picked.length>=2&&!disabled;
 return <div id="ribbon-panel" className="ribbon-panel" role="group" aria-label="緞帶">
  <div className="spray-colors" role="radiogroup" aria-label="緞帶顏色">{SPRAY_COLORS.map((c,k)=><button key={c.hex} role="radio" aria-checked={color===k+1} aria-label={c.name} title={c.name} style={{background:c.hex}} onClick={()=>onColor(k+1)}/>)}</div>
  <p className="ribbon-hint" role="status">{picked.length?`已選 ${picked.length} 件（最多 ${RIBBON_PICK_MAX} 件）。再點一次可以取消。`:'在沙盤上或物件清單依序點物件（同一盤，2 到 6 件）。'}</p>
  <div className="ribbon-actions">
   <button className="primary" disabled={!ready} onClick={()=>onTie(false)}>連起來</button>
   <button className="primary" disabled={!ready} onClick={()=>onTie(true)}>圍一圈</button>
   <button disabled={!picked.length} onClick={onClear}>重選</button>
  </div>
  {ribbons.length>0&&<ul className="ribbon-list" aria-label="已綁的緞帶">{ribbons.map((ribbon,i)=><li key={ribbon.id}>
   <span className="ribbon-swatch" style={{background:SPRAY_COLORS[ribbon.color-1].hex}} aria-hidden="true"/>
   <span>緞帶 {i+1}・{ribbon.closed?'圍一圈':'連線'}・{ribbon.objectIds.length} 件</span>
   <button disabled={disabled} aria-label={`拆掉緞帶 ${i+1}`} onClick={()=>onUntie(ribbon.id)}>拆掉</button>
  </li>)}</ul>}
  <small>顏色代表什麼，由你自己決定。會談中雙方都看得到，也都能綁、拆。</small>
  <button onClick={onClose}>完成</button>
 </div>;
}
