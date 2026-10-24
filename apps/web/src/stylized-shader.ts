import {Vector3,type Material,type Object3D,type WebGLProgramParametersWithUniforms} from 'three';
                                                                                        
                                                   
                                                           
                                       
                                                                          
                           
export const STYLE={wrap:.35,cool:[.80,.86,1.0] as const,bottomDark:.12,bottomSpan:.25,topLight:.05,rim:.18};
                                                                                                                                  
export function wrapFill(nl:number){const w=(.5*nl+.5)**2;return Math.max(w-Math.max(nl,0),0)*STYLE.wrap;}
const smooth=(a:number,b:number,x:number)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
                                                                     
export function verticalGrade(t:number){const k=Math.min(1,Math.max(0,t));return (1-STYLE.bottomDark+STYLE.bottomDark*smooth(0,STYLE.bottomSpan,k))*(1+STYLE.topLight*smooth(.6,1,k));}
                                                                      
export function rimTerm(ndv:number,ny:number){return (1-Math.max(ndv,0))**4*Math.max(ny,0)*STYLE.rim;}
export type StylizedUniforms={uStyleBase:{value:number};uStyleHeight:{value:number}};
export function createStylizedUniforms():StylizedUniforms{return {uStyleBase:{value:0},uStyleHeight:{value:1}};}
const framePosition=new Vector3(),frameScale=new Vector3();
                                                                                                                                  
                                                                                                                                     
                                                                                                                             
export function updateStyleUniforms(wrapper:Object3D,localHeight:number,u:StylizedUniforms){
 wrapper.getWorldPosition(framePosition);wrapper.getWorldScale(frameScale);u.uStyleBase.value=framePosition.y;u.uStyleHeight.value=localHeight*frameScale.y;
}
const f=(n:number)=>n.toFixed(3);
const VERTEX_HEAD='varying float vStyleWorldY;';
const VERTEX_BODY=`{ vec4 styleWorld=vec4(transformed,1.0);
 #ifdef USE_INSTANCING
  styleWorld=instanceMatrix*styleWorld;
 #endif
  vStyleWorldY=(modelMatrix*styleWorld).y; }`;
const FRAGMENT_HEAD='varying float vStyleWorldY;uniform float uStyleBase;uniform float uStyleHeight;';
const FRAGMENT_LIGHT=`{ float styleT=clamp((vStyleWorldY-uStyleBase)/max(uStyleHeight,1e-3),0.0,1.0);
  #if NUM_DIR_LIGHTS > 0
  DirectionalLight styleLight;
  #pragma unroll_loop_start
  for(int i=0;i<NUM_DIR_LIGHTS;i++){
   styleLight=directionalLights[ i ];
   float styleNl=dot(normal,styleLight.direction);float styleWrap=pow(0.5*styleNl+0.5,2.0);
   reflectedLight.directDiffuse+=max(styleWrap-max(styleNl,0.0),0.0)*${f(STYLE.wrap)}*styleLight.color*vec3(${STYLE.cool.map(f).join(',')})*BRDF_Lambert(material.diffuseColor);
  }
  #pragma unroll_loop_end
  #endif
  float styleGrade=(${f(1-STYLE.bottomDark)}+${f(STYLE.bottomDark)}*smoothstep(0.0,${f(STYLE.bottomSpan)},styleT))*(1.0+${f(STYLE.topLight)}*smoothstep(0.6,1.0,styleT));
  reflectedLight.directDiffuse*=styleGrade;reflectedLight.indirectDiffuse*=styleGrade; }`;
const FRAGMENT_RIM=`{ vec3 styleView=normalize(vViewPosition);vec3 styleWorldN=(vec4(normal,0.0)*viewMatrix).xyz;
  float styleRim=pow(1.0-max(dot(normal,styleView),0.0),4.0)*max(styleWorldN.y,0.0)*${f(STYLE.rim)};
  outgoingLight+=styleRim*vec3(1.0,0.97,0.9)*(0.5+0.5*diffuseColor.rgb); }`;
                                                                                                                                         
export function patchStylized(material:Material,uniforms:StylizedUniforms){
 if(!(material as {isMeshStandardMaterial?:boolean}).isMeshStandardMaterial)return false;
 const physical=!!(material as {isMeshPhysicalMaterial?:boolean}).isMeshPhysicalMaterial;
 material.customProgramCacheKey=()=>physical?'stylized-v1-physical':'stylized-v1';
 material.onBeforeCompile=(shader:WebGLProgramParametersWithUniforms)=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+VERTEX_HEAD).replace('#include <project_vertex>','#include <project_vertex>\n'+VERTEX_BODY);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+FRAGMENT_HEAD)
   .replace('#include <lights_fragment_end>','#include <lights_fragment_end>\n'+FRAGMENT_LIGHT)
   .replace('#include <opaque_fragment>',FRAGMENT_RIM+'\n#include <opaque_fragment>');
 };
 material.needsUpdate=true;return true;
}
