import {useEffect,useState} from 'react';
import {useThree} from '@react-three/fiber';
import {Sky} from 'three/addons/objects/Sky.js';
import type {WebGLProgramParametersWithUniforms} from 'three';
import {configureSky} from './garden-environment';
                                                                                             
                                                        
                                                            
export type SkyMood='day'|'sunset'|'evening';
export const SKY_LOOK:Record<SkyMood,{gold:number;night:number}>={day:{gold:.35,night:0},sunset:{gold:1,night:0},evening:{gold:.2,night:1}};
                                                                                  
                                                                                                                                    
                                                                                           
export const MOON_DIRECTION=[-.301,.225,-.926].map((v,_,a)=>v/Math.hypot(...a)) as [number,number,number];
const GOLD=`
				// Gold lining: the thin edge of a cloud on the sun's side.
				texColor+=vec3(1.0,0.72,0.38)*pow(max(dot(direction,vSunDirection),0.0),6.0)*cloudMask*(1.0-cloudMask)*4.0*uGoldLining*vSunE*0.00002;
`;
const NIGHT=`
			if(uNight>0.0&&direction.y>0.0){
				vec3 starCell=floor(direction*220.0);float starSeed=fract(sin(dot(starCell,vec3(12.9898,78.233,45.164)))*43758.5453);
				float star=step(0.9975,starSeed)*smoothstep(0.05,0.35,direction.y);
				float moonDot=dot(direction,vec3(${MOON_DIRECTION.map(v=>v.toFixed(4)).join(',')}));
				float moon=smoothstep(0.9993,0.9996,moonDot)*1.2+pow(max(moonDot,0.0),400.0)*0.4;
				texColor+=(star*0.8*vec3(0.9,0.95,1.0)+moon*vec3(0.85,0.9,1.0))*uNight;
			}
`;
export function patchGardenSky(shader:Pick<WebGLProgramParametersWithUniforms,'uniforms'|'fragmentShader'>,looks:{gold:{value:number};night:{value:number}}){
 shader.uniforms.uGoldLining=looks.gold;shader.uniforms.uNight=looks.night;
 shader.fragmentShader=shader.fragmentShader.replace('uniform float time;','uniform float time;\n\t\tuniform float uGoldLining;\n\t\tuniform float uNight;')
  .replace('texColor = mix( texColor, cloudColor, cloudMask * cloudDensity );','texColor = mix( texColor, cloudColor, cloudMask * cloudDensity );'+GOLD)
  .replace('gl_FragColor = vec4( texColor, 1.0 );',NIGHT+'\n\t\t\tgl_FragColor = vec4( texColor, 1.0 );');
}
export function GardenSky({sun,mood='day'}:{sun:readonly number[];mood?:SkyMood}){
 const [looks]=useState(()=>({gold:{value:SKY_LOOK.day.gold},night:{value:0}}));
 const [sky]=useState(()=>{const value=new Sky();value.scale.setScalar(450);configureSky(value,[0,1,0]);
  value.material.onBeforeCompile=shader=>patchGardenSky(shader,looks);value.material.customProgramCacheKey=()=>'garden-sky-g1';return value;});
 const {invalidate}=useThree();
 useEffect(()=>{sky.material.uniforms.sunPosition.value.fromArray(sun);invalidate();},[sky,sun,invalidate]);
 useEffect(()=>{looks.gold.value=SKY_LOOK[mood].gold;looks.night.value=SKY_LOOK[mood].night;invalidate();},[looks,mood,invalidate]);
 useEffect(()=>()=>{sky.geometry.dispose();sky.material.dispose();},[sky]);
 return <primitive object={sky} dispose={null}/>;
}
