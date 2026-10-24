import {useEffect,useMemo,useRef,useState} from 'react';
import {useThree} from '@react-three/fiber';
import {AdditiveBlending,BufferAttribute,BufferGeometry,DataTexture,LinearFilter,PMREMGenerator,RGBAFormat,UnsignedByteType,type DirectionalLight} from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {isSoftwareRenderer,rendererName} from './presence';
import {MOOD_LOOK,MOTE_COUNT,motePosition,haloAlpha,type RoomMood,type Glow} from './room-moods';
                                                                    

                                                                                                                                      
export function roomEnvironmentEnabled(name:string|undefined|null){return !isSoftwareRenderer(name);}
                                                                                                                                              
export function roomLights(rich:boolean,mood:RoomMood='day'){return rich?MOOD_LOOK[mood].rich:MOOD_LOOK[mood].plain;}
                                                                                     
export const TRAY_SHADOW={mapSize:2048,left:-15,right:15,top:11,bottom:-11,near:.5,far:40,bias:-.0003,normalBias:.02,radius:3};
export function RoomLighting({ready,shadows=false,onShadows,mood='day'}:{ready:boolean;shadows?:boolean;onShadows?:(on:boolean)=>void;mood?:RoomMood}){
 const {gl,scene,invalidate}=useThree();const rich=useMemo(()=>roomEnvironmentEnabled(rendererName(gl)),[gl]);const lights=roomLights(rich,mood),look=MOOD_LOOK[mood];
                                                                                                                               
                                                                                                                                   
 const environmentNow=useRef(lights.environment);environmentNow.current=lights.environment;
 useEffect(()=>{if(!rich||!ready)return;
  const generator=new PMREMGenerator(gl),room=new RoomEnvironment(),target=generator.fromScene(room,.04);generator.dispose();room.dispose();
  const previous=scene.environment,previousIntensity=scene.environmentIntensity;scene.environment=target.texture;scene.environmentIntensity=environmentNow.current;invalidate();
  return()=>{if(scene.environment===target.texture){scene.environment=previous;scene.environmentIntensity=previousIntensity;}target.dispose();invalidate();};
 },[rich,ready,gl,scene,invalidate]);
 const sun=useRef<DirectionalLight>(null);
                                                                                                                                     
                                                                                                                                     
                                                                                                                                        
                                                                                                                                               
 useEffect(()=>{if(!rich||!ready)return;onShadows?.(true);
  return()=>{onShadows?.(false);const shadow=sun.current?.shadow;if(shadow?.map){shadow.map.dispose();shadow.map=null;}invalidate();};
 },[rich,ready,invalidate,onShadows]);
 const s=TRAY_SHADOW;
                                                                           
 useEffect(()=>{if(rich&&ready&&scene.environment){scene.environmentIntensity=lights.environment;invalidate();}},[rich,ready,scene,lights.environment,invalidate]);
 return <><color attach="background" args={[look.background]}/><ambientLight intensity={lights.ambient} color={lights.ambientColor}/>
  <directionalLight ref={sun} position={look.sunPosition} intensity={lights.sun} color={lights.sunColor} castShadow={shadows}
   shadow-mapSize={[s.mapSize,s.mapSize]} shadow-bias={s.bias} shadow-normalBias={s.normalBias} shadow-radius={s.radius}
   shadow-camera-left={s.left} shadow-camera-right={s.right} shadow-camera-top={s.top} shadow-camera-bottom={s.bottom} shadow-camera-near={s.near} shadow-camera-far={s.far}/></>;
}

                                                                                                                              
                                                          
export function FloatingMotes({color}:{color:string}){
 const {invalidate}=useThree();const reduced=useMemo(()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches,[]);
 const [geometry]=useState(()=>{const g=new BufferGeometry();g.setAttribute('position',new BufferAttribute(new Float32Array(MOTE_COUNT*3),3));return g;});
 useEffect(()=>{if(reduced)return;const start=performance.now(),position=geometry.getAttribute('position') as BufferAttribute;
  const tick=()=>{if(document.hidden)return;const t=(performance.now()-start)/1000;for(let i=0;i<MOTE_COUNT;i++)position.setXYZ(i,...motePosition(i,t));position.needsUpdate=true;geometry.computeBoundingSphere();invalidate();};
  tick();const timer=setInterval(tick,100);return()=>clearInterval(timer);},[geometry,reduced,invalidate]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 const map=useMemo(haloTexture,[]);
 return reduced?null:<points geometry={geometry} raycast={()=>null} renderOrder={4}><pointsMaterial color={color} size={.09} map={map} transparent opacity={.75} depthWrite={false} blending={AdditiveBlending} sizeAttenuation/></points>;
}
let haloMap:DataTexture|undefined;
                                                                                                                           
export function haloTexture(){
 if(haloMap)return haloMap;const size=64,pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const o=(y*size+x)*4;pixels[o]=pixels[o+1]=pixels[o+2]=255;pixels[o+3]=Math.round(255*haloAlpha(Math.hypot(x+.5-size/2,y+.5-size/2)/(size/2)));}
 haloMap=new DataTexture(pixels,size,size,RGBAFormat,UnsignedByteType);haloMap.magFilter=LinearFilter;haloMap.minFilter=LinearFilter;haloMap.needsUpdate=true;return haloMap;
}
                                                                                                                                     
export function GlowHalo({glow,y,radius,strength}:{glow:Glow;y:number;radius:number;strength:number}){
 const map=useMemo(haloTexture,[]);const d=radius*glow.size;
 return <sprite position={[0,y,0]} scale={[d,d,1]} renderOrder={5} raycast={()=>null}><spriteMaterial map={map} color={glow.color} transparent opacity={strength} depthWrite={false} blending={AdditiveBlending}/></sprite>;
}
                                                                                             
export function contactAlpha(t:number){const k=Math.min(1,Math.max(0,t));return (1-k*k)**2;}
let shadowTexture:DataTexture|undefined;
                                                                                                                                                                            
export function contactShadowTexture(){
 if(shadowTexture)return shadowTexture;const size=64,pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const t=Math.hypot(x+.5-size/2,y+.5-size/2)/(size/2);const a=Math.round(255*contactAlpha(t)),o=(y*size+x)*4;pixels[o]=pixels[o+1]=pixels[o+2]=a;pixels[o+3]=255;}
 shadowTexture=new DataTexture(pixels,size,size,RGBAFormat,UnsignedByteType);shadowTexture.magFilter=LinearFilter;shadowTexture.minFilter=LinearFilter;shadowTexture.needsUpdate=true;return shadowTexture;
}
                                                                          
export function foamAlpha(r:number,angle:number){const band=Math.max(0,1-Math.abs(r-.7)/.3);const n=.5+.25*Math.sin(angle*13+Math.sin(angle*5)*2)+.25*Math.sin(angle*29+1.7);return band*band*(n>.42?1:.25);}
let foamTexture:DataTexture|undefined;
                                                                                                               
export function waterlineFoamTexture(){
 if(foamTexture)return foamTexture;const size=128,pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const dx=x+.5-size/2,dy=y+.5-size/2;const a=Math.round(255*foamAlpha(Math.hypot(dx,dy)/(size/2),Math.atan2(dy,dx))),o=(y*size+x)*4;pixels[o]=pixels[o+1]=pixels[o+2]=a;pixels[o+3]=255;}
 foamTexture=new DataTexture(pixels,size,size,RGBAFormat,UnsignedByteType);foamTexture.magFilter=LinearFilter;foamTexture.minFilter=LinearFilter;foamTexture.needsUpdate=true;return foamTexture;
}
                                                                                                                          
                                                                                                  
export function waterlineAt(waterY:number|undefined,y:number,scale:number,height:number|undefined){
 if(waterY===undefined||height===undefined||!(scale>0))return undefined;const local=(waterY-y)/scale;return local>.01&&local<height*.95?local:undefined;
}
                                                                                                                                     
                                                                                                   
export function WaterlineFoam({y,radius}:{y:number;radius:number}){
 const map=useMemo(waterlineFoamTexture,[]);
 return <mesh rotation={[-Math.PI/2,0,0]} position={[0,y+.003,0]} renderOrder={2} raycast={()=>null}>
  <planeGeometry args={[radius*2.6,radius*2.6]}/><meshBasicMaterial color="#ffffff" alphaMap={map} transparent opacity={.7} depthWrite={false}/>
 </mesh>;
}
                                                                                                                                               
export function GroundContact({y,radius,buried}:{y:number;radius:number;buried:boolean}){
 const map=useMemo(contactShadowTexture,[]);
 return <>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,y+.004,0]} renderOrder={1} raycast={()=>null}>
   <planeGeometry args={[radius*2.5,radius*2.5]}/><meshBasicMaterial color="#3b3024" alphaMap={map} transparent opacity={buried?.22:.38} depthWrite={false} polygonOffset polygonOffsetFactor={-2}/>
  </mesh>
  {buried&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,y,0]} scale={[1,1,.45]} raycast={()=>null}>
   <torusGeometry args={[radius*.92,Math.max(.04,radius*.14),10,40]}/><meshStandardMaterial color="#cdbb97" roughness={1}/>
  </mesh>}
 </>;
}
