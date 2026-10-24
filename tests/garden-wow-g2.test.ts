import {describe,expect,it} from 'vitest';
import {MeshStandardMaterial,ShaderLib,Vector3} from 'three';
import {beamSpots,beamOverFocus,leanToward,LANTERNS,fireflyPosition,FIREFLY_COUNT,BEAM,BEAM_SUNS} from '../apps/web/src/garden-extras';
import {flowerSpot,flowerClumpGeometry,FLOWER_COLOURS,FLOWER_SHARE} from '../apps/web/src/garden-vegetation';
import {patchGardenMaterial,createFogUniforms,pondDepthShare,POND_LOOK,POND_LINEAR,glslVec3} from '../apps/web/src/garden-shaders';
import {Color} from 'three';
import {inTrayFocus,POND,TEA_HOUSE,plantedTrunks} from '../apps/web/src/garden-layout';
import {createGardenReflection} from '../apps/web/src/garden-reflection';
                                                                   
describe('light shafts',()=>{
 it('six to eight spots in tree gaps, 14..55 m out, never in the sandtray focus, at least 5 m apart',()=>{
                                                                                                   
  const spots=beamSpots();expect(spots.length).toBeGreaterThanOrEqual(6);expect(spots.length).toBeLessThanOrEqual(8);
  for(const s of spots){const r=Math.hypot(s.x,s.z);expect(r).toBeGreaterThan(12);expect(r).toBeLessThan(55);expect(inTrayFocus(s.x,s.z)).toBe(false);}
                                                                                                  
  for(const s of spots)for(const sun of BEAM_SUNS){const v=new Vector3(...sun).normalize();for(let k=0;k<=16;k++){const t=k/16*BEAM.length;expect(inTrayFocus(s.x+v.x*t,s.z+v.z*t)).toBe(false);}}
  expect(beamOverFocus(0,0)).toBe(true);
                                                                                                           
  const close={x:0,z:-15.5,radius:.3,variant:'test'};expect(inTrayFocus(close.x,close.z)).toBe(false);expect(beamSpots([close])).toEqual([]);
  for(let i=0;i<spots.length;i++)for(let j=i+1;j<spots.length;j++)expect(Math.hypot(spots[i].x-spots[j].x,spots[i].z-spots[j].z)).toBeGreaterThanOrEqual(4.9);
  expect(beamSpots(plantedTrunks().filter(t=>inTrayFocus(t.x,t.z)))).toEqual([]);
 });
 it('leans each shaft from the ground toward the sun',()=>{
  for(const sun of [[24,38,12],[-35,12,18]]){const to=new Vector3(...sun).normalize();const [x,y,z,w]=leanToward(to);
   const up=new Vector3(0,1,0).applyQuaternion({x,y,z,w,isQuaternion:true} as any);expect(up.distanceTo(to)).toBeLessThan(1e-6);}
  expect(leanToward(new Vector3(0,1,0))).toEqual([0,0,0,1]);expect(BEAM.sunset.strength).toBeGreaterThan(BEAM.day.strength);
 });
});
describe('lanterns and fireflies',()=>{
 it('eight lanterns: the seven path lamps and the tea-house lamp',()=>{expect(LANTERNS.length).toBe(8);expect(LANTERNS[7]).toEqual([21,2.6,-16]);});
 it('fireflies stay by the pond bank or the tea house, outside the sandtray focus, and drift with time',()=>{
  for(let i=0;i<FIREFLY_COUNT;i++)for(const t of [0,5,60]){const [x,y,z]=fireflyPosition(i,t);
   const nearPond=Math.hypot((x-POND.x)/POND.radiusX,(z-POND.z)/POND.radiusZ)<1.45,nearTea=x>TEA_HOUSE.minX-8&&x<TEA_HOUSE.maxX+8&&z>TEA_HOUSE.minZ-8&&z<TEA_HOUSE.maxZ+8;
   expect(nearPond||nearTea,`${i} ${t}`).toBe(true);expect(inTrayFocus(x,z)).toBe(false);expect(y).toBeGreaterThan(.3);expect(y).toBeLessThan(2.5);}
  expect(fireflyPosition(4,1)).not.toEqual(fireflyPosition(4,2));
 });
});
describe('wildflowers',()=>{
 it('grow only on grass inside flower patches, never in the sandtray focus',()=>{
  expect(flowerSpot(0,30,30)).toBe(false);expect(flowerSpot(1,0,0)).toBe(false);
  let anywhere=0;for(let x=-60;x<=60;x+=1.5)for(let z=-60;z<=60;z+=1.5)if(flowerSpot(1,x,z)){anywhere++;expect(inTrayFocus(x,z)).toBe(false);}
  expect(anywhere).toBeGreaterThan(50);expect(FLOWER_SHARE).toBe(.12);expect(FLOWER_COLOURS.length).toBe(4);
 });
 it('one clump is four stems with small cross heads, all above the ground',()=>{
  const g=flowerClumpGeometry(),pos=g.getAttribute('position');expect(pos.count).toBe(4*(3+8));
  for(let i=0;i<pos.count;i++){expect(pos.getY(i)).toBeGreaterThanOrEqual(0);expect(pos.getY(i)).toBeLessThan(.4);}g.dispose();
 });
});
describe('pond',()=>{
 it('deep in the middle, shallow toward the bank',()=>{expect(pondDepthShare(0)).toBe(1);expect(pondDepthShare(1)).toBe(0);expect(pondDepthShare(.75)).toBeGreaterThan(0);expect(pondDepthShare(.75)).toBeLessThan(1);});
 it('patches three\'s real shader for Pond_Water only: shallow-to-deep colour, foam and static caustics',()=>{
  const compile=(m:MeshStandardMaterial)=>{const shader={uniforms:{} as Record<string,unknown>,vertexShader:ShaderLib.physical.vertexShader,fragmentShader:ShaderLib.physical.fragmentShader} as any;m.onBeforeCompile(shader,undefined as any);return shader;};
  const water=new MeshStandardMaterial();patchGardenMaterial(water,{fog:createFogUniforms(),pond:{centre:[POND.x,POND.z],radius:[POND.radiusX,POND.radiusZ]}});const f=compile(water).fragmentShader;
  expect(water.customProgramCacheKey()).toBe('garden-v4-none-pond');expect(f).toContain('float pondR=length(');expect(f).toContain('outgoingLight+=pondCaustic');
  expect(f).not.toContain('uTime');                                        
  const stone=new MeshStandardMaterial();patchGardenMaterial(stone,{fog:createFogUniforms()});expect(compile(stone).fragmentShader).not.toContain('pondR');
  expect(POND_LOOK.shallow).toBe('#5fa89b');expect(POND_LOOK.deep).toBe('#285258');
 });
                                                                                                                             
 it('both pond paths use the linear colours three converts from the codes, not the sRGB numbers',()=>{
  for(const key of ['shallow','deep'] as const){const c=new Color(POND_LOOK[key]);expect(POND_LINEAR[key][0]).toBeCloseTo(c.r,6);expect(POND_LINEAR[key][1]).toBeCloseTo(c.g,6);expect(POND_LINEAR[key][2]).toBeCloseTo(c.b,6);}
  expect(POND_LINEAR.deep[0]).toBeCloseTo(.0212,3);expect(POND_LINEAR.deep[1]).toBeCloseTo(.0844,3);expect(POND_LINEAR.deep[2]).toBeCloseTo(.0976,3);
  const compile=(m:MeshStandardMaterial)=>{const shader={uniforms:{} as Record<string,unknown>,vertexShader:ShaderLib.physical.vertexShader,fragmentShader:ShaderLib.physical.fragmentShader} as any;m.onBeforeCompile(shader,undefined as any);return shader;};
  const water=new MeshStandardMaterial();patchGardenMaterial(water,{fog:createFogUniforms(),pond:{centre:[POND.x,POND.z],radius:[POND.radiusX,POND.radiusZ]}});const surface=compile(water).fragmentShader;
  const owned=createGardenReflection(null,256);const mirror=(owned.object.material as any).fragmentShader as string;owned.dispose();
  for(const shader of [surface,mirror]){
   expect(shader).toContain(glslVec3(POND_LINEAR.shallow));expect(shader).toContain(glslVec3(POND_LINEAR.deep));
   for(const srgb of ['0.373,0.659,0.608','0.157,0.322,0.345'])expect(shader).not.toContain(srgb);
  }
 });
 it('the mirror (reflections switch) gets the same look',()=>{
  const owned=createGardenReflection(null,256);const fragment=(owned.object.material as any).fragmentShader as string;
  expect(fragment).toContain('float pondR=length(surfaceUv-0.5)*2.0;');expect(fragment).toContain('pondFoam');owned.dispose();
 });
});
