import {useEffect,useMemo,useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {AdditiveBlending,Box3,BufferAttribute,BufferGeometry,Color,DoubleSide,PlaneGeometry,ShaderMaterial,Sphere,Vector3} from 'three';
import {plantedTrunks,inTrayFocus,POND,TEA_HOUSE,LANTERNS,MOOD_SUN,gardenFloor} from './garden-layout';
export {LANTERNS};
import {haloTexture} from './room-lighting';
                                                                         
                                                                  

                                                                                                                                                 
                                                                                                                                       
export function beamOverFocus(x:number,z:number,suns:readonly (readonly number[])[]=BEAM_SUNS){
 for(let d=-6;d<=6;d+=1.5)for(const dz of [-6,0,6])if(inTrayFocus(x+d,z+dz))return true;
 return suns.some(sun=>{const v=new Vector3(...sun).normalize();for(let k=0;k<=8;k++){const t=k/8*BEAM.length;if(inTrayFocus(x+v.x*t,z+v.z*t))return true;}return false;});
}
                                                                                                                                
                                                                                                
export const BEAM_SUNS:readonly (readonly number[])[]=[MOOD_SUN.day,MOOD_SUN.sunset];
export function beamSpots(trunks=plantedTrunks()){
 const ring=trunks.filter(t=>{const r=Math.hypot(t.x,t.z);if(r<=14||r>=55)return false;const sx=t.x-t.x/r*1.5,sz=t.z-t.z/r*1.5;return !beamOverFocus(sx,sz);});
 const picked:{x:number;z:number}[]=[];
 for(let k=0;k<8;k++){const target=k*Math.PI/4;let best:typeof ring[number]|undefined,bestScore=Infinity;
  for(const t of ring){if(picked.some(p=>Math.hypot(p.x-t.x,p.z-t.z)<5))continue;const a=Math.atan2(t.z,t.x),d=Math.abs(Math.atan2(Math.sin(a-target),Math.cos(a-target)));if(d<bestScore){bestScore=d;best=t;}}
                                                                                                              
  if(best){const r=Math.hypot(best.x,best.z);picked.push({x:best.x-best.x/r*1.5,z:best.z-best.z/r*1.5});}}
 return picked;
}
export const BEAM={length:16,width:1.8,day:{color:'#fff2cf',strength:.10},sunset:{color:'#ffc27a',strength:.16},nearFade:[3,9] as const};
                                                                                                                                      
                                                                                                                                       
export const BEAM_SIDE_FADE=[.15,.5] as const;
const BEAM_VERTEX=`varying vec2 vBeamUv;varying vec3 vBeamWorld;varying vec3 vBeamNormal;void main(){vBeamUv=uv;vec4 w=modelMatrix*vec4(position,1.0);vBeamWorld=w.xyz;vBeamNormal=normalize(mat3(modelMatrix)*vec3(0.0,0.0,1.0));gl_Position=projectionMatrix*viewMatrix*w;}`;
const BEAM_FRAGMENT=`uniform vec3 uColor;uniform float uStrength;varying vec2 vBeamUv;varying vec3 vBeamWorld;varying vec3 vBeamNormal;
float beamHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float beamNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(beamHash(i),beamHash(i+vec2(1,0)),f.x),mix(beamHash(i+vec2(0,1)),beamHash(i+vec2(1,1)),f.x),f.y);}
void main(){
 float across=1.0-abs(vBeamUv.x*2.0-1.0);across*=across;
 float along=smoothstep(0.0,0.25,vBeamUv.y)*(1.0-smoothstep(0.55,1.0,vBeamUv.y));
 float streak=0.55+0.45*(beamNoise(vec2(vBeamUv.x*7.0,vBeamUv.y*3.0))*0.65+beamNoise(vec2(vBeamUv.x*17.0,vBeamUv.y*9.0+3.1))*0.35);
 float side=smoothstep(${BEAM_SIDE_FADE[0].toFixed(2)},${BEAM_SIDE_FADE[1].toFixed(2)},abs(dot(normalize(cameraPosition-vBeamWorld),vBeamNormal)));
 float near=smoothstep(${BEAM.nearFade[0].toFixed(1)},${BEAM.nearFade[1].toFixed(1)},distance(cameraPosition,vBeamWorld));
 gl_FragColor=vec4(uColor*uStrength*across*along*streak*near*side,1.0);
}`;
                                                                                                                                    
export function GardenSunbeams({sun,mood}:{sun:readonly number[];mood:'day'|'sunset'}){
 const [geometry]=useState(()=>{const g=new PlaneGeometry(BEAM.width,BEAM.length);g.translate(0,BEAM.length/2,0);return g;});
 const look=BEAM[mood];
 const [material]=useState(()=>new ShaderMaterial({vertexShader:BEAM_VERTEX,fragmentShader:BEAM_FRAGMENT,uniforms:{uColor:{value:new Color(look.color)},uStrength:{value:look.strength}},transparent:true,depthWrite:false,blending:AdditiveBlending,side:DoubleSide}));
 useEffect(()=>{(material.uniforms.uColor.value as Color).set(look.color);material.uniforms.uStrength.value=look.strength;},[material,look]);
 useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);
 const spots=useMemo(()=>beamSpots(),[]);
 const axis=useMemo(()=>new Vector3(...sun).normalize(),[sun]);
                                                                                                                  
 return <group>{spots.map(({x,z})=>{const base=gardenFloor(x,z);return <group key={`${x}:${z}`} position={[x,base,z]} quaternion={leanToward(axis)}>
  <mesh geometry={geometry} material={material} raycast={()=>null} renderOrder={6}/><mesh geometry={geometry} material={material} rotation={[0,Math.PI/2,0]} raycast={()=>null} renderOrder={6}/>
 </group>;})}</group>;
}
                                                                       
export function leanToward(to:Vector3):[number,number,number,number]{
 const from=new Vector3(0,1,0),c=from.dot(to);if(c>.999999)return [0,0,0,1];
 const axis=new Vector3().crossVectors(from,to).normalize(),half=Math.acos(Math.min(1,Math.max(-1,c)))/2,s=Math.sin(half);
 return [axis.x*s,axis.y*s,axis.z*s,Math.cos(half)];
}
                                                                                               
export function LanternHalos({mood}:{mood:'sunset'|'evening'}){
 const map=useMemo(haloTexture,[]);const strength=mood==='evening'?.8:.45;
 return <group>{LANTERNS.map(([x,lift,z],i)=>{const y=i<7?gardenFloor(x,z)+lift:lift;const size=i<7?1.7:2.6;
  return <sprite key={`${x}:${z}`} position={[x,y,z]} scale={[size,size,1]} renderOrder={7} raycast={()=>null}><spriteMaterial map={map} color="#ffcf8a" transparent opacity={strength} depthWrite={false} blending={AdditiveBlending}/></sprite>;})}</group>;
}
                                                                                                                                           
export const FIREFLY_COUNT=40;
                                                                                                                          
                                                                                                                                
const nearFocus=(x:number,z:number)=>inTrayFocus(x,z)||inTrayFocus(x-.8,z)||inTrayFocus(x+.8,z)||inTrayFocus(x,z-.8)||inTrayFocus(x,z+.8);
export function fireflyPosition(i:number,t:number):[number,number,number]{
 const h=(n:number)=>{const s=Math.sin(i*91.7+n*47.3)*43758.5453;return s-Math.floor(s);};
 const byPond=i%3!==0;let cx=0,cz=0;
 for(let k=0;k<24;k++){const a=h(1)*Math.PI*2+k*.37;
  cx=byPond?POND.x+Math.cos(a)*POND.radiusX*(1.05+h(2)*.25):(TEA_HOUSE.minX+TEA_HOUSE.maxX)/2+Math.cos(a)*7*h(2)+(byPond?0:3);
  cz=byPond?POND.z+Math.sin(a)*POND.radiusZ*(1.05+h(2)*.25):(TEA_HOUSE.minZ+TEA_HOUSE.maxZ)/2+Math.sin(a)*6*h(3)-2;
  if(!nearFocus(cx,cz))break;}
 return [cx+Math.sin(t*.4+h(4)*6.3)*.6,.6+h(5)*1.6+Math.sin(t*.7+h(6)*6.3)*.25,cz+Math.cos(t*.35+h(7)*6.3)*.6];
}
                                                                                       
                                                         
                                                                                                                                          
export function cloudSphere(boxes:Box3[],sprite:number){const all=new Box3();for(const b of boxes)all.union(b);const s=all.getBoundingSphere(new Sphere());s.radius+=sprite/2;return s;}
                                                                                                                                     
                                                                             
export function fireflyBoxes(){
 const boxes:Box3[]=[];
 for(let i=0;i<FIREFLY_COUNT;i++){const [x,y,z]=fireflyPosition(i,0),lift=y;let lo=Infinity,hi=-Infinity;
  for(let dx=-1.2;dx<=1.2001;dx+=.2)for(let dz=-1.2;dz<=1.2001;dz+=.2){const f=gardenFloor(x+dx,z+dz);lo=Math.min(lo,f);hi=Math.max(hi,f);}
  boxes.push(new Box3(new Vector3(x-1.2,lo+lift-.6,z-1.2),new Vector3(x+1.2,hi+lift+.6,z+1.2)));}
 return boxes;
}
export const fireflyBounds=()=>cloudSphere(fireflyBoxes(),FIREFLY_SIZE);
                                                                                                                                            
export function GardenFireflies(){
 const reduced=useMemo(()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches,[]);
 const [geometry]=useState(()=>{const g=new BufferGeometry();const p=new Float32Array(FIREFLY_COUNT*3);for(let i=0;i<FIREFLY_COUNT;i++){const [x,y,z]=fireflyPosition(i,0);p.set([x,gardenFloor(x,z)+y,z],i*3);}g.setAttribute('position',new BufferAttribute(p,3));g.boundingSphere=fireflyBounds();return g;});
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 useFrame(state=>{if(reduced)return;const position=geometry.getAttribute('position') as BufferAttribute;const t=state.clock.elapsedTime;
  for(let i=0;i<FIREFLY_COUNT;i++){const [x,y,z]=fireflyPosition(i,t);position.setXYZ(i,x,gardenFloor(x,z)+y,z);}position.needsUpdate=true;});
 const map=useMemo(haloTexture,[]);
 return <points geometry={geometry} raycast={()=>null} renderOrder={7}><pointsMaterial color="#d8ff9a" size={FIREFLY_SIZE} map={map} transparent opacity={.95} depthWrite={false} blending={AdditiveBlending} sizeAttenuation/></points>;
}
                                                                                
export const FIREFLY_SIZE=.4;
                                                                           
                                                           
export const POLLEN={count:{low:80,high:160,cinema:260} as Record<'low'|'high'|'cinema',number>,size:.13,day:'#ffd98a',sunset:'#ffc27a',drift:.3,gap:2.5};
                                                                                                                                         
export function pollenPosition(i:number,t:number,spots:readonly {x:number;z:number}[],sun:readonly number[]):[number,number,number]{
 const h=(n:number)=>{const s=Math.sin(i*57.3+n*19.1)*43758.5453;return s-Math.floor(s);};
 const spot=spots[i%spots.length],v=new Vector3(...sun).normalize();let x:number,y:number,z:number;
 if(i%2===0){const along=1.5+h(1)*8.5;x=spot.x+v.x*along+(h(2)-.5)*1.2;y=v.y*along;z=spot.z+v.z*along+(h(3)-.5)*1.2;}
 else {const a=h(1)*Math.PI*2,r=Math.sqrt(h(2))*POLLEN.gap;x=spot.x+Math.cos(a)*r;y=.4+h(3)*2.1;z=spot.z+Math.sin(a)*r;}
 return [x+Math.sin(t*.23+h(4)*6.3)*POLLEN.drift,y+Math.sin(t*.31+h(5)*6.3)*POLLEN.drift*.6,z+Math.cos(t*.19+h(6)*6.3)*POLLEN.drift];
}
                                                                                                                                                                                
export function pollenBoxes(spots:readonly {x:number;z:number}[],sun:readonly number[],count:number){
 const reach=new Vector3(2*POLLEN.drift,2*POLLEN.drift*.6,2*POLLEN.drift),boxes:Box3[]=[];
 for(let i=0;i<count;i++){const [x,y,z]=pollenPosition(i,0,spots,sun),spot=spots[i%spots.length],p=new Vector3(x,gardenFloor(spot.x,spot.z)+y,z);boxes.push(new Box3(p.clone().sub(reach),p.clone().add(reach)));}
 return boxes;
}
export const pollenBounds=(spots:readonly {x:number;z:number}[],sun:readonly number[],count:number)=>cloudSphere(pollenBoxes(spots,sun,count),POLLEN.size);
export function GardenPollen({sun,mood,tier}:{sun:readonly number[];mood:'day'|'sunset';tier:'low'|'high'|'cinema'}){
 const reduced=useMemo(()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches,[]);
 const spots=useMemo(()=>beamSpots(),[]);const count=spots.length?POLLEN.count[tier]:0;
                                                                                             
 const place=(i:number,t:number,out:Float32Array)=>{const [x,y,z]=pollenPosition(i,t,spots,sun);const spot=spots[i%spots.length];out.set([x,gardenFloor(spot.x,spot.z)+y,z],i*3);};
 const geometry=useMemo(()=>{const g=new BufferGeometry();const p=new Float32Array(Math.max(count,1)*3);for(let i=0;i<count;i++)place(i,0,p);g.setAttribute('position',new BufferAttribute(p,3));g.setDrawRange(0,count);g.boundingSphere=count?pollenBounds(spots,sun,count):new Sphere();return g;},[count,sun]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 useFrame(state=>{if(reduced||!count)return;const position=geometry.getAttribute('position') as BufferAttribute;for(let i=0;i<count;i++)place(i,state.clock.elapsedTime,position.array as Float32Array);position.needsUpdate=true;});
 const map=useMemo(haloTexture,[]);
 return <points geometry={geometry} raycast={()=>null} renderOrder={7}><pointsMaterial color={POLLEN[mood]} size={POLLEN.size} map={map} transparent opacity={.9} depthWrite={false} blending={AdditiveBlending} sizeAttenuation/></points>;
}
