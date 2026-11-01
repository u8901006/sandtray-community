import {useEffect,useMemo,useRef,useState} from 'react';
import {useThree,type ThreeEvent} from '@react-three/fiber';
import {ExtrudeGeometry,Shape,Path,ShapeGeometry,BufferGeometry,BufferAttribute,DoubleSide,Raycaster,Vector3,Vector2,Vector4,Color,DataTexture,RedFormat,UnsignedByteType,LinearFilter,ClampToEdgeWrapping,ShaderMaterial,type Mesh} from 'three';
import {createTrayTextures} from './tray-textures';
import {TrayModel,traySize,sandHeightsY,sandVerticesXZ,sandIndex,surfaceY,BLUE_WALL_INSET,BLUE_LIP_Y,CIRCLE_SEGMENTS,cellAt,type Point} from './tray-model';
import {surfaceU8,DEFAULT_RADIUS_CM} from '../../../packages/sand-engine/src/core';
import {SPRAY_RADIUS_CM} from '../../../packages/sand-engine/src/paint';
import {clampToTray,CM_PER_UNIT,SPRAY_COLORS,type TrayId,type TrayConfig} from '../../../packages/protocol/src/index';
                                                                                                                                  
                                                                                                                                     
                                                                                                                                    
                                                                                                                                    
                                                                                                                                   
                                                                                                                                 
                               
const RIM=0.25,WALL_TOP=0.08,BLUE='#1F5F8B',RIPPLES=8,RIM_BEVEL=.03;
                                                                                                                                      
                                                                                                                                      
                                                                                                                              
                  
export {BLUE_WALL_INSET};
                                                                                                                                     
                                                                                                                                        
export type SandTool='dig'|'mound'|'smooth';
                                                                                                                
export type TrayTool=SandTool|'spray';
export interface SculptHandlers {tool:TrayTool|null;color?:string;start:(trayId:TrayId,point:Point)=>void;move:(point:Point)=>void;end:()=>void}
                                                                                                                                         
                                                                                                                                   
                                                                                                                   
export const SPRAY_OPACITY=.8;
const SAND_AVERAGE=new Color('#d2c2a1');
export const SPRAY_TINTS=SPRAY_COLORS.map(({hex})=>{const c=new Color(hex);return [c.r/SAND_AVERAGE.r,c.g/SAND_AVERAGE.g,c.b/SAND_AVERAGE.b] as const;});
                                                                                                                                  
export function paintedShade(shade:number,paint:number):[number,number,number]{
 if(!paint)return [shade,shade,shade];const t=SPRAY_TINTS[paint-1],a=SPRAY_OPACITY;
 return [shade*(1-a+a*t[0]),shade*(1-a+a*t[1]),shade*(1-a+a*t[2])];
}
                                                                                                                                              
export function trayOutline(config:TrayConfig,grow=0):[number,number][]{
 const size=traySize(config),hx=size.x/2+grow,hz=size.z/2+grow;
 if(config.shape==='circle')return Array.from({length:CIRCLE_SEGMENTS},(_,k)=>{const a=k/CIRCLE_SEGMENTS*Math.PI*2;return [Math.cos(a)*hx,Math.sin(a)*hx];});
 if(config.shape==='octagon'){const r=hx/Math.cos(Math.PI/8);return Array.from({length:8},(_,k)=>{const a=Math.PI/8+k*Math.PI/4;return [Math.cos(a)*r,Math.sin(a)*r];});}
 return [[-hx,-hz],[hx,-hz],[hx,hz],[-hx,hz]];
}
                                                                                                                    
function shapeOf(points:[number,number][],hole?:[number,number][]){
 const shape=new Shape();points.forEach(([x,z],k)=>k?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();
 if(hole){const path=new Path();[...hole].reverse().forEach(([x,z],k)=>k?path.lineTo(x,z):path.moveTo(x,z));path.closePath();shape.holes.push(path);}
 return shape;
}
                                                                                               
function flat<T extends BufferGeometry>(geometry:T){geometry.rotateX(Math.PI/2);return geometry;}
export function createShell(config:TrayConfig){
 const depth=traySize(config).depth,bottom=-depth-.08,inner=trayOutline(config),outer=trayOutline(config,RIM),blue=trayOutline(config,-BLUE_WALL_INSET);
 const rim=flat(new ExtrudeGeometry(shapeOf(outer,inner),{depth:.16,steps:1,bevelEnabled:true,bevelSegments:3,bevelSize:RIM_BEVEL,bevelThickness:.03,curveSegments:1}));
                                                                                                
 rim.translate(0,.08,0);
 const walls=flat(new ExtrudeGeometry(shapeOf(outer,inner),{depth:WALL_TOP-bottom,bevelEnabled:false,curveSegments:1}));walls.translate(0,WALL_TOP-.08,0);
 const floor=flat(new ShapeGeometry(shapeOf(inner)));floor.translate(0,-depth,0);
                                                                                                                                       
 const strip=new BufferGeometry(),n=blue.length,pos=new Float32Array(n*2*3),index:number[]=[];
 blue.forEach(([x,z],k)=>{pos.set([x,-depth,z,x,0,z],k*6);const a=k*2,b=((k+1)%n)*2;index.push(a,b,a+1,b,b+1,a+1);});
 strip.setAttribute('position',new BufferAttribute(pos,3));strip.setIndex(index);strip.computeVertexNormals();
 const lip=flat(new ShapeGeometry(shapeOf(inner,blue)));lip.translate(0,BLUE_LIP_Y,0);
 return {rim,walls,floor,strip,lip,dispose(){rim.dispose();walls.dispose();floor.dispose();strip.dispose();lip.dispose();}};
}
                                                                                   
                                                                            
export const WET_SHORE_MIN=.5,WET_SHORE_RANGE=.3,NO_SHORE=-1e3;
export function shoreRoughness(sandY:number,shoreY:number){const t=Math.min(1,Math.max(0,(sandY-shoreY)/WET_SHORE_RANGE)),k=t*t*(3-2*t);return WET_SHORE_MIN+(1-WET_SHORE_MIN)*k;}
export function wetShore(uniform:{value:number}){
 return (shader:{uniforms:Record<string,unknown>;vertexShader:string;fragmentShader:string})=>{
  shader.uniforms.uShoreY=uniform;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float vSandY;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSandY = transformed.y;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vSandY;\nuniform float uShoreY;')
   .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nroughnessFactor *= mix(${WET_SHORE_MIN.toFixed(2)}, 1.0, smoothstep(uShoreY, uShoreY + ${WET_SHORE_RANGE.toFixed(2)}, vSandY));`);
 };
}
export function createSand(model:TrayModel){
 const hm=model.display,{w,h}=hm,geometry=new BufferGeometry(),positions=new Float32Array(w*h*3),uvs=new Float32Array(w*h*2),colors=new Float32Array(w*h*3),xz=sandVerticesXZ(hm);
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){
  const k=j*w+i;positions[k*3]=xz[k*2];positions[k*3+2]=xz[k*2+1];uvs[k*2]=i/(w-1);uvs[k*2+1]=1-j/(h-1);
 }
 geometry.setAttribute('position',new BufferAttribute(positions,3));geometry.setAttribute('uv',new BufferAttribute(uvs,2));geometry.setAttribute('color',new BufferAttribute(colors,3));geometry.setIndex(sandIndex(hm));
 return geometry;
}
export function updateSand(geometry:BufferGeometry,model:TrayModel,wet:boolean){
 const hm=model.display,data=hm.data,paint=model.displayPaint,surface=surfaceU8(hm.depthCm),positions=geometry.getAttribute('position') as BufferAttribute,colors=geometry.getAttribute('color') as BufferAttribute,tint=wet?.86:1,heights=sandHeightsY(hm);
 for(let k=0;k<data.length;k++){
  const v=data[k];
                                                                                                                                
  positions.array[k*3+1]=heights[k];
                                                                              
  const shade=tint*(v<surface?.5+.5*v/surface:1+.08*(v-surface)/(255-surface)),[r,g,b]=paintedShade(shade,paint[k]);colors.array[k*3]=r;colors.array[k*3+1]=g;colors.array[k*3+2]=b;
 }
 positions.needsUpdate=true;colors.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();geometry.computeBoundingBox();
 return heights;
}
                                                                                                                                        
                                                                                                                                  
                                                                                           
const WATER_VERTEX=`attribute float sandY;varying vec2 vPos;varying vec3 vWorld;varying float vSandY;
void main(){vPos=position.xz;vSandY=sandY;vec4 world=modelMatrix*vec4(position,1.0);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`;
                                                                                             
                                                                     
export const CAUSTIC={strength:.22,fadeIn:.02,fadeOutStart:.12,fadeOutEnd:.30};
export function causticFade(depth:number){if(depth<=0)return 0;const s=(a:number,b:number,x:number)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};return s(0,CAUSTIC.fadeIn,depth)*(1-s(CAUSTIC.fadeOutStart,CAUSTIC.fadeOutEnd,depth));}
export const WATER_FRAGMENT=`uniform float uTime;uniform float uAmbient;uniform vec4 uRipples[${RIPPLES}];
uniform float uWaterY;uniform float uFloor;uniform int uShape;uniform vec2 uWall;uniform vec3 uShallow;uniform vec3 uDeep;uniform vec3 uSkyZenith;uniform vec3 uSkyHorizon;
varying vec2 vPos;varying vec3 vWorld;varying float vSandY;
float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*0.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float vnoise(vec2 p){vec2 i=floor(p),u=fract(p),s=u*u*(3.0-2.0*u);
 return mix(mix(hash12(i),hash12(i+vec2(1.0,0.0)),s.x),mix(hash12(i+vec2(0.0,1.0)),hash12(i+vec2(1.0,1.0)),s.x),s.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<3;i++){v+=a*vnoise(p);p=mat2(1.6,1.2,-1.2,1.6)*p;a*=0.5;}return v/0.875;}
// 2026-10-20 (Claude Opus 5.5, WoW-style shallows): sunlight caustics, two warped sine layers; brightest in shallow water, gone by 0.30 units deep.
float caustic(vec2 p,float t){vec2 q=p*7.0;float c=0.0;for(int i=0;i<2;i++){q+=vec2(sin(q.y*1.3+t*0.8),cos(q.x*1.1-t*0.7))*0.55;c+=pow(0.5+0.5*sin(q.x+q.y),6.0);}return c*0.5;}
// 2026-10-19 (Claude Opus 5.5, from the WebGPU ocean reference): five swells instead of three, with wavelengths in no whole-number
// ratio and speeds from deep-water dispersion (w ~ sqrt(k)), so the surface never shows one pattern repeating. Same total amplitude.
float waveHeight(vec2 p){
 float h=uAmbient*(0.46*sin(p.x*2.7+uTime*1.1)+0.37*sin(p.y*3.3-uTime*0.9)+0.22*sin((p.x-p.y)*5.1+uTime*1.7)
  +0.07*sin(dot(p,vec2(7.9,4.3))+uTime*2.0)+0.03*sin(dot(p,vec2(-6.2,11.7))-uTime*2.45));
 for(int k=0;k<${RIPPLES};k++){
  vec4 r=uRipples[k];float age=uTime-r.z;
  if(r.w>0.0&&age>0.0&&age<2.6){float d=distance(p,r.xy)-age*0.85;h+=r.w*sin(d*26.0)*exp(-d*d*18.0)*(1.0-age/2.6);}
 }
 return h*0.012;
}
void main(){
 float e=0.02;float h0=waveHeight(vPos);
 vec3 n=normalize(vec3(-(waveHeight(vPos+vec2(e,0.0))-h0)/e,1.0,-(waveHeight(vPos+vec2(0.0,e))-h0)/e));
 vec3 v=normalize(cameraPosition-vWorld);vec3 l=normalize(vec3(0.35,1.0,0.45));
 // World size of one pixel here: as it grows (camera pulled back) the highlight widens and dims, so sub-pixel glints do not flicker,
 // and the shore lace fades to its average instead of shimmering.
 float footprint=length(fwidth(vPos));float soft=smoothstep(0.02,0.08,footprint);
 float shine=mix(70.0,14.0,soft);float spec=pow(max(dot(reflect(-l,n),v),0.0),shine)*(shine+2.0)/72.0;
 // Schlick Fresnel: looking straight down the sand shows through; at a grazing angle the water mirrors the room's light.
 float fresnel=0.02+0.98*pow(1.0-max(dot(n,v),0.0),5.0);vec3 r=reflect(-v,n);vec3 sky=mix(uSkyHorizon,uSkyZenith,sqrt(clamp(abs(r.y),0.0,1.0)));
 // Water depth over the sand drawn beneath (where the sand sinks under the floor, the floor): pale foam at the shore, deeper blue in hollows.
 // The water stops at the blue wall (same test as insideBlueWall in tray-model): the mesh itself reaches the outline behind it.
 vec2 a=abs(vPos);
 if(uShape==1?length(vPos)>uWall.x:uShape==2?max(max(a.x,a.y),(a.x+a.y)*0.70710678)>uWall.x:(a.x>uWall.x||a.y>uWall.y))discard;
 float sandY=max(vSandY,uFloor);float depth=uWaterY-sandY;
 if(depth<=0.0)discard;
 float deep=clamp(depth/0.45,0.0,1.0);float foam=1.0-smoothstep(0.0,0.035,depth+h0*0.6);
 // Shore foam breaks into lace: noise on the tray coordinates, drifting only while the water moves (none under reduced motion).
 float lace=mix(fbm(vPos*8.0+vec2(0.05,0.03)*uTime*uAmbient),0.5,soft);foam=smoothstep(0.0,0.5,foam*1.2-(1.0-lace));
 vec3 color=mix(mix(uShallow,uDeep,deep),sky,fresnel)+spec*0.9+foam*0.55;
 // Caustics follow the bottom seen through the surface (refraction offset), fade with depth and at grazing angles, and blur out when far.
 float causticAmount=caustic(vPos+n.xz*depth*2.0,uTime*uAmbient)*(1.0-smoothstep(${CAUSTIC.fadeOutStart.toFixed(2)},${CAUSTIC.fadeOutEnd.toFixed(2)},depth))*smoothstep(0.0,${CAUSTIC.fadeIn.toFixed(2)},depth)*(1.0-fresnel)*(1.0-soft*0.7);
 color+=causticAmount*${CAUSTIC.strength.toFixed(2)}*vec3(1.0,0.96,0.82);
 gl_FragColor=vec4(color,clamp(0.32+0.4*deep+spec+foam*0.5+fresnel*0.6,0.0,0.95));
 #include <colorspace_fragment>
 // Dither by one 8-bit step so the shallow-to-deep gradient shows no bands.
 gl_FragColor.rgb+=(hash12(gl_FragCoord.xy)-0.5)/255.0;
}`;
                                                                                                                                   
                                                                                                                                     
export function waterWall(config:TrayConfig){const size=traySize(config);
 return config.shape==='circle'?new Vector2(size.x/2*Math.cos(Math.PI/CIRCLE_SEGMENTS)-BLUE_WALL_INSET,0):new Vector2(size.x/2-BLUE_WALL_INSET,size.z/2-BLUE_WALL_INSET);}
export function createWater(model:TrayModel){
 const hm=model.display,xz=sandVerticesXZ(hm),positions=new Float32Array(hm.w*hm.h*3),geometry=new BufferGeometry();
 for(let k=0;k<hm.w*hm.h;k++){positions[k*3]=xz[k*2];positions[k*3+2]=xz[k*2+1];}
 const sandY=new BufferAttribute(new Float32Array(hm.w*hm.h),1);
 geometry.setAttribute('position',new BufferAttribute(positions,3));geometry.setAttribute('sandY',sandY);geometry.setIndex(sandIndex(hm));geometry.computeBoundingSphere();
 const material=new ShaderMaterial({vertexShader:WATER_VERTEX,fragmentShader:WATER_FRAGMENT,transparent:true,depthWrite:false,side:DoubleSide,uniforms:{
  uTime:{value:0},uAmbient:{value:1},uRipples:{value:Array.from({length:RIPPLES},()=>new Vector4())},
  uWaterY:{value:0},uFloor:{value:-traySize(model.config).depth},uShape:{value:model.config.shape==='circle'?1:model.config.shape==='octagon'?2:0},uWall:{value:waterWall(model.config)},uShallow:{value:new Color('#7cc3e0')},uDeep:{value:new Color('#2f7fb4')},
                                                                                                                
  uSkyZenith:{value:new Color('#eef3f2')},uSkyHorizon:{value:new Color('#c3d2d4')}}});
                                                                                                              
 let next=0;const t0=performance.now();
 return {geometry,material,
  now(){return (performance.now()-t0)/1000;},
  sync(heights:Float32Array){(sandY.array as Float32Array).set(heights);sandY.needsUpdate=true;},
  ripple(x:number,z:number,strength:number){material.uniforms.uRipples.value[next].set(x,z,this.now(),strength);next=(next+1)%RIPPLES;},
  busy(time:number){return (material.uniforms.uRipples.value as Vector4[]).some(r=>r.w>0&&time-r.z<2.6);},
  dispose(){geometry.dispose();material.dispose();}};
}
                                                                              
                                                                  
export const BRUSH_RADIUS_UNITS=DEFAULT_RADIUS_CM/CM_PER_UNIT;
export const SPRAY_RADIUS_UNITS=SPRAY_RADIUS_CM/CM_PER_UNIT;
export type HoverHandler=(hover:{trayId:TrayId;x:number;z:number}|null)=>void;
function SandTray({id,x,model,textures,placing,sculpt,onPlace,onHover,sky,hidden=false}:{sky?:{zenith:string;horizon:string};hidden?:boolean;id:TrayId;x:number;model:TrayModel;textures:ReturnType<typeof createTrayTextures>;placing:boolean;sculpt:SculptHandlers;onPlace:(trayId:TrayId,x:number,z:number,event:ThreeEvent<MouseEvent>)=>void;onHover?:HoverHandler}){
 const {invalidate,controls,gl}=useThree();const [config,setConfig]=useState(model.config);
 const sand=useMemo(()=>createSand(model),[model,config]);const shell=useMemo(()=>createShell(config),[config]);const water=useMemo(()=>id==='wet'?createWater(model):null,[model,config,id]);
 const mesh=useRef<Mesh>(null);const [level,setLevel]=useState(model.water);
 const active=useRef(false);const orbit=controls as unknown as {enabled:boolean}|null;
 const marker=useRef<Mesh>(null);const showMarker=placing||!!sculpt.tool;
 function hover(e:ThreeEvent<PointerEvent>|null){const ring=marker.current;
  if(!e){if(ring?.visible){ring.visible=false;invalidate();}onHover?.(null);return;}
  const local=toLocal(e.point);const [cx,cz]=clampToTray(model.config,local.x,local.z);onHover?.({trayId:id,x:cx,z:cz});
  if(ring&&(showMarker||ring.visible)){ring.visible=showMarker;ring.position.set(cx,surfaceY(model.display,cx,cz)+.015,cz);invalidate();}}
 useEffect(()=>{if(!showMarker&&marker.current?.visible){marker.current.visible=false;invalidate();}},[showMarker,invalidate]);
 useEffect(()=>{let frameId=0;const apply=()=>{frameId=0;if(model.config!==config){setConfig(model.config);return;}const heights=updateSand(sand,model,id==='wet');water?.sync(heights);setLevel(model.water);invalidate();};apply();
  const unsubscribe=model.subscribe(()=>{if(!frameId)frameId=requestAnimationFrame(apply);});
  return()=>{unsubscribe();if(frameId)cancelAnimationFrame(frameId);};},[sand,water,model,config,id,invalidate]);
 useEffect(()=>()=>sand.dispose(),[sand]);useEffect(()=>()=>shell.dispose(),[shell]);useEffect(()=>()=>water?.dispose(),[water]);
                                                                                                                 
 useEffect(()=>{if(!water)return;let last=-1e9;
  return model.onRipple((cx,cz,strength)=>{const now=water.now();if(strength<1&&now-last<.12)return;last=now;water.ripple(cx,cz,strength);water.material.uniforms.uTime.value=now;invalidate();});},[model,water,invalidate]);
                                                                                                                               
 useEffect(()=>{if(!water||level<=0)return;
  const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;water.material.uniforms.uAmbient.value=reduced?0:1;
  const timer=setInterval(()=>{if(document.hidden)return;const time=water.now();if(reduced&&!water.busy(time))return;water.material.uniforms.uTime.value=time;invalidate();},33);
  return()=>clearInterval(timer);},[water,level,invalidate]);
 const toLocal=(point:Vector3)=>mesh.current?mesh.current.worldToLocal(point.clone()):point;
 function stop(){if(!active.current)return;active.current=false;if(orbit)orbit.enabled=true;sculpt.end();}
 useEffect(()=>{
                                                                                                    
  const secondary=(e:PointerEvent)=>{if(e.pointerType==='touch'&&!e.isPrimary)stop();};
  gl.domElement.addEventListener('pointerdown',secondary,true);gl.domElement.addEventListener('pointercancel',stop);
  return()=>{gl.domElement.removeEventListener('pointerdown',secondary,true);gl.domElement.removeEventListener('pointercancel',stop);stop();};
 },[gl,sculpt.tool]);
 function hit(e:ThreeEvent<PointerEvent>){if(!mesh.current)return;const found=new Raycaster(e.ray.origin,e.ray.direction).intersectObject(mesh.current)[0];if(!found)return;const local=toLocal(found.point);return cellAt(model.display,local.x,local.z);}
 const depth=traySize(config).depth;
 useEffect(()=>{if(water){water.material.uniforms.uWaterY.value=-depth+level*depth;invalidate();}},[water,level,depth,invalidate]);
                                                          
 useEffect(()=>{if(!water||!sky)return;(water.material.uniforms.uSkyZenith.value as Color).set(sky.zenith);(water.material.uniforms.uSkyHorizon.value as Color).set(sky.horizon);invalidate();},[water,sky?.zenith,sky?.horizon,invalidate]);
 const shore=useMemo(()=>({value:NO_SHORE}),[]);const onShore=useMemo(()=>id==='wet'?wetShore(shore):()=>{},[id,shore]);
 useEffect(()=>{shore.value=id==='wet'&&level>0?-depth+level*depth:NO_SHORE;invalidate();},[shore,id,level,depth,invalidate]);
                                                                                                 
                            
 return <group position={[x,0,0]} visible={!hidden} userData={{sandtrayTrayId:id}}>
  {/* wood shell: outer walls (no lid, so the blue inside stays visible) and the rim, following the tray outline */}
  <mesh geometry={shell.walls} receiveShadow><meshStandardMaterial map={textures.wood} color="#e5d8c4" roughness={.75}/></mesh>
  <mesh geometry={shell.rim} castShadow receiveShadow><meshStandardMaterial map={textures.wood} color="#eddfcb" roughness={.65}/></mesh>
  {/* blue inside: floor and inner wall */}
  <mesh geometry={shell.floor}><meshStandardMaterial color={BLUE} side={DoubleSide} roughness={.55}/></mesh>
  <mesh geometry={shell.strip}><meshStandardMaterial color={BLUE} side={DoubleSide} roughness={.55}/></mesh>
  <mesh geometry={shell.lip}><meshStandardMaterial color={BLUE} side={DoubleSide} roughness={.55}/></mesh>
  <mesh ref={mesh} geometry={sand} receiveShadow castShadow={false}
   onClick={e=>{if(hidden||sculpt.tool&&!placing)return;e.stopPropagation();const local=toLocal(e.point);onPlace(id,local.x,local.z,e);}}
   onPointerDown={e=>{
    if(hidden||!sculpt.tool||placing||e.button!==0||(e.pointerType==='touch'&&!e.isPrimary))return;const cell=hit(e);if(!cell)return;
    e.stopPropagation();active.current=true;if(orbit)orbit.enabled=false;(e.target as Element).setPointerCapture?.(e.pointerId);sculpt.start(id,cell);
   }}
   onPointerMove={e=>{if(hidden)return;hover(e);if(!active.current)return;e.stopPropagation();const cell=hit(e);if(cell)sculpt.move(cell);}}
   onPointerLeave={()=>hover(null)}
   onPointerUp={e=>{if(!active.current)return;e.stopPropagation();(e.target as Element).releasePointerCapture?.(e.pointerId);stop();}}>
   <meshStandardMaterial map={textures.sand} normalMap={textures.normal} normalScale={[.32,.32]} vertexColors roughness={.98} envMapIntensity={.25} onBeforeCompile={onShore} customProgramCacheKey={()=>id==='wet'?'sand-wet-shore':'sand'}/>
  </mesh>
  <mesh ref={marker} visible={false} rotation={[-Math.PI/2,0,0]} renderOrder={3} raycast={()=>null}>
   {placing?<circleGeometry args={[.55,40]}/>:sculpt.tool==='spray'?<ringGeometry key="spray" args={[SPRAY_RADIUS_UNITS*.88,SPRAY_RADIUS_UNITS,48]}/>:<ringGeometry key="brush" args={[BRUSH_RADIUS_UNITS*.92,BRUSH_RADIUS_UNITS,48]}/>}
   <meshBasicMaterial color={placing?'#2b2a24':sculpt.tool==='spray'&&sculpt.color?sculpt.color:'#c9773b'} transparent opacity={placing?.22:.85} depthTest={false} depthWrite={false}/>
  </mesh>
  {water&&level>0&&<mesh geometry={water.geometry} material={water.material} position={[0,-depth+level*depth,0]} renderOrder={1} raycast={()=>null}/>}
 </group>;
}
export function SandtraySurface({models,offsets,placing,sculpt,onPlace,onHover,sky,hidden=null}:{models:Record<TrayId,TrayModel>;offsets:Record<TrayId,number>;hidden?:TrayId|null;placing:boolean;sculpt:SculptHandlers;onPlace:(trayId:TrayId,x:number,z:number,event:ThreeEvent<MouseEvent>)=>void;onHover?:HoverHandler;sky?:{zenith:string;horizon:string}}){
 const [textures]=useState(createTrayTextures);const {gl}=useThree();
 useEffect(()=>{for(const map of [textures.sand,textures.normal,textures.wood])map.anisotropy=Math.min(8,gl.capabilities.getMaxAnisotropy());return()=>{textures.dispose();};},[textures,gl]);
 return <group>{(['dry','wet'] as const).map(id=><SandTray key={id} id={id} x={offsets[id]} model={models[id]} hidden={hidden===id} textures={textures} placing={placing} sculpt={sculpt} onPlace={onPlace} onHover={onHover} sky={sky}/>)}</group>;
}
