import {SandtraySurface,type SandTool,type SculptHandlers,type HoverHandler} from './sandtray-surface';
import {listableAsset} from './asset-listing';
import {TrayModel,surfaceY,traySize,type Point} from './tray-model';
import {trayOffsets,CAMERA_ANGLE,cameraView,type CameraKind} from './tray-layout';
import {TraySetup,describeTray} from './tray-setup';
import {CanvasLifecycle} from './canvas-lifecycle';
import React,{useState,useEffect,useRef,useMemo,useCallback} from 'react';
import {createRoot} from 'react-dom/client';
import {Canvas,useThree,useFrame} from '@react-three/fiber';
import {OrbitControls,TransformControls,Html} from '@react-three/drei';
import {Group,Quaternion,Euler,Vector3,Plane,PCFShadowMap,type Mesh,type MeshBasicMaterial} from 'three';
import {devAssets,readyAssetCount,resolveAsset,supportsColorVariants,COLOR_VARIANT_OPTIONS,type DevAssetId} from '../../../packages/asset-catalog/src/index';
import {validTransform,colorVariantHex,clampToTray,trayHalfUnits,roomTraysSchema,STANDARD_ROOM_TRAYS,STANDARD_TRAY_CONFIG,type Transform,type ColorVariant,type TrayId,type TrayConfig,type RoomTrays} from '../../../packages/protocol/src/index';
import {Model} from './catalog-model';
import {api} from './shared-room';
import './style.css';
import {pathPosition} from '../../../packages/room-core/src/animation';
import {useSharedRoom} from './shared-room';
import type {AssetLoadFailure} from './asset-pool';
                                                                                                                              
function loadStatusText(reason:AssetLoadFailure|undefined){return reason==='UNAUTHENTICATED'?'登入已失效，請重新登入後再載入模型':reason==='PERMISSION_DENIED'?'會談已結束或沒有這件素材的存取資格，作品仍保留':'模型載入失敗，作品仍保留';}
import {SessionTools,type PhotoView} from './session-tools';
import {buriedDepth,keepDepth,buryDeeper,digOut} from './bury';
import {RoomLighting,GroundContact,WaterlineFoam,waterlineAt,FloatingMotes,GlowHalo} from './room-lighting';
import {MOOD_LOOK,MOOD_LABEL,ROOM_MOODS,readMood,writeMood,glowFor,type RoomMood,type Glow} from './room-moods';
import type {ModelSize} from './catalog-model';
import {EntryGate} from './entry-gate';
import {AdminPanel} from './admin-panel';
import {useGarden,GardenControls,GardenWorld,GardenWalk} from './garden-experience';
import {PngCaptureBridge,type PngCapture} from './png-export';
import {Credits,ProvenanceLine} from './credits';
import {shelfGroups} from './shelf-groups';
import {ROLE_COLOR,therapistHolds,dropOffset,DROP_HEIGHT,isSoftwareRenderer,rendererName,landingSquash,SETTLE_SINK_MS,peerStatusText,type ViewerRole} from './presence';
import {remoteMotion,settleProgress,nlerpQuat,SETTLE_MS} from './remote-motion';
import {CameraPoseBridge,type CameraPose} from './png-export';
import {statusTone} from './status-tone';
import {StatusChip} from './status-chip';
import {pushRecent,toggleFavourite,visibleIds,readIds,writeIds,RECENT_KEY,FAVOURITE_KEY} from './shelf-memory';
import {ToolIcon,ViewIcon,EyeIcon,ShelfIcon,DetailIcon} from './ui-icons';
import {focusPose,easeOut,lerp3,type Vec3} from './look-at-object';
import {helpCards} from './help-cards';
import {placeQuickTools,quickToolsTransform,type QuickToolsPlacement} from './quick-tools-placement';
import {ObjectMark} from './object-mark';
const reducedMotion=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function readPref(key:string,fallback:boolean){try{const v=localStorage.getItem(key);return v===null?fallback:v==='1';}catch{return fallback;}}
function writePref(key:string,value:boolean){try{localStorage.setItem(key,value?'1':'0');}catch{/* private window: the panel still toggles */}}
                                                    
function SandPuff({onDone}:{onDone:()=>void}){
 const refs=useRef<(Mesh|null)[]>([]);const start=useRef(performance.now());const {invalidate}=useThree();const done=useRef(false);
 useEffect(()=>{invalidate();},[invalidate]);
 useFrame(()=>{const t=(performance.now()-start.current)/450;
  refs.current.forEach((m,k)=>{if(!m)return;const a=k/6*Math.PI*2,r=.35+.5*Math.min(1,t);m.position.set(Math.cos(a)*r,.05+.25*Math.sin(Math.min(1,t)*Math.PI),Math.sin(a)*r);(m.material as MeshBasicMaterial).opacity=Math.max(0,.7*(1-t));});
  if(t>=1){if(!done.current){done.current=true;onDone();}}else invalidate();});
 return <>{Array.from({length:6},(_,k)=><mesh key={k} ref={m=>{refs.current[k]=m;}} raycast={()=>null}><sphereGeometry args={[.05,8,6]}/><meshBasicMaterial color="#d8c7a0" transparent opacity={.7} depthWrite={false}/></mesh>)}</>;
}
type Item={id:string;assetId:DevAssetId;assetVersion?:string;trayId?:TrayId;transform:Transform;materialOverrides?:Record<string,string>;colorVariant?:ColorVariant;hidden?:boolean;revision?:number;animation?:Parameters<typeof pathPosition>[0]};
                                                             
const glowCache=new Map<string,Glow|undefined>();
function glowOf(assetId:string,strength:number){if(!glowCache.has(assetId))glowCache.set(assetId,glowFor(resolveAsset(assetId)?.name));const glow=glowCache.get(assetId);return glow?{glow,strength}:undefined;}
function ObjectView({item,selected,editable=true,clockOffset=0,retryToken=0,roomId=null,mode,originX=0,tray=STANDARD_TRAY_CONFIG,groundAt,onSelect,onChange,onLoad,ringColor='#426253',heldByTherapist=false,dropIn=false,onDragStart,onDragMove,onDragCancel,waterY,glow}:{item:Item;selected:boolean;ringColor?:string;heldByTherapist?:boolean;dropIn?:boolean;onDragStart?:()=>void;onDragMove?:(t:Transform)=>void;onDragCancel?:()=>void;originX?:number;tray?:TrayConfig;groundAt?:(x:number,z:number)=>number;editable?:boolean;clockOffset?:number;retryToken?:number;roomId?:string|null;mode:'translate'|'rotate';onSelect:()=>void;onChange:(t:Transform)=>void;onLoad:(ok:boolean|undefined,reason?:AssetLoadFailure,size?:ModelSize)=>void;colorVariant?:ColorVariant;waterY?:number;glow?:{glow:Glow;strength:number}}) {
                                                      
 const depthNow=()=>groundAt?buriedDepth(groundAt(item.transform.position[0],item.transform.position[2]),item.transform.position[1]):0;
                                                                       
 const [footprint,setFootprint]=useState<number>();const [modelHeight,setModelHeight]=useState<number>();const depth=depthNow(),buried=depth>0.001,sandY=depth/item.transform.scale;
                                                             
 const waterLocal=waterlineAt(waterY,item.transform.position[1],item.transform.scale,modelHeight);
 const group=useRef<Group>(null);const {invalidate,gl,controls}=useThree();
                                                                                                                                                                                  
 const drag=useRef<{offset:Vector3;plane:Plane;origin:Vector3;started?:boolean}|null>(null);
 const orbit=controls as unknown as {enabled:boolean}|null;
 function cancelDrag(){if(drag.current&&group.current){group.current.position.copy(drag.current.origin);const started=drag.current.started;drag.current=null;if(orbit)orbit.enabled=true;if(started)onDragCancel?.();invalidate();}}
 useEffect(()=>{
  const secondary=(e:PointerEvent)=>{if(e.pointerType==='touch'&&!e.isPrimary)cancelDrag();};
  const cancel=()=>cancelDrag();
                                                                               
  window.addEventListener('pointerdown',secondary,true);
  gl.domElement.addEventListener('pointercancel',cancel);
  return()=>{window.removeEventListener('pointerdown',secondary,true);gl.domElement.removeEventListener('pointercancel',cancel);if(orbit)orbit.enabled=true;};
 },[gl,orbit]);
 useFrame(()=>{if(group.current&&item.animation?.state==='playing'){const position=pathPosition(item.animation,Date.now()+clockOffset);if(position)group.current.position.fromArray(position);invalidate();}});
 useEffect(()=>{if(!editable)cancelDrag();invalidate();},[editable,item.animation,invalidate]);
 const [ready,setReady]=useState(false);
 useEffect(()=>{setReady(true);},[]);
                                                                
                                              
 const inner=useRef<Group>(null);const drop=useRef<number|null>(null);const wantsDrop=useRef(dropIn&&!reducedMotion()&&!isSoftwareRenderer(rendererName(gl)));const [puff,setPuff]=useState(false);
                                                    
 const landed=useRef<(()=>void)|null>(null);
 function startDrop(){if(!wantsDrop.current||!inner.current)return false;wantsDrop.current=false;inner.current.position.y=DROP_HEIGHT;drop.current=performance.now();invalidate();return true;}
 function settled(){setPuff(false);const report=landed.current;landed.current=null;report?.();}
 useFrame(()=>{const start=drop.current;if(start===null||!inner.current)return;const offset=dropOffset(performance.now()-start);inner.current.position.y=offset;if(offset===0){drop.current=null;sink.current=performance.now();setPuff(true);}invalidate();});
                                                                                      
                                                                      
 const motionOk=useRef(!reducedMotion()&&!isSoftwareRenderer(rendererName(gl)));
 const sink=useRef<number|null>(null);const shown=useRef<{position:Vector3;quaternion:Quaternion}|null>(null);
 const settle=useRef<{start:number;position:Vector3;quaternion:Quaternion}|null>(null);
                                                                                                                                                                 
 const previewing=useRef(false);
 useEffect(()=>remoteMotion.subscribe(item.id,invalidate),[item.id,invalidate]);
 const transformKey=JSON.stringify(item.transform);
 useEffect(()=>{remoteMotion.clear(item.id);const from=shown.current;if(!from||!motionOk.current||drag.current||item.animation?.state==='playing')return;
  const to=new Vector3().fromArray(item.transform.position);if(from.position.distanceTo(to)<1e-4&&from.quaternion.angleTo(new Quaternion().fromArray(item.transform.rotation))<1e-4)return;
  settle.current={start:performance.now(),position:from.position.clone(),quaternion:from.quaternion.clone()};invalidate();},[transformKey]);
 useFrame(()=>{const g=group.current;if(!g)return;const now=performance.now();
  if(!drag.current&&item.animation?.state!=='playing'){
   const pose=remoteMotion.pose(item.id,now);
   if(pose){previewing.current=true;settle.current=null;g.position.fromArray(pose.position);g.quaternion.fromArray(pose.rotation);invalidate();}
   else if(previewing.current&&!settle.current){previewing.current=false;const from=shown.current;
    if(from&&motionOk.current)settle.current={start:now,position:from.position.clone(),quaternion:from.quaternion.clone()};
    else{g.position.fromArray(item.transform.position);g.quaternion.fromArray(item.transform.rotation);}invalidate();}
   if(!pose&&settle.current){previewing.current=false;const k=settleProgress(now-settle.current.start);const target=item.transform;
    if(k>=1){settle.current=null;g.position.fromArray(target.position);g.quaternion.fromArray(target.rotation);if(motionOk.current)sink.current=now;}
    else{g.position.copy(settle.current.position).lerp(new Vector3().fromArray(target.position),k);g.quaternion.fromArray(nlerpQuat(settle.current.quaternion.toArray(),target.rotation,k));}
    invalidate();}
  }
  if(sink.current!==null&&inner.current){const y=landingSquash(now-sink.current),xz=1/Math.sqrt(y);inner.current.scale.set(xz,y,xz);if(now-sink.current>=SETTLE_SINK_MS){sink.current=null;inner.current.scale.set(1,1,1);}invalidate();}
  shown.current??={position:new Vector3(),quaternion:new Quaternion()};shown.current.position.copy(g.position);shown.current.quaternion.copy(g.quaternion);
 });
 return <><group ref={group} userData={{sandtrayObjectId:item.id}} position={item.transform.position} quaternion={item.transform.rotation} scale={item.transform.scale}
  onClick={event=>{event.stopPropagation();onSelect();}}
  onPointerDown={e=>{
   if(!editable||!selected||mode!=='translate'||e.button!==0||(e.pointerType==='touch'&&!e.isPrimary))return;
   e.stopPropagation();const g=group.current!;const plane=new Plane(new Vector3(0,1,0),-g.position.y);
   const point=e.ray.intersectPlane(plane,new Vector3());if(!point)return;point.x-=originX;
   drag.current={offset:g.position.clone().sub(point),plane,origin:g.position.clone()};settle.current=null;remoteMotion.clear(item.id);
   if(orbit)orbit.enabled=false;(e.target as Element).setPointerCapture(e.pointerId);
  }}
  onPointerMove={e=>{
   const d=drag.current;if(!d)return;e.stopPropagation();const point=e.ray.intersectPlane(d.plane,new Vector3());
   if(point){point.x-=originX;point.add(d.offset);[point.x,point.z]=clampToTray(tray,point.x,point.z);
                                                                                                                 
                                                                                                                              
    if(groundAt)point.y=keepDepth(groundAt(point.x,point.z),depthNow());group.current!.position.copy(point);
    if(!d.started&&point.distanceTo(d.origin)>0.02){d.started=true;onDragStart?.();}if(d.started)onDragMove?.({...item.transform,position:point.toArray()});invalidate();}
  }}
  onPointerUp={e=>{
   if(!drag.current)return;e.stopPropagation();drag.current=null;if(orbit)orbit.enabled=true;
   (e.target as Element).releasePointerCapture(e.pointerId);
   if(motionOk.current)sink.current=performance.now();
   onChange({...item.transform,position:group.current!.position.toArray()});invalidate();
  }}>
  <group ref={inner}><Model retryToken={retryToken} assetId={item.assetId} assetVersion={item.assetVersion} roomId={roomId} animation={item.animation} colorVariant={item.colorVariant??(item.assetVersion?(supportsColorVariants(item.assetId,item.assetVersion)?'t2':undefined):undefined)} clockOffset={clockOffset} onLoad={(ok,reason,size)=>{if(size){setFootprint(size.radius);setModelHeight(size.height);}if(ok===true&&startDrop()){landed.current=()=>onLoad(true,undefined,size);invalidate();return;}if(ok===false)wantsDrop.current=false;landed.current=null;onLoad(ok,reason,size);invalidate();}}/></group>
  {puff&&<SandPuff onDone={settled}/>}
  {footprint!==undefined&&<GroundContact y={sandY} radius={footprint} buried={buried}/>}
  {footprint!==undefined&&waterLocal!==undefined&&<WaterlineFoam y={waterLocal} radius={footprint}/>}
  {glow&&footprint!==undefined&&modelHeight!==undefined&&<GlowHalo glow={glow.glow} y={modelHeight*glow.glow.at} radius={footprint} strength={glow.strength}/>}
  {selected&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,sandY+0.008,0]}><ringGeometry args={[0.75,0.8,48]}/><meshBasicMaterial color={ringColor} depthTest={false} transparent opacity={0.9}/></mesh>}
  {heldByTherapist&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,sandY+0.01,0]}><ringGeometry args={[0.86,0.92,48]}/><meshBasicMaterial color={ROLE_COLOR.therapist} depthTest={false} transparent opacity={0.9}/></mesh>}
 </group>{heldByTherapist&&<Html position={item.transform.position} zIndexRange={[15,0]} pointerEvents="none"><span className="holder-badge" style={{background:ROLE_COLOR.therapist}}>治療師操作中</span></Html>}
 {selected&&editable&&ready&&group.current&&<TransformControls object={group as React.RefObject<Group>} mode={mode} showY={mode==='rotate'}
  onMouseUp={()=>{const g=group.current!;if(mode==='translate'&&groundAt)g.position.y=keepDepth(groundAt(g.position.x,g.position.z),depthNow());const t={position:g.position.toArray(),rotation:g.quaternion.toArray(),scale:g.scale.x} as Transform;
   if(validTransform(t))onChange(t);else {g.position.fromArray(item.transform.position);g.quaternion.fromArray(item.transform.rotation);g.scale.setScalar(item.transform.scale);}invalidate();}}/>}</>;
}
                                                                         
function QuickToolsAnchor({base,height,children}:{base:[number,number,number];height:number;children:React.ReactNode}){
 const {camera,gl,size,invalidate}=useThree();const ref=useRef<HTMLDivElement>(null);const point=useMemo(()=>new Vector3(),[]);
 const [place,setPlace]=useState<QuickToolsPlacement>({flip:false,dx:0});const last=useRef(place);
 useFrame(()=>{const el=ref.current;if(!el)return;
  const project=(y:number)=>{point.set(base[0],y,base[2]).project(camera);return {x:(point.x+1)*size.width/2,y:(1-point.y)*size.height/2};};
  const canvas=gl.domElement.getBoundingClientRect();
  const obstacles=Array.from(gl.domElement.closest('.viewport')?.querySelectorAll('.camera-tools')??[],e=>{const r=e.getBoundingClientRect();return {left:r.left-canvas.left,right:r.right-canvas.left,top:r.top-canvas.top};});
  const next=placeQuickTools({base:project(base[1]),top:project(base[1]+height),toolbar:{width:el.offsetWidth,height:el.offsetHeight},canvas:size,obstacles},last.current);
  if(next.flip!==last.current.flip||Math.abs(next.dx-last.current.dx)>=1){last.current=next;setPlace(next);}
 });
 useEffect(()=>{invalidate();},[place,invalidate]);
 useEffect(()=>{const el=ref.current;if(!el||typeof ResizeObserver==='undefined')return;const watch=new ResizeObserver(()=>invalidate());watch.observe(el);return()=>watch.disconnect();},[invalidate]);
 return <Html position={place.flip?[base[0],base[1]+height,base[2]]:base} zIndexRange={[20,0]}>
  <div ref={ref} className={'quick-tools'+(place.flip?' above':'')} data-placement={place.flip?'above':'below'} style={{transform:quickToolsTransform(place)}} role="toolbar" aria-label="物件快速工具" onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()} onDoubleClick={e=>e.stopPropagation()}>{children}</div></Html>;
}
type CameraFocus={id:string;position:Vec3;height:number;tick:number};
function Camera({view,trays,focus}:{view:{kind:CameraKind;tick:number};trays:RoomTrays;focus:CameraFocus|null}) {
 const {camera,invalidate,size,gl}=useThree();const controls=useRef<any>(null);const aspect=useRef(1.6);aspect.current=size.width/size.height;
 const traysKey=JSON.stringify(trays);
                                                                                       
                                       
 const report=()=>{const t=controls.current?.target;if(!t)return;const r=(v:number)=>Math.round(v*1000)/1000;gl.domElement.dataset.cameraPose=JSON.stringify({position:camera.position.toArray().map(r),target:t.toArray().map(r)});};
                                                           
 const tween=useRef<{from:{position:Vec3;target:Vec3};to:{position:Vec3;target:Vec3};start:number}|null>(null);
 const apply=(pose:{position:Vec3;target:Vec3})=>{camera.position.set(...pose.position);controls.current?.target.set(...pose.target);controls.current?.update();report();invalidate();};
 useEffect(()=>{tween.current=null;apply(cameraView(view.kind,aspect.current,trays));},[view,camera,invalidate,traysKey]);
 const handled=useRef(focus?.tick);                             
 useEffect(()=>{const c=controls.current;if(!focus||!c||handled.current===focus.tick)return;handled.current=focus.tick;
  const from={position:camera.position.toArray() as Vec3,target:c.target.toArray() as Vec3},to=focusPose(from.position,from.target,focus.position,focus.height);
  if(reducedMotion()){tween.current=null;apply(to);return;}
  tween.current={from,to,start:performance.now()};invalidate();
 },[focus]);
 useFrame(()=>{const t=tween.current;if(!t)return;const k=easeOut((performance.now()-t.start)/450);
  apply({position:lerp3(t.from.position,t.to.position,k),target:lerp3(t.from.target,t.to.target,k)});if(k>=1)tween.current=null;});
 return <OrbitControls ref={controls} makeDefault enableDamping={false} minDistance={4} maxDistance={70} maxPolarAngle={Math.PI/2-0.04} onStart={()=>{tween.current=null;}} onChange={report}/>;
}
                                                  
function LocateRing({position}:{position:Vec3}){
 const [on,setOn]=useState(true);useEffect(()=>{const t=setTimeout(()=>setOn(false),1800);return()=>clearTimeout(t);},[]);
 return on?<Html position={position} center zIndexRange={[19,0]}><span className="locate-ring" data-testid="locate-ring" aria-hidden="true"/></Html>:null;
}
                               
function SheetHead({full,name,onSize,onClose}:{full:boolean;name:string;onSize:()=>void;onClose:()=>void}){
 return <div className="sheet-head"><button className="sheet-grip" aria-label={full?name+'改成半高':name+'拉到全高'} onClick={onSize}><span aria-hidden="true"/></button><button className="sheet-close" aria-label={'收起'+name} onClick={onClose}>收起</button></div>;
}
                                                                  
function HelpDialog({open,role,narrow,onClose}:{open:boolean;role:ViewerRole;narrow:boolean;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=ref.current;if(!d)return;if(open&&!d.open)d.showModal?.();else if(!open&&d.open)d.close();},[open]);
 return <dialog ref={ref} className="help-dialog" aria-labelledby="help-title" onClose={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>{/* 只有點到內容外的遮罩才關閉 */}
  <div className="help-body"><div className="help-head"><h2 id="help-title">怎麼操作</h2><button className="primary" onClick={onClose}>知道了</button></div>
  <ol className="help-cards">{helpCards(role,narrow).map(card=><li key={card.title}><h3>{card.title}</h3>{card.lines.map(line=><p key={line}>{line}</p>)}</li>)}</ol></div>
 </dialog>;
}
const NARROW_QUERY='(max-width:760px)';
                                                               
function useNarrow(){
 const [narrow,setNarrow]=useState(()=>typeof matchMedia==='function'&&matchMedia(NARROW_QUERY).matches);
 useEffect(()=>{if(typeof matchMedia!=='function')return;const m=matchMedia(NARROW_QUERY),on=()=>setNarrow(m.matches);on();m.addEventListener('change',on);return()=>m.removeEventListener('change',on);},[]);
 return narrow;
}
function App(){
 const garden=useGarden();const exploring=garden.enabled&&garden.exploring;
                                                            
 const [mood,setMoodState]=useState<RoomMood>(()=>readMood());const setMood=(next:RoomMood)=>{setMoodState(next);writeMood(next);};
 const look=MOOD_LOOK[garden.enabled?'day':mood],glowStrength=mood==='night'?.85:.55;
 const roomId=new URLSearchParams(location.search).get('room');const shared=useSharedRoom(roomId);
                                                                                                                                            
                                                                        
                               
                                                                           
 const [deployed,setDeployed]=useState(false);
 useEffect(()=>{let active=true;fetch('/api/health').then(r=>r.ok?r.json() as Promise<{mode?:string}>:null).then(h=>{if(active&&(h?.mode==='staging'||h?.mode==='production'))setDeployed(true);}).catch(()=>{});return()=>{active=false;};},[]);
 const listable=useMemo(()=>devAssets.filter(a=>listableAsset(a,{roomId,hostname:location.hostname,healthDeployed:deployed})),[roomId,deployed]);
 const [items,setItems]=useState<Item[]>([]);const [selected,setSelected]=useState<string>();
 const [pageSize,setPageSize]=useState(40),[clip,setClip]=useState('');
 const [pending,setPending]=useState<DevAssetId>();
                                    
 const [recent,setRecent]=useState<string[]>(()=>readIds(RECENT_KEY)),[favourites,setFavourites]=useState<string[]>(()=>readIds(FAVOURITE_KEY));
 const toggleFav=(id:string)=>setFavourites(list=>{const next=toggleFavourite(list,id);writeIds(FAVOURITE_KEY,next);return next;});const [search,setSearch]=useState('');const [category,setCategory]=useState('全部');const [group,setGroup]=useState('all');
                                  
                                                             
                                                        
 const panelRole:'local'|'therapist'|'client'=roomId?(shared.info?.role==='therapist'?'therapist':'client'):'local';
 const panelPref=(name:'libraryOpen'|'inspectorOpen')=>panelRole==='local'?`sandtray.${name}`:`sandtray.${name}.${panelRole}`;
 const panelDefault={local:{libraryOpen:true,inspectorOpen:true},therapist:{libraryOpen:false,inspectorOpen:false},client:{libraryOpen:true,inspectorOpen:false}}[panelRole];
 const [libraryOpen,setLibraryOpen]=useState(()=>readPref(panelPref('libraryOpen'),panelDefault.libraryOpen)),[inspectorOpen,setInspectorOpen]=useState(()=>readPref(panelPref('inspectorOpen'),panelDefault.inspectorOpen));
                                                                               
                                    
 const narrow=useNarrow();const [sheet,setSheet]=useState<'library'|'inspector'|null>(null);const [sheetFull,setSheetFull]=useState(false);
 const showLibrary=narrow?sheet==='library':libraryOpen,showInspector=narrow?sheet==='inspector':inspectorOpen;
 const openSheet=(which:'library'|'inspector')=>{setSheet(s=>s===which?null:which);setSheetFull(false);};
 useEffect(()=>{if(!narrow||!sheet)return;const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')setSheet(null);};window.addEventListener('keydown',esc);return()=>window.removeEventListener('keydown',esc);},[narrow,sheet]);
                                 
 const [focus,setFocus]=useState<CameraFocus|null>(null);const [helpOpen,setHelpOpen]=useState(false);
                                      
 const reframe=()=>setTimeout(()=>setView(v=>({kind:v.kind,tick:v.tick+1})),150);                          
                                                            
 const [chromeOpen,setChromeOpen]=useState(()=>readPref('sandtray.chromeOpen',true));
                                                                                                          
 const [toolsOpen,setToolsOpen]=useState(()=>readPref('sandtray.sandToolsOpen',true));
 const toggleTools=()=>setToolsOpen(v=>{writePref('sandtray.sandToolsOpen',!v);return !v;});
 const toggleChrome=()=>{setChromeOpen(v=>{writePref('sandtray.chromeOpen',!v);return !v;});reframe();};
 const [toolsNotice,setToolsNotice]=useState('');
 const toggleLibrary=()=>{setLibraryOpen(v=>{writePref(panelPref('libraryOpen'),!v);return !v;});reframe();},toggleInspector=()=>{setInspectorOpen(v=>{writePref(panelPref('inspectorOpen'),!v);return !v;});reframe();};
 const panelRoleSeen=useRef(panelRole);
 useEffect(()=>{if(panelRoleSeen.current===panelRole)return;panelRoleSeen.current=panelRole;setLibraryOpen(readPref(panelPref('libraryOpen'),panelDefault.libraryOpen));setInspectorOpen(readPref(panelPref('inspectorOpen'),panelDefault.inspectorOpen));reframe();},[panelRole]);
 const [mode,setMode]=useState<'translate'|'rotate'>('translate');const [view,setView]=useState({kind:'angle' as CameraKind,tick:0});
 const [notice,setNotice]=useState(()=>narrow?'按下方「物件架」選一件物件，放在你想要的位置。':'從左側選一件物件，放在你想要的位置。');const [loaded,setLoaded]=useState<Record<string,boolean|undefined>>({});const [heights,setHeights]=useState<Record<string,number>>({});const [loadFailure,setLoadFailure]=useState<Record<string,AssetLoadFailure|undefined>>({});
 const [modelRetries,setModelRetries]=useState<Record<string,number>>({});
 const [contextLost,setContextLost]=useState(false);const [roomShadows,setRoomShadows]=useState(false);
                                                                                                                               
                                                                           
 const [trays]=useState(()=>({dry:new TrayModel('dry'),wet:new TrayModel('wet')} as Record<TrayId,TrayModel>));
 const [sandTool,setSandTool]=useState<SandTool|null>(null);const [water,setWater]=useState(0);const waterTimer=useRef<ReturnType<typeof setTimeout>>(undefined);
                                                                                                                                                 
 const [localTrays,setLocalTrays]=useState<RoomTrays>(STANDARD_ROOM_TRAYS);
 const roomTrays=useMemo(()=>{const found=shared.scene?.trays;if(!roomId||!Array.isArray(found))return undefined;const pick=(id:TrayId)=>{const t=found.find((x:any)=>x.id===id);return t?.shape&&t.sizeCm?{shape:t.shape,...t.sizeCm}:STANDARD_TRAY_CONFIG;};const parsed=roomTraysSchema.safeParse({dry:pick('dry'),wet:pick('wet')});return parsed.success?parsed.data:undefined;},[roomId,shared.scene]);
 const trayConfigs=roomId?roomTrays??STANDARD_ROOM_TRAYS:localTrays;const offsets=useMemo(()=>trayOffsets(trayConfigs),[trayConfigs]);
 const [setupDraft,setSetupDraft]=useState<RoomTrays>(STANDARD_ROOM_TRAYS);
                                                                                                                            
 type LocalStep={trayId:TrayId;before:{data:Uint8Array;water:number};after:{data:Uint8Array;water:number}};
 const localHistory=useRef<{undo:LocalStep[];redo:LocalStep[]}>({undo:[],redo:[]});
 const [localHistorySize,setLocalHistorySize]=useState([0,0]);
                                                                                                                
 const groundY=(id:TrayId,x:number,z:number)=>Math.max(-1.5,Math.min(5,Number(surfaceY(trays[id].display,x,z).toFixed(3))));
 const trayState=(id:TrayId)=>({data:trays[id].confirmed.data.slice(),water:trays[id].water});
 function pushLocalStep(trayId:TrayId,before:{data:Uint8Array;water:number}){const h=localHistory.current;h.undo.push({trayId,before,after:trayState(trayId)});if(h.undo.length>50)h.undo.shift();h.redo=[];setLocalHistorySize([h.undo.length,0]);}
 function moveLocalHistory(direction:'undo'|'redo'){settleLocalWater(true);const h=localHistory.current,step=(direction==='undo'?h.undo:h.redo).pop();if(!step)return;(direction==='undo'?h.redo:h.undo).push(step);const state=direction==='undo'?step.before:step.after;trays[step.trayId].restoreLocal(state.data,state.water);if(step.trayId==='wet')setWater(state.water);setLocalHistorySize([h.undo.length,h.redo.length]);}
 function applyLocalSetup(next:RoomTrays){settleLocalWater(false);setLocalTrays(next);trays.dry.configure(next.dry);trays.wet.configure(next.wet);setWater(0);localHistory.current={undo:[],redo:[]};setLocalHistorySize([0,0]);
                                                                     
  setItems(list=>list.map(item=>{const [x,z]=clampToTray(next[item.trayId??'dry'],item.transform.position[0],item.transform.position[2]);return {...item,transform:{...item.transform,position:[x,item.transform.position[1],z]}};}));
  setNotice('沙盤已改為：乾 '+describeTray(next.dry)+'；濕 '+describeTray(next.wet)+'。');}
 const canSculpt=!exploring&&(!roomId||shared.info?.role==='client'&&shared.connected);
 useEffect(()=>{for(const tray of shared.scene?.trays??[])if(tray.id==='dry'||tray.id==='wet')trays[tray.id as TrayId].adopt(tray);},[shared.scene,trays]);
 useEffect(()=>{shared.trayListener.current=message=>{const tray=trays[message.trayId as TrayId];if(tray&&!tray.replay(message))void shared.refresh().catch(shared.fail);};return()=>{shared.trayListener.current=null;};});
 useEffect(()=>{if(!shared.connected){trays.dry.clearPending();trays.wet.clearPending();}},[shared.connected,trays]);
 useEffect(()=>trays.wet.subscribe(()=>{if(!waterTimer.current)setWater(trays.wet.water);}),[trays]);
 useEffect(()=>{if(!canSculpt)setSandTool(null);},[canSculpt]);
                                                                                                                                             
 const stroke=useRef<{trayId:TrayId;tool:SandTool;point:Point;timer:ReturnType<typeof setInterval>;batch?:string;count:number;opened:number;last:number;gesture:string;before?:{data:Uint8Array;water:number}}|null>(null);
 const sendRef=useRef(shared.send);sendRef.current=shared.send;
 function flushStroke(){const s=stroke.current;if(!s?.batch)return;const batch=s.batch,tray=trays[s.trayId],points=tray.pending.find(p=>p.id===batch)?.points.slice()??[];s.batch=undefined;s.count=0;
  if(points.length)void sendRef.current({type:'sand.stroke',operationId:batch,trayId:s.trayId,tool:s.tool,points,gestureId:s.gesture},{quiet:true}).catch(()=>{tray.drop(batch);});}
                                                                                                                           
                                                                                            
                                                                                                                                   
 function tickStroke(){const s=stroke.current;if(!s)return;const tray=trays[s.trayId],now=performance.now();
  const due=s.last?Math.min(4,Math.floor((now-s.last)/16)):1;if(!due)return;s.last=due===4?now:(s.last||now)+due*16;
  for(let n=0;n<due;n++){
   if(!roomId){tray.applyLocal(s.tool,s.point);continue;}
   if(!s.batch){s.batch=crypto.randomUUID();s.opened=now;}
   tray.stroke(s.batch,s.tool,s.point);s.count++;if(s.count>=8||now-s.opened>=150)flushStroke();
  }}
 const sculpt:SculptHandlers={tool:canSculpt?sandTool:null,
  start:(trayId,point)=>{if(stroke.current||!sandTool)return;if(!roomId)settleLocalWater(true);else{const sent=sendRoomWater();waterGesture.current=null;if(sent)void sent.catch(shared.fail);}stroke.current={trayId,tool:sandTool,point,count:0,opened:0,last:0,gesture:crypto.randomUUID(),...(roomId?{}:{before:trayState(trayId)}),timer:setInterval(tickStroke,16)};tickStroke();},
  move:point=>{if(stroke.current)stroke.current.point=point;},
  end:()=>{const s=stroke.current;if(!s)return;clearInterval(s.timer);flushStroke();stroke.current=null;if(s.before)pushLocalStep(s.trayId,s.before);}};
 useEffect(()=>()=>{if(stroke.current)clearInterval(stroke.current.timer);},[]);
                                                                                                                                     
                                                                                                                                    
                                                                                                                                     
                                                                                                       
 const waterGesture=useRef<{id:string;at:number;before:{data:Uint8Array;water:number};timer?:ReturnType<typeof setTimeout>}|null>(null);
 function settleLocalWater(keep:boolean){const gesture=waterGesture.current;if(!gesture)return;clearTimeout(gesture.timer);waterGesture.current=null;if(keep&&!roomId&&gesture.timer!==undefined)pushLocalStep('wet',gesture.before);}
 useEffect(()=>{settleLocalWater(false);return()=>settleLocalWater(false);},[roomId]);
 function changeWater(level:number){setWater(level);const now=performance.now();
  if(!waterGesture.current||now-waterGesture.current.at>1500){settleLocalWater(true);waterGesture.current={id:crypto.randomUUID(),at:now,before:trayState('wet')};}else waterGesture.current.at=now;
  if(!roomId){trays.wet.setLocalWater(level);const gesture=waterGesture.current;clearTimeout(gesture.timer);gesture.timer=setTimeout(()=>{if(waterGesture.current===gesture)settleLocalWater(true);},1500);return;}
  roomWater.current={level,gestureId:waterGesture.current.id};clearTimeout(waterTimer.current);waterTimer.current=setTimeout(()=>{const sent=sendRoomWater();if(sent)void sent.catch(shared.fail);},200);}
                                                                                                                                   
                                                                                                                                      
                                                                                                                                               
                                                                                                                                     
                                                                                                                                     
 const roomWater=useRef<{level:number;gestureId:string}|null>(null);
 const waterInFlight=useRef<Promise<any>|null>(null);
                                                                                                                                     
                                                                                                                                         
 const waterInFlightLevel=useRef<number|null>(null);
 function sendRoomWater(){clearTimeout(waterTimer.current);waterTimer.current=undefined;const pending=roomWater.current;roomWater.current=null;if(!pending)return undefined;
  const next=Math.round(pending.level*100)/100;const inFlight=waterInFlight.current!==null;if(next===(inFlight?waterInFlightLevel.current:trays.wet.water)){if(!inFlight)setWater(trays.wet.water);return undefined;}
  const sent=sendRef.current({type:'tray.water',trayId:'wet',level:next,gestureId:pending.gestureId},{quiet:true}).catch(e=>{setWater(trays.wet.water);throw e;});
  waterInFlight.current=sent;waterInFlightLevel.current=next;void sent.finally(()=>{if(waterInFlight.current===sent){waterInFlight.current=null;waterInFlightLevel.current=null;}}).catch(()=>{});return sent;}
 function dropRoomWater(){clearTimeout(waterTimer.current);waterTimer.current=undefined;roomWater.current=null;waterInFlight.current=null;waterInFlightLevel.current=null;if(roomId)waterGesture.current=null;}
                                                                                                                       
 async function settleRoomWater():Promise<number|undefined>{const wait=sendRoomWater()??waterInFlight.current;waterGesture.current=null;if(!wait)return undefined;const ack=await wait;return typeof ack?.sceneRevision==='number'?ack.sceneRevision:undefined;}
 useEffect(()=>()=>dropRoomWater(),[roomId]);
 useEffect(()=>{if(shared.connected)return;const pending=waterTimer.current!==undefined;dropRoomWater();if(pending)setWater(trays.wet.water);},[shared.connected,trays]);
 const onContextLost=useCallback(()=>setContextLost(true),[]),onContextRestored=useCallback(()=>setContextLost(false),[]);
 useEffect(()=>{if(contextLost)garden.pause();},[contextLost]);
 const pngCapture=useRef<PngCapture|null>(null);
                                                                        
 const cameraPose=useRef<CameraPose|null>(null);
                                                                 
 async function enterPhotoView(view:PhotoView){const bridge=cameraPose.current;if(!bridge)throw new Error('3D 畫面尚未準備好。');const restore=bridge.save();const next=cameraView(view==='birdseye'?'top':'angle',bridge.aspect(),trayConfigs);bridge.apply(next.position,next.target);
  await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));return restore;}
 const captureState=useRef({shared,items,loaded,contextLost});
 captureState.current={shared,items,loaded,contextLost};
 function verifyPng(){
  const state=captureState.current;
  if(garden.enabled&&garden.status!=='庭園已準備好')throw new Error('庭園尚未完整載入，請稍後再匯出。');
  if(!state.shared.connected||!state.shared.scene||state.contextLost)throw new Error('請先恢復連線與 3D 畫面，再匯出 PNG。');
  if(state.shared.hasUnconfirmedOperations()||state.items!==state.shared.scene.objects)throw new Error('作品仍在同步，請等待操作確認後匯出。');
  if(state.items.some(item=>item.animation?.state==='playing'))throw new Error('請先停止所有動作，再匯出 PNG。');
  if(state.items.some(item=>state.loaded[item.id]!==true))throw new Error('模型尚未完整載入，請稍後重試。');
  return state.items;
 }
 async function capturePng(expectedRevision:number){
  verifyPng();
  if(captureState.current.shared.scene.sceneRevision!==expectedRevision)throw new Error('作品已更新，請重新匯出。');
  if(!pngCapture.current)throw new Error('3D 畫面尚未準備好。');
  const blob=await pngCapture.current();
  verifyPng();
  if(captureState.current.shared.scene.sceneRevision!==expectedRevision)throw new Error('作品已更新，請重新匯出。');
  return blob;
 }
 useEffect(()=>{if(exploring)setPending(undefined);},[exploring]);
 useEffect(()=>{if(roomId)setItems(shared.scene?.objects??[]);},[roomId,shared.scene]);
                                                                                                                                   
 const seenItems=useRef<Set<string>|null>(null);
 useEffect(()=>{const seen=seenItems.current;seenItems.current=new Set(items.map(item=>item.id));if(!seen)return;for(const item of items)if(!seen.has(item.id)&&item.trayId==='wet')trays.wet.ripple(item.transform.position[0],item.transform.position[2],1);},[items,trays]);
 const current=items.find(i=>i.id===selected);const currentAsset=current?resolveAsset(current.assetId,current.assetVersion):undefined;
 const groups=useMemo(()=>shelfGroups(listable.map(a=>a.category)),[listable]);const activeGroup=groups.find(row=>row.group.id===group);
 const listableIds=useMemo(()=>new Set<string>(listable.map(a=>a.id)),[listable]);
 const shownFavourites=useMemo(()=>visibleIds(favourites,listableIds),[favourites,listableIds]),shownRecent=useMemo(()=>visibleIds(recent,listableIds),[recent,listableIds]);
 useEffect(()=>{if(group==='fav'&&!shownFavourites.length)setGroup('all');},[group,shownFavourites.length]);
 const filtered=useMemo(()=>{const fav=group==='fav'?new Set(shownFavourites):null;const rows=listable.filter(a=>(fav?fav.has(a.id):category!=='全部'?a.category===category:!activeGroup||activeGroup.categories.includes(a.category))&&(a.name+' '+a.category+' '+a.sourcePack).toLowerCase().includes(search.toLowerCase()));
                                                                   
  return fav?rows.sort((a,b)=>shownFavourites.indexOf(a.id)-shownFavourites.indexOf(b.id)):rows;},[listable,category,search,activeGroup,group,shownFavourites]);
 function place(trayId:TrayId,x:number,z:number){if(!pending||exploring)return;if(items.length>=100){setNotice('沙盤最多放置 100 件物件。');return;}
  const [cx,cz]=clampToTray(trayConfigs[trayId],x,z);const asset=resolveAsset(pending)!;const item:Item={id:crypto.randomUUID(),assetId:pending,assetVersion:asset.version,trayId,transform:{position:[cx,groundY(trayId,cx,cz),cz],rotation:[0,0,0,1],scale:1},materialOverrides:{},hidden:false,revision:0,...(supportsColorVariants(asset.id,asset.version)?{colorVariant:'t2' as const}:{})};
                                                                                                                                                         
  const remember=()=>setRecent(list=>{const next=pushRecent(list,item.assetId);writeIds(RECENT_KEY,next);return next;});
  if(roomId){if(shared.info?.role!=='client'||!shared.connected)return;void shared.send({type:'object.create',objectId:item.id,assetId:item.assetId,assetVersion:item.assetVersion!,transform:item.transform,colorVariant:item.colorVariant,trayId}).then(remember).catch(shared.fail);}else{setItems(v=>[...v,item]);remember();}setSelected(item.id);setPending(undefined);setSandTool(null);setNotice('已放置。可拖動軸線，或用右側控制調整。');}
 function update(id:string,t:Transform){if(!validTransform(t)){setNotice('數值超出可用範圍。');return;}if(roomId){void shared.transform(id,t).catch(shared.fail);}else setItems(list=>list.map(i=>i.id===id?{...i,transform:t}:i));}
 const currentVariant=current&&currentAsset&&supportsColorVariants(currentAsset.id,currentAsset.version)?(current.colorVariant??'t2'):undefined;
 function updateColorVariant(variant:ColorVariant){if(!current||!currentAsset||!supportsColorVariants(currentAsset.id,currentAsset.version))return;const next={...current,colorVariant:variant};if(roomId){if(shared.info?.role!=='client'||!shared.connected)return;void shared.send({type:'object.appearance.commit',objectId:current.id,expectedObjectRevision:current.revision??0,materialOverrides:current.materialOverrides??{},hidden:current.hidden??false,colorVariant:variant}).catch(shared.fail);}else setItems(list=>list.map(item=>item.id===current.id?next:item));setNotice('已更新膚色。');}
 function field(key:'x'|'y'|'z'|'angle'|'scale',value:number){if(!current||!Number.isFinite(value))return;const t=structuredClone(current.transform);
  if(key==='scale')t.scale=value;else if(key==='angle')t.rotation=new Quaternion().setFromEuler(new Euler(0,value*Math.PI/180,0)).toArray();else {t.position[{x:0,y:1,z:2}[key]]=value;[t.position[0],t.position[2]]=clampToTray(trayConfigs[current.trayId??'dry'],t.position[0],t.position[2]);}
  update(current.id,t);}
 useEffect(()=>setClip(currentAsset?.clips.find(c=>c.name.toLowerCase()==='idle')?.id??currentAsset?.clips[0]?.id??''),[selected,currentAsset?.id,currentAsset?.version]);
 async function playClip(state:'playing'|'stopped'){if(!current||!currentAsset)return;const clipId=currentAsset.clips.some(c=>c.id===clip)?clip:currentAsset.clips[0]?.id;if(!clipId)return;
  if(roomId){try{await shared.animate(current.id,{clipId,state,offsetMs:0,speed:1,loop:state==='playing'});}catch(e){shared.fail(e);}return;}
  setItems(rows=>rows.map(o=>o.id===current.id?{...o,animation:{clipId,state,serverStartedAt:Date.now(),offsetMs:0,speed:1,loop:state==='playing',initiatedBy:'local'}}:o));}
 function stopLocalAnimations(){
  if(roomId)return;
  const now=Date.now();
  setItems(rows=>rows.map(item=>{
   const animation=item.animation;if(animation?.state!=='playing')return item;
   const position=pathPosition(animation,now);
   return {...item,transform:position?{...item.transform,position}:item.transform,animation:{...animation,state:'stopped',offsetMs:animation.offsetMs+Math.max(0,now-animation.serverStartedAt)*animation.speed}};
  }));
  setNotice('已停止所有動作。');
 }
 const angle=current?Math.round(new Euler().setFromQuaternion(new Quaternion(...current.transform.rotation),'YXZ').y*180/Math.PI):0;
 const viewerRole:ViewerRole=roomId?(shared.info?.role==='therapist'?'therapist':'client'):'local';const isClient=!!roomId&&shared.info?.role==='client';
                                                                     
 const clientWaiting=isClient&&shared.info?.admitted===false;
 const canRemove=!exploring&&(!roomId||!!shared.connected&&shared.info?.role==='client');
 function removeCurrent(){if(!current)return;if(roomId){void shared.send({type:'object.delete',objectId:current.id,expectedObjectRevision:(current as any).revision}).catch(shared.fail);return;}setItems(v=>v.filter(i=>i.id!==current.id));setLoaded(v=>{const next={...v};delete next[current.id];return next;});setSelected(undefined);setNotice('已移除物件。');}
                                                                  
 const turn=(delta:number)=>field('angle',((angle+delta+180)%360+360)%360-180);
                                                     
                                                                            
                                                                                     
 const wetDepth=traySize(trayConfigs.wet).depth,wetWaterY=water>0?-wetDepth+water*wetDepth:undefined;
 const buryTools=current?(()=>{const [x,y,z]=current.transform.position,ground=groundY(current.trayId??'dry',x,z),h=(heights[current.id]??0)*current.transform.scale;
  return {canMove:!roomId||shared.can('translate',current.id),deeper:buryDeeper(ground,y,h),out:digOut(ground,y)};})():undefined;
 function setBuriedY(y:number|null,message:string){if(!current||y===null)return;const [x,,z]=current.transform.position;update(current.id,{...current.transform,position:[x,y,z]});setNotice(message);}
 const resize=(factor:number)=>{if(current)field('scale',Math.min(5,Math.max(.1,Math.round(current.transform.scale*factor*10)/10)));};
                                                 
 const knownIds=useRef<Set<string>|null>(null);const sceneReady=!roomId||!!shared.scene;
 useEffect(()=>{if(sceneReady)knownIds.current=new Set(items.map(i=>i.id));else knownIds.current=null;},[items,sceneReady]);
                                                          
 const hover=useRef<{trayId:TrayId;x:number;z:number}|null>(null);const onHover=useCallback<HoverHandler>(h=>{hover.current=h;},[]);
 const placeRef=useRef(place);placeRef.current=place;
 const shelfDrag=useRef<{assetId:DevAssetId;x:number;y:number;active:boolean}|null>(null);
 const [ghost,setGhost]=useState<{assetId:DevAssetId;x:number;y:number}|null>(null);
 useEffect(()=>{
  const move=(e:PointerEvent)=>{const d=shelfDrag.current;if(!d)return;
   if(!d.active){if(Math.hypot(e.clientX-d.x,e.clientY-d.y)<6)return;d.active=true;setPending(d.assetId);setSandTool(null);setSelected(undefined);setNotice('拖到沙盤上放開，就會放在那裡。');}
   setGhost({assetId:d.assetId,x:e.clientX,y:e.clientY});};
  const up=(e:PointerEvent)=>{const d=shelfDrag.current;shelfDrag.current=null;if(!d?.active)return;setGhost(null);
   const target=hover.current,onTray=!!(e.target as Element|null)?.closest?.('.viewport canvas, .viewport');
   if(onTray&&target)placeRef.current(target.trayId,target.x,target.z);else{setPending(undefined);setNotice('已取消放置。');}};
  const cancel=()=>{if(shelfDrag.current?.active){setPending(undefined);setGhost(null);}shelfDrag.current=null;};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);
  return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);};
 },[]);
 const ghostAsset=ghost?devAssets.find(a=>a.id===ghost.assetId):undefined;
 const viewportRef=useRef<HTMLDivElement>(null);
 const showTray=()=>viewportRef.current?.scrollIntoView?.({block:'nearest'});
                             
 const choose=(a:{id:DevAssetId;name:string})=>{setPending(a.id);setNotice('點沙盤放置「'+a.name+'」，或按「放在中央」。');if(narrow){setSheet(null);showTray();}};
                                               
 const lookAt=(item:Item,label:string)=>{const [x,y,z]=item.transform.position;
  setFocus(f=>({id:item.id,position:[offsets[item.trayId??'dry']+x,y,z],height:(heights[item.id]??0)*item.transform.scale,tick:(f?.tick??0)+1}));
  setNotice('鏡頭已轉向「'+label+'」，只有你的畫面改變。');if(narrow){setSheet(null);showTray();}};
 const focusItem=focus?items.find(i=>i.id===focus.id):undefined;
 return <div className={'app'+(isClient?' client-mode':'')+(chromeOpen?'':' chrome-collapsed')}>
  {!chromeOpen&&<div className="chrome-bar" data-testid="chrome-bar"><span className="brand-mark">◒</span><strong>一方沙盤</strong><span className="dot" style={{background:ROLE_COLOR[viewerRole]}}/><span>{roomId?(shared.info?.role==='client'?'案主':shared.info?.role==='therapist'?'治療師':'雙人會談'):'本機探索'}</span><span className="divider"/><span>{roomId?<StatusChip text={shared.status} testId="status-chip-bar"/>:'僅此頁暫存'}</span>{!!roomId&&!!peerStatusText(shared.info?.role,shared.info?.peerOnline)&&<span className={'peer-status'+(shared.info?.peerOnline?'':' away')} data-testid="peer-status-bar" role="status">{peerStatusText(shared.info?.role,shared.info?.peerOnline)}</span>}{!!roomId&&<span className="role-legend" data-testid="role-legend"><i style={{background:ROLE_COLOR.therapist}}/>治療師<i style={{background:ROLE_COLOR.client}}/>案主</span>}
   {/* 收起時仍要看見需要回應的事：等候入房、案主的操作請求、連線中斷。點提示即展開。 */}
   {!!roomId&&shared.info?.role==='therapist'&&shared.info.waitingClient&&<button className="chrome-alert tone-wait" onClick={toggleChrome}>有人在等候入房</button>}
   {!!roomId&&shared.info?.role==='client'&&Object.keys(shared.info.requests??{}).length>0&&<button className="chrome-alert tone-wait" onClick={toggleChrome}>治療師請求操作物件</button>}
   {!!roomId&&!shared.connected&&<button className="chrome-alert tone-problem" onClick={toggleChrome}>連線中斷</button>}
   {toolsNotice&&<span role="alert" data-testid="chrome-notice"><button className={'chrome-alert tone-'+statusTone(toolsNotice)} onClick={toggleChrome}>{toolsNotice}</button></span>}
   <button className="chrome-toggle" aria-expanded={false} aria-controls="session-chrome" onClick={toggleChrome}>展開上方面板 ▾</button></div>}
  <div id="session-chrome" hidden={!chromeOpen}>
  <header><div className="brand"><span className="brand-mark">◒</span><div><h1>一方沙盤</h1><p>留一點空間，讓世界慢慢成形。</p></div></div><div className="session"><span className="dot" style={{background:ROLE_COLOR[viewerRole]}}/><span data-testid="session-mode">{roomId?(shared.info?.role==="client"?"雙人會談 · 案主":shared.info?.role==="therapist"?"雙人會談 · 治療師":"雙人會談"):"本機探索"}</span><span className="divider"/>{roomId?<StatusChip text={shared.status} testId="status-chip"/>:'僅此頁暫存'}{!!roomId&&!!peerStatusText(shared.info?.role,shared.info?.peerOnline)&&<span className={'peer-status'+(shared.info?.peerOnline?'':' away')} data-testid="peer-status" role="status">{peerStatusText(shared.info?.role,shared.info?.peerOnline)}</span>}{!!roomId&&<span className="role-legend" data-testid="role-legend"><i style={{background:ROLE_COLOR.therapist}}/>治療師<i style={{background:ROLE_COLOR.client}}/>案主</span>}<button className="chrome-toggle" aria-expanded={true} aria-controls="session-chrome" onClick={toggleChrome}>收起上方面板 ▴</button></div></header>
  <SessionTools roomId={roomId} shared={shared} selected={selected} capturePng={capturePng} photoView={exploring?undefined:enterPhotoView} settleWater={settleRoomWater} onNotice={setToolsNotice}/>
  </div>
  <div className={'workspace'+(exploring&&garden.focused?' garden-focused':'')+(libraryOpen?'':' library-closed')+(inspectorOpen?'':' inspector-closed')}>
   <aside id="library-panel" aria-label="物件架" className={'library'+(showLibrary?'':' collapsed')+(narrow?' sheet'+(showLibrary?' open':'')+(sheetFull?' full':''):'')}>
    {narrow?<SheetHead full={sheetFull} name="物件架" onSize={()=>setSheetFull(v=>!v)} onClose={()=>setSheet(null)}/>:<button className="panel-toggle" aria-expanded={libraryOpen} aria-label={libraryOpen?'收起物件架':'展開物件架'} onClick={toggleLibrary}>{libraryOpen?'‹':'›'}</button>}
    {showLibrary&&<><div className="section-kicker">物件收藏</div><h2>從一件開始</h2><p className="muted">把物件拖進沙盤，或點一下物件再點沙盤。</p>
    <label className="search"><span>⌕</span><input aria-label="搜尋物件" placeholder="找一件物件…" value={search} onChange={e=>{setSearch(e.target.value);setPageSize(40);}}/></label>
    <div className="shelf-groups" role="group" aria-label="物件大類"><button className={'shelf-group'+(group==='all'?' active':'')} aria-pressed={group==='all'} aria-label="全部物件" onClick={()=>{setGroup('all');setCategory('全部');setPageSize(40);}}><span className="glyph" aria-hidden="true">全</span><span>全部</span></button>
     {shownFavourites.length>0&&<button className={'shelf-group'+(group==='fav'?' active':'')} aria-pressed={group==='fav'} aria-label="收藏的物件" onClick={()=>{setGroup('fav');setCategory('全部');setPageSize(40);}}><span className="glyph fav" aria-hidden="true">★</span><span>收藏</span></button>}
     {groups.map(({group:g})=><button key={g.id} className={'shelf-group'+(group===g.id?' active':'')} aria-pressed={group===g.id} aria-label={g.label+'類'} onClick={()=>{setGroup(g.id);setCategory('全部');setPageSize(40);}}><span className="glyph" aria-hidden="true">{g.glyph}</span><span>{g.label}</span></button>)}</div>
    {activeGroup&&<div className="categories">{activeGroup.categories.map(c=><button key={c} className={category===c?'active':''} aria-pressed={category===c} onClick={()=>{setCategory(category===c?'全部':c);setPageSize(40);}}>{c}</button>)}</div>}
    {shownRecent.length>0&&!search&&group==='all'&&<div className="recent-row" role="group" aria-label="最近用過的物件"><span className="recent-label">最近用過</span>{shownRecent.map(id=>listable.find(a=>a.id===id)).filter(a=>a!==undefined).map(a=><button key={a.id} className={'recent-chip'+(pending===a.id?' chosen':'')} aria-pressed={pending===a.id} aria-label={'最近用過：'+a.name} title={a.name} disabled={exploring||!!roomId&&(!shared.connected||shared.info?.role!=='client')} onClick={()=>choose(a)}><span className="asset-illustration" style={{color:a.color}}>{a.thumbnail?<img loading="lazy" src={a.thumbnail} alt="" draggable={false}/>:a.symbol}</span></button>)}</div>}
    <div className="asset-grid">{filtered.slice(0,pageSize).map(a=><div key={a.id} className="asset-cell"><button disabled={exploring||!!roomId&&(!shared.connected||shared.info?.role!=='client')} className={'asset-card '+(pending===a.id?'chosen':'')} onPointerDown={e=>{if(e.pointerType==='touch'||e.button!==0||e.currentTarget.disabled)return;shelfDrag.current={assetId:a.id,x:e.clientX,y:e.clientY,active:false};}} onClick={()=>choose(a)} aria-pressed={pending===a.id}>
     <span className="asset-illustration" style={{color:a.color}}>{a.thumbnail?<img loading="lazy" src={a.thumbnail} alt="" draggable={false}/>:a.symbol}</span><span>{a.name}</span><small>{a.sourcePack?'已匯入素材':'練習物件'}</small></button><button className={'fav-toggle'+(favourites.includes(a.id)?' on':'')} aria-pressed={favourites.includes(a.id)} aria-label={(favourites.includes(a.id)?'取消收藏「':'收藏「')+a.name+'」'} title={favourites.includes(a.id)?'取消收藏':'收藏'} onClick={()=>toggleFav(a.id)}>{favourites.includes(a.id)?'★':'☆'}</button></div>)}</div>
    {filtered.length>pageSize&&<button onClick={()=>setPageSize(n=>n+40)}>顯示更多物件（{filtered.length-pageSize}）</button>}
    {!filtered.length&&<p className="muted">沒有符合的物件。</p>}
    {!roomId&&<details className="tray-setup-local"><summary>練習用沙盤形狀與尺寸</summary><TraySetup value={setupDraft} onChange={setSetupDraft}/><button disabled={!roomTraysSchema.safeParse(setupDraft).success} onClick={()=>applyLocalSetup(setupDraft)}>套用（清空練習沙面）</button></details>}
    <div className="library-note"><span>關於這個空間</span><p>沒有標準的擺法。可以靠近、分開，也可以先留白。</p></div>
    {/* UX 建議 8：案主畫面不顯示素材授權清單（每件物件的出處仍在右側「物件細節」）。 */}
    {!isClient&&<><Credits assets={devAssets}/>
    <details><summary>原附授權檔</summary><p>熊貓使用補製黑白材質。</p>{['ARENA','DUNGEON','FURNITURE','MINI','ULTIMATE'].map(pack=><p key={pack}><a href={'/imported-assets/v1/'+pack+'-LICENSE.txt'} target="_blank" rel="noreferrer">{pack} 原附授權</a></p>)}</details>
    <p className="dev-note">{devAssets.filter(asset=>asset.sourcePack).length} 件已匯入素材 · {devAssets.filter(asset=>!asset.sourcePack).length} 件練習模型<br/>正式素材：{readyAssetCount} 件（發布門檻 100 件）</p></>}
   </>}</aside>
   <main>{(chromeOpen||exploring)&&<GardenControls garden={garden}/>}
    {/* 2026-10-10 user request: no heading row above the trays (the space goes to the trays); tests read data-items. */}
    <div ref={viewportRef} className={'viewport '+(pending?'placing':'')} data-testid="viewport" data-items={items.length}>
     <Canvas shadows={garden.enabled?(garden.shadows?{type:PCFShadowMap}:false):(roomShadows?{type:PCFShadowMap}:false)} frameloop="demand" style={{position:'absolute',inset:0}} dpr={[1,1.5]} camera={{position:[...CAMERA_ANGLE],fov:42}} fallback={<p role="alert">此裝置無法啟用 3D，請改用支援 WebGL 的瀏覽器。</p>}>
      {garden.enabled?<GardenWorld garden={garden}/>:<RoomLighting ready={!contextLost} shadows={roomShadows} onShadows={setRoomShadows} mood={mood}/>}{!garden.enabled&&look.motes&&<FloatingMotes color={look.moteColor}/>}
      {exploring?<GardenWalk garden={garden}/>:<Camera view={view} trays={trayConfigs} focus={focus}/>}
      {focus&&focusItem&&!exploring&&<LocateRing key={focus.tick} position={[focus.position[0],focus.position[1]+Math.min(focus.height,4)*.4,focus.position[2]]}/>}<CanvasLifecycle onLost={onContextLost} onRestored={onContextRestored}/><PngCaptureBridge capture={pngCapture} verify={verifyPng}/><CameraPoseBridge pose={cameraPose}/>
      <SandtraySurface models={trays} offsets={offsets} placing={!!pending} sculpt={sculpt} onHover={onHover} sky={{zenith:look.skyZenith,horizon:look.skyHorizon}} onPlace={(trayId,x,z,event)=>{if(exploring)return;if(pending)place(trayId,x,z);else if(event.delta<=4)setSelected(undefined);}}/>
      {items.map(item=><group key={item.id} position={[offsets[item.trayId??'dry'],0,0]}><ObjectView item={item} waterY={item.trayId==='wet'?wetWaterY:undefined} glow={look.glow?glowOf(item.assetId,glowStrength):undefined} originX={offsets[item.trayId??'dry']} tray={trayConfigs[item.trayId??'dry']} groundAt={(x,z)=>groundY(item.trayId??'dry',x,z)} retryToken={modelRetries[item.id]??0} clockOffset={shared.info?.clockOffset??0} editable={!exploring&&(!roomId||shared.can(mode,item.id))} selected={item.id===selected&&!pending&&!exploring} ringColor={ROLE_COLOR[viewerRole]} heldByTherapist={!!roomId&&therapistHolds(shared.info?.grants,item.id)} dropIn={knownIds.current!==null&&!knownIds.current.has(item.id)} onDragStart={roomId?()=>shared.beginDrag(item.id):undefined} onDragMove={roomId?t=>shared.previewDrag(item.id,t):undefined} onDragCancel={roomId?()=>void shared.endDrag(item.id):undefined} mode={mode} onSelect={()=>{if(!pending&&!exploring)setSelected(item.id);}} onChange={t=>update(item.id,t)} roomId={roomId} onLoad={(ok,reason,size)=>{const height=size?.height;if(height)setHeights(s=>s[item.id]===height?s:{...s,[item.id]:height});setLoaded(s=>({...s,[item.id]:ok}));setLoadFailure(s=>({...s,[item.id]:ok===false?reason??'ERROR':undefined}));}}/></group>)}
      {current&&!pending&&!exploring&&!sandTool&&<QuickToolsAnchor base={[offsets[current.trayId??'dry']+current.transform.position[0],current.transform.position[1],current.transform.position[2]]} height={(heights[current.id]??0)*current.transform.scale}>
        <button aria-label="向左轉 45 度" title="向左轉" disabled={!!roomId&&!shared.can('rotate',current.id)} onClick={()=>turn(-45)}>⟲</button>
        <button aria-label="向右轉 45 度" title="向右轉" disabled={!!roomId&&!shared.can('rotate',current.id)} onClick={()=>turn(45)}>⟳</button>
        <button aria-label="縮小物件" title="縮小" disabled={!!roomId&&!shared.can('scale',current.id)||current.transform.scale<=.1} onClick={()=>resize(1/1.25)}>−</button>
        <button aria-label="放大物件" title="放大" disabled={!!roomId&&!shared.can('scale',current.id)||current.transform.scale>=5} onClick={()=>resize(1.25)}>＋</button>
        {buryTools&&<><button aria-label="往沙裡埋" title="往沙裡埋" disabled={!buryTools.canMove||buryTools.deeper===null} onClick={()=>setBuriedY(buryTools.deeper,'已往沙裡埋。')}>⤓</button>
        <button aria-label="從沙裡挖出來" title="挖出來" disabled={!buryTools.canMove||buryTools.out===null} onClick={()=>setBuriedY(buryTools.out,'已從沙裡挖出來。')}>⤒</button></>}
        <button className="danger" aria-label="拿走這件物件" title="拿走" disabled={!canRemove} onClick={removeCurrent}>✕</button>
       </QuickToolsAnchor>}
     </Canvas>
     {contextLost&&<div className="canvas-message" role="alert">3D 顯示暫時中斷，正在等待裝置恢復。作品仍保留在本頁，請勿立即重新整理。</div>}
     {clientWaiting&&<div className="waiting-overlay" data-testid="waiting-overlay"><strong>正在等候治療師確認入房</strong><span>治療師確認後，沙盤會自動開啟，就可以開始擺放。</span><small>請保持這個頁面開著，不需要重新整理。</small></div>}
     {!exploring&&!clientWaiting&&!items.length&&!pending&&<div className="empty-hint"><span>你的世界，從這裡開始</span><small>選一件物件，或先轉轉視角。</small></div>}
     {pending&&<div className="placement"><span>點一下沙盤（左：乾沙盤・右：濕沙盤），決定位置</span><button className="primary" onClick={()=>place('dry',0,0)}>放在中央</button><button onClick={()=>{setPending(undefined);setNotice('已取消放置。');}}>取消</button></div>}
     {!exploring&&<button className="help-button" aria-label="操作說明" title="操作說明" aria-haspopup="dialog" onClick={()=>setHelpOpen(true)}>?</button>}
     {!exploring&&<div className="camera-tools" role="toolbar" aria-label="視角">{([['angle','斜視'],['top','俯視'],['low','盤邊視角'],['dry','聚焦乾沙盤'],['wet','聚焦濕沙盤']] as [CameraKind,string][]).map(([kind,label])=><button key={kind} aria-pressed={view.kind===kind} onClick={()=>setView(v=>({kind,tick:v.tick+1}))}><ViewIcon kind={kind}/><span>{label}</span></button>)}<button onClick={()=>setView(v=>({kind:'angle',tick:v.tick+1}))}><ViewIcon kind="reset"/><span>重置視角</span></button></div>}
     {!exploring&&!garden.enabled&&<div className="camera-tools mood-tools" role="toolbar" aria-label="光影" title="只改變這台裝置上的光線，不影響對方的畫面">{ROOM_MOODS.map(m=><button key={m} aria-pressed={mood===m} onClick={()=>setMood(m)}><span className="mood-swatch" style={{background:MOOD_LOOK[m].background}}/><span>{MOOD_LABEL[m]}</span></button>)}</div>}
     {!exploring&&!toolsOpen&&<div className="sand-tools collapsed" role="toolbar" aria-label="沙盤工具">
      <button className="tools-toggle" aria-expanded={false} aria-label="展開沙盤工具" onClick={toggleTools}><ToolIcon tool={sandTool}/><span>{({dig:'挖沙',mound:'堆沙',smooth:'抹平'} as Record<string,string>)[sandTool??'']??'放置／檢視'}</span><span aria-hidden="true">▾</span></button>
     </div>}
     {!exploring&&toolsOpen&&<div className="sand-tools" role="toolbar" aria-label="沙盤工具">
      {([[null,'放置／檢視'],['dig','挖沙'],['mound','堆沙'],['smooth','抹平']] as [SandTool|null,string][]).map(([tool,label])=><button key={label} aria-pressed={sandTool===tool} disabled={tool!==null&&!canSculpt} onClick={()=>{setSandTool(tool);if(tool){setPending(undefined);setSelected(undefined);setNotice(label+'：在沙面上按住拖曳，橘色圈是一次的範圍。按住約一秒會挖到藍色盤底。');}}}><ToolIcon tool={tool}/><span>{label}</span></button>)}
      <label className="water">濕沙盤水位 <output>{Math.round(water*100)}%</output><input aria-label="濕沙盤水位" type="range" min="0" max="1" step="0.05" value={water} disabled={!canSculpt} onChange={e=>changeWater(Number(e.target.value))}/></label>
      {!roomId&&<><button disabled={!localHistorySize[0]} onClick={()=>moveLocalHistory('undo')}>復原沙盤</button><button disabled={!localHistorySize[1]} onClick={()=>moveLocalHistory('redo')}>重做沙盤</button></>}
      <button className="tools-toggle" aria-expanded={true} aria-label="收起沙盤工具" onClick={toggleTools}><span>收起</span><span aria-hidden="true">▴</span></button>
      <small data-testid="water-hint">水只會出現在挖低的地方：先「挖沙」再調高水位。</small>
      {!!roomId&&shared.info?.role==='client'&&<small>挖沙、堆沙與水位可用上方「復原／重做」退回，一次拖曳算一步。</small>}
      {!!roomId&&shared.info?.role==='therapist'&&<small>挖沙與水位只由案主操作；治療師預設唯讀，移動或縮放物件需先請求案主同意。</small>}
     </div>}
    </div>
    <div className="canvas-footer"><span role="status">{notice}</span>{!roomId&&items.some(item=>item.animation?.state==='playing')&&<button onClick={stopLocalAnimations}>停止所有動作</button>}<small>拖曳空白處轉視角 · 雙指調整視角</small></div>
   </main>
   <aside id="inspector-panel" aria-label="物件細節" className={'inspector'+(showInspector?'':' collapsed')+(narrow?' sheet'+(showInspector?' open':'')+(sheetFull?' full':''):'')}>
    {narrow?<SheetHead full={sheetFull} name="物件細節" onSize={()=>setSheetFull(v=>!v)} onClose={()=>setSheet(null)}/>:<button className="panel-toggle" aria-expanded={inspectorOpen} aria-label={inspectorOpen?'收起物件細節':'展開物件細節'} onClick={toggleInspector}>{inspectorOpen?'›':'‹'}</button>}
    {showInspector&&<><div className="section-kicker">物件細節</div><h2>{currentAsset?.name??'留意你選中的物件'}</h2>
    {!current?<p className="muted">點一下沙盤裡的物件，就能調整它的位置、方向與大小。</p>:<>
     {!!currentAsset?.clips.length&&<fieldset disabled={exploring||!!roomId&&(!shared.connected||!shared.can('animate',current.id))}><legend>角色動作</legend><select aria-label="角色動作" value={clip} onChange={e=>setClip(e.target.value)}>{currentAsset.clips.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button onClick={()=>void playClip('playing')}>播放角色動作</button><button onClick={()=>void playClip('stopped')}>停止角色動作</button></fieldset>}
     <p className="load-status" data-testid="load-status">{loaded[current.id]===true?'3D 模型已載入':loaded[current.id]===false?loadStatusText(loadFailure[current.id]):'正在載入模型…'}</p>
     {currentVariant&&<fieldset className="color-variant" disabled={exploring||!!roomId&&(shared.info?.role!=='client'||!shared.connected)}><legend>膚色</legend><label><select aria-label="膚色變體" value={currentVariant} onChange={e=>updateColorVariant(e.target.value as ColorVariant)}>{COLOR_VARIANT_OPTIONS.map(variant=><option key={variant} value={variant}>{({t1:'淺膚',t2:'自然',t3:'小麥',t4:'棕褐',t5:'深棕',t6:'深膚',orig:'原始'} as Record<ColorVariant,string>)[variant]}</option>)}</select></label><span aria-hidden="true" style={{display:'inline-block',width:16,height:16,borderRadius:'50%',marginLeft:8,verticalAlign:'middle',backgroundColor:currentVariant==='orig'?'#1E1E1E':colorVariantHex[currentVariant]}}/></fieldset>}
     {loaded[current.id]===false&&loadFailure[current.id]==='UNAUTHENTICATED'&&<a className="reauth" href="/auth/login">重新登入</a>}
     {currentAsset&&<ProvenanceLine asset={currentAsset}/>}
     {loaded[current.id]===false&&loadFailure[current.id]!=='UNAUTHENTICATED'&&loadFailure[current.id]!=='PERMISSION_DENIED'&&<button onClick={()=>setModelRetries(values=>({...values,[current.id]:(values[current.id]??0)+1}))}>重新載入這件模型</button>}
     <fieldset disabled={exploring||!!roomId&&(!shared.connected||!current||!shared.can('translate',current.id))}><div className="mode"><button aria-pressed={mode==='translate'} onClick={()=>setMode('translate')}>移動</button><button aria-pressed={mode==='rotate'} onClick={()=>setMode('rotate')}>旋轉</button></div>
     <div className="field-label">位置</div><div className="coordinates">{(['x','y','z'] as const).map((key,index)=><label key={key}>{['左右','高低','前後'][index]}<input aria-label={['左右位置','高度位置','前後位置'][index]} type="number" step="0.1" min={[-trayHalfUnits(trayConfigs[current.trayId??'dry']).x,-1.5,-trayHalfUnits(trayConfigs[current.trayId??'dry']).z][index]} max={[trayHalfUnits(trayConfigs[current.trayId??'dry']).x,5,trayHalfUnits(trayConfigs[current.trayId??'dry']).z][index]} value={Number(current.transform.position[index].toFixed(2))} onChange={e=>field(key,e.target.valueAsNumber)}/></label>)}</div>
     </fieldset><label className="slider">方向 <output>{angle}°</output><input aria-label="物件方向" disabled={exploring||!!roomId&&!shared.can('rotate',current.id)} type="range" min="-180" max="180" step="5" value={angle} onChange={e=>field('angle',Number(e.target.value))}/></label>
     <label className="slider">大小 <output>{current.transform.scale.toFixed(1)} 倍</output><input aria-label="物件大小" disabled={exploring||!!roomId&&!shared.can('scale',current.id)} type="range" min="0.1" max="5" step="0.1" value={current.transform.scale} onChange={e=>field('scale',Number(e.target.value))}/></label>
     <p className="muted small">這裡只改變物件大小；雙指縮放調整的是你的視角。</p>
     <button className="remove" disabled={!canRemove} onClick={removeCurrent}>移除這件物件</button>
     <details><summary>位置數值</summary><output data-testid="transform">{JSON.stringify(current.transform)}</output></details>
    </>}
    {items.length>0&&<div className="scene-list"><h3>沙盤裡的物件</h3>{items.map((item,i)=>{const label=devAssets.find(a=>a.id===item.assetId)!.name+' '+(i+1);
                                                                
     return <div key={item.id} className="scene-row" role="group" aria-label={label}><button aria-pressed={selected===item.id} onClick={()=>{setSelected(item.id);setPending(undefined);}}><ObjectMark object={item}/><span>{label}</span></button>
      <button className="look-at" aria-label="看這件" title="看這件（只轉動你的鏡頭）" disabled={exploring} onClick={()=>lookAt(item,label)}><EyeIcon/></button></div>;})}</div>}
    <div className="privacy-note">本機練習原型<p>{roomId?'會談期間暫存於伺服器。重新連線保留已確認作品，但操作授權必須重新取得。':'目前未連線治療師，也不會保存作品。重新整理後會清空。'}</p></div>
   </>}</aside>
  </div>{/* 2026-10-11 使用者指示：拿掉最下方「一方沙盤」那條，治療師／案主圖例搬到上方。 */}
  {narrow&&!exploring&&<nav className="sheet-bar" aria-label="面板">
   <button aria-expanded={sheet==='library'} aria-controls="library-panel" onClick={()=>openSheet('library')}><ShelfIcon/><span>物件架</span></button>
   <button aria-expanded={sheet==='inspector'} aria-controls="inspector-panel" onClick={()=>openSheet('inspector')}><DetailIcon/><span>物件細節{current&&currentAsset?'：'+currentAsset.name:''}</span>{items.length>0&&<small>{items.length} 件</small>}</button>
  </nav>}
  <HelpDialog open={helpOpen} role={viewerRole} narrow={narrow} onClose={()=>setHelpOpen(false)}/>
  {ghost&&ghostAsset&&<div className="drag-ghost" aria-hidden="true" style={{left:ghost.x,top:ghost.y}}>{ghostAsset.thumbnail?<img src={ghostAsset.thumbnail} alt="" draggable={false}/>:<span style={{color:ghostAsset.color}}>{ghostAsset.symbol}</span>}</div>}
 </div>;
}
                                                               
                                                                        
createRoot(document.getElementById('root')!).render(location.pathname==='/admin'?<AdminPanel/>:<EntryGate><App/></EntryGate>);




document.body.insertAdjacentHTML('beforeend','<a href="/source.html" style="position:fixed;bottom:2px;right:6px;z-index:1000;font-size:11px;background:white;color:#25443a;padding:2px 5px">原始碼與授權</a>');
