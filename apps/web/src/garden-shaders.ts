import {Color,Vector3,Vector4,type Material,type Texture,type WebGLProgramParametersWithUniforms} from 'three';
import {TRAY_FOCUS} from './garden-layout';
                                                                                                                    
                                                                                                                        
                                                                                                                        
                                                                                                                         
                                                                                                                    
                                                                                                                   
export type GardenFogUniforms={gardenFogDensity:{value:number};gardenGroundFog:{value:number};gardenFogFalloff:{value:number};
                                                                                                                                 
                                                                                                  
 gardenSunDir:{value:Vector3};gardenSunGlow:{value:Color};gardenGlowShare:{value:number};gardenFogBack:{value:Vector3};gardenHorizon:{value:Color}};
export type GardenGroundUniforms={gardenGroundMap:{value:Texture|null};gardenGroundBounds:{value:Vector4}};
export function createFogUniforms():GardenFogUniforms{const u={gardenFogDensity:{value:.0105},gardenGroundFog:{value:.35},gardenFogFalloff:{value:.22},gardenSunDir:{value:new Vector3(0,1,0)},gardenSunGlow:{value:new Color()},gardenGlowShare:{value:0},gardenFogBack:{value:new Vector3(1,1,1)},gardenHorizon:{value:new Color()}};setFogMood(u,'day',[24,38,12]);return u;}
                                                                         
                                    
export type GardenMood='day'|'sunset'|'evening';
export const FOG_LOOK={day:{glow:'#fff0cf',share:.3,back:[.96,1,1.05]},sunset:{glow:'#ffc890',share:.4,back:[.94,.99,1.07]},evening:{glow:'#a7bbdc',share:.2,back:[.97,1,1.04]}} as const;
                                                                                                                        
export const WATER={detail:1.2,detailStrength:.06,fresnel:.15,absorb:.88,scatter:'#1d9488',scatterShare:.1,horizon:{day:'#d4e3e8',sunset:'#f1c79f',evening:'#506573'}} as const;
export function setFogMood(u:GardenFogUniforms,mood:GardenMood,sun:readonly number[]){const look=FOG_LOOK[mood];
 u.gardenSunDir.value.set(sun[0],sun[1],sun[2]).normalize();u.gardenSunGlow.value.set(look.glow);u.gardenGlowShare.value=look.share;u.gardenFogBack.value.set(look.back[0],look.back[1],look.back[2]);u.gardenHorizon.value.set(WATER.horizon[mood]);}
                                                            
export function fogSunward(view:readonly number[],sun:readonly number[]){const n=(v:readonly number[])=>Math.hypot(v[0],v[1],v[2]);const d=(view[0]*sun[0]+view[1]*sun[1]+view[2]*sun[2])/(n(view)*n(sun));return Math.max(d,0)**3;}
                                                                                                                                   
                                                                                                                              
export const MOSS={from:.35,to:.7,colour:'#7aa63c',share:.85};
                                                                                                                                 
                                                                                                                             
                                                                                                                    
                                                                                                                                     
export const AUTUMN={from:.5,to:.58,amber:'#e0902e',red:'#c9502c',gain:[.75,1.4] as const};
export function autumnField(x:number,z:number){return (Math.sin(x*.13+1.7)*Math.sin(z*.11+.4)+Math.sin((x-z)*.07+2.1))*.5;}
export function autumnShare(x:number,z:number){const t=Math.min(1,Math.max(0,(autumnField(x,z)-AUTUMN.from)/(AUTUMN.to-AUTUMN.from)));return t*t*(3-2*t)*focusFade(x,z);}
                                 
export function autumnHue(x:number,z:number){const t=Math.min(1,Math.max(0,(Math.sin(x*.05-z*.04)+.3)/.6));return t*t*(3-2*t);}
                                                                                           
export const FLOWER_GLOW={day:0,sunset:.06,evening:.3} as const;
                                                                                                                    
export const SHORE={wetTo:1.02,dryFrom:1.24,darken:.6,roughness:.28};
export function shoreWet(r:number){const t=Math.min(1,Math.max(0,(r-SHORE.wetTo)/(SHORE.dryFrom-SHORE.wetTo)));return 1-t*t*(3-2*t);}
export function mossShare(ny:number){const t=Math.min(1,Math.max(0,(ny-MOSS.from)/(MOSS.to-MOSS.from)));return t*t*(3-2*t)*MOSS.share;}
                                                                                                                                       
export function focusFade(x:number,z:number){const d=Math.max(Math.abs(x)-TRAY_FOCUS.halfX,TRAY_FOCUS.minZ-z,z-TRAY_FOCUS.maxZ);const t=Math.min(1,Math.max(0,d/3));return t*t*(3-2*t);}
const FOCUS_FADE=`float gardenFocusFade(vec2 p){float d=max(abs(p.x)-${TRAY_FOCUS.halfX.toFixed(1)},max(${TRAY_FOCUS.minZ.toFixed(1)}-p.y,p.y-${TRAY_FOCUS.maxZ.toFixed(1)}));return smoothstep(0.0,3.0,d);}`;
export function createGroundUniforms():GardenGroundUniforms{return {gardenGroundMap:{value:null},gardenGroundBounds:{value:new Vector4(-110,-110,220,220)}};}

const NOISE=`float gardenHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float gardenNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(gardenHash(i),gardenHash(i+vec2(1,0)),f.x),mix(gardenHash(i+vec2(0,1)),gardenHash(i+vec2(1,1)),f.x),f.y);}`;

                                                                   
                                                                     
                                                        
export type FoliageUniforms={uWindTime:{value:number};uWindAmp:{value:number}};
export const FOLIAGE={translucency:.5,tint:[.45,.65,.15] as const,grassAmp:.12,plantAmp:.015,
                                                                                 
 wide:1.4,forward:.6,backFace:.4,
                                                                                                   
 tintShare:.3};
                                                                                      
export const CANOPY={low:[.78,.9,.86] as const,high:[1.08,1.06,.9] as const,from:1,to:9};
                                                                                            
export const GARDEN_WRAP={strength:.3,cool:[.82,.88,1.0] as const};
                                                                                                                                  
                                                                                                  
export const POND_LOOK={shallow:'#5fa89b',deep:'#285258',shallowFrom:.55,foamFrom:.9,foamTo:1.02};
                                                                                                                                
                                                                                                                             
export function linearRgb(hex:string):[number,number,number]{const c=new Color(hex);return [c.r,c.g,c.b];}
export const POND_LINEAR={shallow:linearRgb(POND_LOOK.shallow),deep:linearRgb(POND_LOOK.deep)};
export const glslVec3=(v:readonly number[])=>`vec3(${v.map(x=>x.toFixed(4)).join(',')})`;
export function pondDepthShare(r:number){const t=Math.min(1,Math.max(0,(r-POND_LOOK.shallowFrom)/(.95-POND_LOOK.shallowFrom)));return 1-t*t*(3-2*t);}
                                                                                                                                             
export const FLOOR_LOOK={slopeFrom:.62,slopeTo:.78,rock:[.36,.32,.27] as const,rockMix:.85,dappleLow:.3,dappleHigh:.9,
                                                                                                                                  
 dappleShade:.4,dappleSun:1.5};
                                                                                                                                  
export function windOffset(t:number,y:number,amp:number,p:number){return Math.sin(t*1.3+p)*amp*Math.max(y,0);}
                                                          
export function leafTranslucency(vDotLn:number,nDotL=1){const c=(x:number)=>Math.min(1,Math.max(0,x));return FOLIAGE.forward*c(vDotLn)**FOLIAGE.wide+FOLIAGE.backFace*c(-nDotL)**1.5;}
                                                          
export function canopyTint(y:number){const t=Math.min(1,Math.max(0,(y-CANOPY.from)/(CANOPY.to-CANOPY.from))),k=t*t*(3-2*t);return CANOPY.low.map((l,i)=>l+(CANOPY.high[i]-l)*k);}
                                                         
export function slopeRock(ny:number){const t=Math.min(1,Math.max(0,(ny-FLOOR_LOOK.slopeFrom)/(FLOOR_LOOK.slopeTo-FLOOR_LOOK.slopeFrom))),k=t*t*(3-2*t);return (1-k)*FLOOR_LOOK.rockMix;}
export type GardenPatch={fog:GardenFogUniforms;ground?:GardenGroundUniforms;foliage?:FoliageUniforms;
                                                                                                                 
 groundMode?:'floor'|'occlude';
                                                                                                           
 canopy?:boolean;wrap?:boolean;
                                                                                     
 pond?:{centre:[number,number];radius:[number,number]};
                                                                                                             
 translucent?:boolean;
                                                                                                                    
 moss?:boolean;shore?:{centre:[number,number];radius:[number,number]};
                                                                                                        
 autumn?:boolean;glow?:{value:number}};
export function patchGardenMaterial(material:Material,patch:GardenPatch){
 const mode=patch.ground?patch.groundMode??'occlude':'none';
 const foliage=!!patch.foliage;
 const canopy=!!patch.canopy,wrap=!!patch.wrap,translucent=foliage&&patch.translucent!==false,pond=patch.pond,moss=!!patch.moss,shore=patch.shore,autumn=!!patch.autumn,glow=patch.glow;
 material.customProgramCacheKey=()=>'garden-v4-'+mode+(foliage?(translucent?'-foliage':'-wind'):'')+(canopy?'-canopy':'')+(wrap?'-wrap':'')+(pond?'-pond':'')+(moss?'-moss':'')+(shore?'-shore':'')+(autumn?'-autumn':'')+(glow?'-glow':'');
 material.onBeforeCompile=(shader:WebGLProgramParametersWithUniforms)=>{
  Object.assign(shader.uniforms,patch.fog,patch.ground??{},patch.foliage??{},glow?{gardenGlow:glow}:{});
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vGardenWorld;'+(foliage?'\nuniform float uWindTime;uniform float uWindAmp;':'')).replace('#include <begin_vertex>','#include <begin_vertex>'+(foliage?`
 {
 #ifdef USE_INSTANCING
  vec2 windRoot=instanceMatrix[3].xz;
 #else
  vec2 windRoot=vec2(0.0);
 #endif
  float windPhase=dot(windRoot,vec2(0.7,0.5));float windLift=max(transformed.y,0.0)*uWindAmp;
  transformed.x+=sin(uWindTime*1.3+windPhase)*windLift;transformed.z+=sin(uWindTime*1.1+windPhase*1.7)*windLift*0.6; }`:'')).replace('#include <project_vertex>',`#include <project_vertex>
 { vec4 gardenWorld=vec4(transformed,1.0);
 #ifdef USE_INSTANCING
  gardenWorld=instanceMatrix*gardenWorld;
 #endif
  vGardenWorld=(modelMatrix*gardenWorld).xyz; }`);
  let fragment=shader.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vGardenWorld;uniform float gardenFogDensity;uniform float gardenGroundFog;uniform float gardenFogFalloff;
uniform vec3 gardenSunDir;uniform vec3 gardenSunGlow;uniform float gardenGlowShare;uniform vec3 gardenFogBack;${pond?'uniform vec3 gardenHorizon;':''}${glow?'uniform float gardenGlow;':''}
${patch.ground?'uniform sampler2D gardenGroundMap;uniform vec4 gardenGroundBounds;':''}
${NOISE}
${moss||shore||autumn?FOCUS_FADE:''}`);
  if(patch.ground){
   fragment=fragment.replace('#include <map_fragment>',`#include <map_fragment>
 vec2 gardenUv=(vGardenWorld.xz-gardenGroundBounds.xy)/gardenGroundBounds.zw;
 vec4 gardenGround=(gardenUv.x<0.0||gardenUv.y<0.0||gardenUv.x>1.0||gardenUv.y>1.0)?vec4(1.0,0.0,0.0,0.0):texture2D(gardenGroundMap,gardenUv);`+(mode==='floor'?`
 { float lum=dot(diffuseColor.rgb,vec3(.299,.587,.114));
   float n=gardenNoise(vGardenWorld.xz*.31)*.6+gardenNoise(vGardenWorld.xz*1.9)*.4;
   vec3 grass=mix(vec3(.045,.10,.018),vec3(.15,.25,.04),n)*(.75+lum*2.0);
   vec3 moss=vec3(.05,.075,.03)*(.8+lum*2.0);
   diffuseColor.rgb=mix(diffuseColor.rgb,mix(grass,moss,clamp(1.0-gardenGround.r,0.0,1.0)*1.6),gardenGround.g*.92);
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.08,1.02,.92),gardenGround.b); }`:''));
   fragment=fragment.replace('#include <aomap_fragment>',`#include <aomap_fragment>
 reflectedLight.indirectDiffuse*=gardenGround.r;
 #if defined( USE_ENVMAP ) && defined( STANDARD )
  reflectedLight.indirectSpecular*=gardenGround.r;
 #endif`);
  }
  if(translucent)fragment=fragment.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
 #if NUM_DIR_LIGHTS > 0
 { vec3 leafView=normalize(vViewPosition);DirectionalLight leafLight;
  #pragma unroll_loop_start
  for(int i=0;i<NUM_DIR_LIGHTS;i++){
   leafLight=directionalLights[ i ];
   float leafBack=${FOLIAGE.forward.toFixed(2)}*pow(clamp(dot(leafView,-leafLight.direction+normal*0.4),0.0,1.0),${FOLIAGE.wide.toFixed(2)})+${FOLIAGE.backFace.toFixed(2)}*pow(clamp(-dot(normal,leafLight.direction),0.0,1.0),1.5);
   // Light through a leaf takes the leaf's own colour, warmed a little toward yellow-green: red or autumn leaves stay red (G1 fix).
   reflectedLight.directDiffuse+=leafBack*leafLight.color*mix(diffuseColor.rgb*1.6,vec3(${FOLIAGE.tint.join(',')}),${FOLIAGE.tintShare.toFixed(2)})*${FOLIAGE.translucency.toFixed(2)};
  }
  #pragma unroll_loop_end
 }
 #endif`);
  if(pond){
   fragment=fragment.replace('#include <map_fragment>',`#include <map_fragment>
 float pondR=length((vGardenWorld.xz-vec2(${pond.centre.map(v=>v.toFixed(2)).join(',')}))/vec2(${pond.radius.map(v=>v.toFixed(2)).join(',')}));
 diffuseColor.rgb=mix(${glslVec3(POND_LINEAR.shallow)},${glslVec3(POND_LINEAR.deep)},1.0-smoothstep(${POND_LOOK.shallowFrom.toFixed(2)},0.95,pondR));`)
    .replace('#include <opaque_fragment>',`{ vec2 pondQ=vGardenWorld.xz*1.3;float pondCaustic=0.0;for(int i=0;i<2;i++){pondQ+=vec2(sin(pondQ.y*1.3),cos(pondQ.x*1.1))*0.55;pondCaustic+=pow(0.5+0.5*sin(pondQ.x+pondQ.y),6.0);}
   float pondShallow=smoothstep(${POND_LOOK.shallowFrom.toFixed(2)},0.95,pondR);
   float pondLace=smoothstep(0.45,0.7,gardenNoise(vGardenWorld.xz*2.4));
   float pondFoam=smoothstep(${POND_LOOK.foamFrom.toFixed(2)},0.97,pondR)*(1.0-smoothstep(0.99,${POND_LOOK.foamTo.toFixed(2)},pondR))*pondLace;
   outgoingLight+=pondCaustic*0.5*0.10*pondShallow*vec3(1.0,0.96,0.82)+pondFoam*0.45;
   // W1: deep water absorbs light but scatters a vivid teal; at grazing angles the surface mirrors the sky colour.
   float pondFresnel=pow(1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0),5.0);
   outgoingLight=mix(outgoingLight*mix(1.0,${WATER.absorb.toFixed(2)},1.0-pondShallow)+${glslVec3(linearRgb(WATER.scatter))}*${WATER.scatterShare.toFixed(2)}*(1.0-pondShallow)*(1.0-pondFresnel),gardenHorizon,pondFresnel*${WATER.fresnel.toFixed(2)}); }
#include <opaque_fragment>`)
    .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 { vec2 pondD=vGardenWorld.xz*${WATER.detail.toFixed(2)};float pondH=gardenNoise(pondD)+gardenNoise(pondD*2.7)*.5;
   vec2 pondSlope=vec2(gardenNoise(pondD+vec2(.05,0.0))+gardenNoise((pondD+vec2(.05,0.0))*2.7)*.5-pondH,gardenNoise(pondD+vec2(0.0,.05))+gardenNoise((pondD+vec2(0.0,.05))*2.7)*.5-pondH)/.05;
   float pondNear=1.0-smoothstep(15.0,40.0,length(vGardenWorld-cameraPosition));// far ripples alias into white streaks
   normal=normalize(normal+(viewMatrix*vec4(-pondSlope.x*${WATER.detailStrength.toFixed(2)}*pondNear,0.0,-pondSlope.y*${WATER.detailStrength.toFixed(2)}*pondNear,0.0)).xyz); }`);}
  if(canopy)fragment=fragment.replace('#include <map_fragment>',`#include <map_fragment>
 { float canopyT=smoothstep(${CANOPY.from.toFixed(1)},${CANOPY.to.toFixed(1)},vGardenWorld.y);diffuseColor.rgb*=mix(vec3(${CANOPY.low.join(',')}),vec3(${CANOPY.high.join(',')}),canopyT); }`);
  if(wrap)fragment=fragment.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
 #if NUM_DIR_LIGHTS > 0
 { DirectionalLight wrapLight;
  #pragma unroll_loop_start
  for(int i=0;i<NUM_DIR_LIGHTS;i++){
   wrapLight=directionalLights[ i ];
   float wrapNl=dot(normal,wrapLight.direction);
   reflectedLight.directDiffuse+=max(pow(0.5*wrapNl+0.5,2.0)-max(wrapNl,0.0),0.0)*${GARDEN_WRAP.strength.toFixed(2)}*wrapLight.color*vec3(${GARDEN_WRAP.cool.join(',')})*BRDF_Lambert(material.diffuseColor);
  }
  #pragma unroll_loop_end
 }
 #endif`);
  if(mode==='floor'){
   fragment=fragment.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 { vec3 floorWorldN=(vec4(normal,0.0)*viewMatrix).xyz;
   float floorRock=(1.0-smoothstep(${FLOOR_LOOK.slopeFrom.toFixed(2)},${FLOOR_LOOK.slopeTo.toFixed(2)},floorWorldN.y))*${FLOOR_LOOK.rockMix.toFixed(2)};
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(${FLOOR_LOOK.rock.join(',')})*(0.8+gardenNoise(vGardenWorld.xz*0.9)*0.4),floorRock); }`);
   fragment=fragment.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
 { float dappleBand=smoothstep(${FLOOR_LOOK.dappleLow.toFixed(2)},0.45,gardenGround.r)*(1.0-smoothstep(0.8,${FLOOR_LOOK.dappleHigh.toFixed(2)},gardenGround.r));
   float dappleSpot=smoothstep(0.45,0.7,gardenNoise(vGardenWorld.xz*1.7)*0.6+gardenNoise(vGardenWorld.xz*4.3+7.0)*0.4);
   reflectedLight.directDiffuse*=mix(1.0,${FLOOR_LOOK.dappleShade.toFixed(2)}+${(FLOOR_LOOK.dappleSun-FLOOR_LOOK.dappleShade).toFixed(2)}*dappleSpot,dappleBand); }`);
  }
  if(autumn)fragment=fragment.replace('#include <color_fragment>',`#include <color_fragment>
 { vec2 autumnP=vGardenWorld.xz;float autumnF=(sin(autumnP.x*0.13+1.7)*sin(autumnP.y*0.11+0.4)+sin((autumnP.x-autumnP.y)*0.07+2.1))*0.5;
   float autumnShare=smoothstep(${AUTUMN.from.toFixed(2)},${AUTUMN.to.toFixed(2)},autumnF)*gardenFocusFade(autumnP);
   float autumnHue=smoothstep(0.0,1.0,clamp((sin(autumnP.x*0.05-autumnP.y*0.04)+0.3)/0.6,0.0,1.0));
   float autumnLum=dot(diffuseColor.rgb,vec3(.299,.587,.114));
   vec3 autumnTint=mix(${glslVec3(linearRgb(AUTUMN.amber))},${glslVec3(linearRgb(AUTUMN.red))},autumnHue)*(${AUTUMN.gain[0].toFixed(2)}+autumnLum*${AUTUMN.gain[1].toFixed(2)});
   diffuseColor.rgb=mix(diffuseColor.rgb,autumnTint,autumnShare); }`);
  if(glow)fragment=fragment.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
 totalEmissiveRadiance+=diffuseColor.rgb*gardenGlow;`);
  if(moss)fragment=fragment.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 { vec3 mossN=(vec4(normal,0.0)*viewMatrix).xyz;
   float mossTop=smoothstep(${MOSS.from.toFixed(2)},${MOSS.to.toFixed(2)},mossN.y)*smoothstep(0.25,0.5,gardenNoise(vGardenWorld.xz*1.3)*0.7+gardenNoise(vGardenWorld.xz*5.1)*0.3)*gardenFocusFade(vGardenWorld.xz);
   diffuseColor.rgb=mix(diffuseColor.rgb,${glslVec3(linearRgb(MOSS.colour))}*(0.85+0.3*gardenNoise(vGardenWorld.xz*3.7)),mossTop*${MOSS.share.toFixed(2)});
   roughnessFactor=mix(roughnessFactor,0.95,mossTop); }`);
  if(shore)fragment=fragment.replace('#include <lights_physical_fragment>',`{ float shoreR=length((vGardenWorld.xz-vec2(${shore.centre.map(v=>v.toFixed(2)).join(',')}))/vec2(${shore.radius.map(v=>v.toFixed(2)).join(',')}))+(gardenNoise(vGardenWorld.xz*0.8)-0.5)*0.12;
   float shoreWet=(1.0-smoothstep(${SHORE.wetTo.toFixed(2)},${SHORE.dryFrom.toFixed(2)},shoreR))*gardenFocusFade(vGardenWorld.xz);
   diffuseColor.rgb*=mix(1.0,${SHORE.darken.toFixed(2)},shoreWet);roughnessFactor=mix(roughnessFactor,${SHORE.roughness.toFixed(2)},shoreWet); }
#include <lights_physical_fragment>`);
  shader.fragmentShader=fragment.replace('#include <fog_fragment>',`#ifdef USE_FOG
 { vec3 gardenView=vGardenWorld-cameraPosition;float gardenDistance=length(gardenView);
   // W1: toward the sun the haze warms and thickens a little (forward scattering); away from it it cools but keeps its brightness.
   float sunward=pow(max(dot(gardenView/max(gardenDistance,1e-4),gardenSunDir),0.0),3.0);
   vec3 gardenFogColor=mix(fogColor*mix(gardenFogBack,vec3(1.0),sunward),gardenSunGlow,sunward*gardenGlowShare);
   float haze=(1.0-exp(-gardenFogDensity*gardenFogDensity*gardenDistance*gardenDistance))*(1.0+0.4*sunward*gardenGlowShare);
   float low=(1.0-exp(-gardenDistance*.02))*exp(-max(vGardenWorld.y+.5,0.0)*gardenFogFalloff)*gardenGroundFog;
   gl_FragColor.rgb=mix(gl_FragColor.rgb,gardenFogColor,clamp(max(haze,low),0.0,1.0)); }
#endif`);
 };
 material.needsUpdate=true;
}
