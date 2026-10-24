import {CircleGeometry,Color,Matrix4,ShaderMaterial,type Texture} from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {POND_LINEAR,WATER,glslVec3,linearRgb} from './garden-shaders';
import {POND_MIRROR} from './garden-layout';

                                                                                                
                                                                                                                                            
export function createGardenReflection(normalMap:Texture|null,resolution:256|512){
 const geometry=new CircleGeometry(1,96);
 const reflector=new Reflector(geometry,{textureWidth:resolution,textureHeight:resolution,multisample:0,clipBias:.003,color:'#45675c',shader:{
  name:'GardenWaterReflection',
  uniforms:{color:{value:new Color()},tDiffuse:{value:null},textureMatrix:{value:new Matrix4()},normalMap:{value:normalMap},hasNormal:{value:normalMap?1:0}},
  vertexShader:`uniform mat4 textureMatrix;varying vec4 reflectionUv;varying vec2 surfaceUv;varying vec3 eyeDirection;
   void main(){surfaceUv=uv;reflectionUv=textureMatrix*vec4(position,1.0);eyeDirection=cameraPosition-(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform vec3 color;uniform sampler2D tDiffuse;uniform sampler2D normalMap;uniform float hasNormal;varying vec4 reflectionUv;varying vec2 surfaceUv;varying vec3 eyeDirection;
   void main(){vec2 ripple=hasNormal*(texture2D(normalMap,surfaceUv*vec2(8.0,6.0)).xy*2.0-1.0);vec4 projected=reflectionUv;projected.xy+=ripple*.005*projected.w;vec3 reflection=texture2DProj(tDiffuse,projected).rgb;float fresnel=pow(1.0-clamp(abs(normalize(eyeDirection).y),0.0,1.0),3.0);float pondR=length(surfaceUv-0.5)*2.0;vec3 pondBase=mix(${glslVec3(POND_LINEAR.shallow)},${glslVec3(POND_LINEAR.deep)},1.0-smoothstep(0.55,0.95,pondR));vec3 pondColor=mix(pondBase,reflection,.32+.53*fresnel);float pondDeep=1.0-smoothstep(0.55,0.95,pondR);pondColor=pondColor*mix(1.0,${WATER.absorb.toFixed(2)},pondDeep*(1.0-fresnel))+${glslVec3(linearRgb(WATER.scatter))}*${WATER.scatterShare.toFixed(2)}*pondDeep*(1.0-fresnel);vec2 pondQ=surfaceUv*vec2(30.0,22.0);float pondCaustic=0.0;for(int i=0;i<2;i++){pondQ+=vec2(sin(pondQ.y*1.3),cos(pondQ.x*1.1))*0.55;pondCaustic+=pow(0.5+0.5*sin(pondQ.x+pondQ.y),6.0);}pondColor+=pondCaustic*0.05*smoothstep(0.55,0.95,pondR)*(1.0-fresnel)*vec3(1.0,0.96,0.82);float pondFoam=smoothstep(0.9,0.97,pondR)*(1.0-smoothstep(0.99,1.0,pondR))*step(0.45,fract(sin(dot(floor(surfaceUv*90.0),vec2(12.99,78.23)))*43758.55));pondColor+=pondFoam*0.4;gl_FragColor=vec4(pondColor,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 }});
                                                                                                          
 (reflector.material as ShaderMaterial).uniforms.normalMap.value=normalMap;
 reflector.position.set(POND_MIRROR.x,POND_MIRROR.y,POND_MIRROR.z);reflector.rotation.x=-Math.PI/2;reflector.scale.set(POND_MIRROR.radiusX,POND_MIRROR.radiusZ,1);reflector.name='Garden_water_reflection';
 let disposed=false;return {object:reflector,dispose(){if(disposed)return;disposed=true;reflector.dispose();geometry.dispose();}};
}
