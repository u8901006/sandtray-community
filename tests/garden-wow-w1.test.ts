import {describe,expect,it} from 'vitest';
import {BoxGeometry,Color,Group,Mesh,MeshStandardMaterial,ShaderLib,Vector3} from 'three';
import {gardenSurfaces} from '../apps/web/src/garden-surfaces';
import {createGroundUniforms} from '../apps/web/src/garden-shaders';
import {patchGardenMaterial,createFogUniforms,setFogMood,fogSunward,FOG_LOOK,MOSS,SHORE,WATER,shoreWet,mossShare,focusFade,linearRgb,glslVec3,type GardenPatch} from '../apps/web/src/garden-shaders';
import {inTrayFocus,POND,TRAY_FOCUS} from '../apps/web/src/garden-layout';
import {createGardenReflection} from '../apps/web/src/garden-reflection';
                                                                      
const compile=(patch:Omit<GardenPatch,'fog'>,fog=createFogUniforms())=>{const m=new MeshStandardMaterial();patchGardenMaterial(m,{fog,...patch});
 const shader={uniforms:{} as Record<string,unknown>,vertexShader:ShaderLib.physical.vertexShader,fragmentShader:ShaderLib.physical.fragmentShader} as any;m.onBeforeCompile(shader,undefined as any);return {shader,key:m.customProgramCacheKey()};};
const pond={centre:[POND.x,POND.z] as [number,number],radius:[POND.radiusX,POND.radiusZ] as [number,number]};
describe('directional fog',()=>{
 it('warms toward the sun, cools away from it without getting darker, per mood',()=>{
  const fog=createFogUniforms();setFogMood(fog,'sunset',[-35,12,18]);
  expect(fog.gardenSunDir.value.toArray().map(v=>+v.toFixed(5))).toEqual(new Vector3(-35,12,18).normalize().toArray().map(v=>+v.toFixed(5)));
  expect(fog.gardenGlowShare.value).toBe(FOG_LOOK.sunset.share);const glow=new Color(FOG_LOOK.sunset.glow);expect(fog.gardenSunGlow.value.r).toBeCloseTo(glow.r,6);
  for(const mood of ['day','sunset','evening'] as const){const [r,g,b]=FOG_LOOK[mood].back;const lum=.299*r+.587*g+.114*b;expect(lum).toBeGreaterThan(.97);expect(b).toBeGreaterThan(r);}
  expect(FOG_LOOK.sunset.share).toBeGreaterThan(FOG_LOOK.day.share);expect(FOG_LOOK.evening.share).toBeLessThan(FOG_LOOK.day.share);
  expect(fogSunward([1,0,0],[1,0,0])).toBeCloseTo(1,6);expect(fogSunward([-1,0,0],[1,0,0])).toBe(0);expect(fogSunward([1,1,0],[1,0,0])).toBeCloseTo(Math.SQRT1_2**3,6);
 });
 it('every garden material uses it, inside three\'s real fog chunk, with no time uniform',()=>{
  for(const patch of [{},{canopy:true},{wrap:true},{pond}] as Omit<GardenPatch,'fog'>[]){const f=compile(patch).shader.fragmentShader as string;
   expect(f).toContain('uniform vec3 gardenSunDir;');expect(f).toContain('gl_FragColor.rgb=mix(gl_FragColor.rgb,gardenFogColor,');expect(f).toContain('mix(fogColor*mix(gardenFogBack,vec3(1.0),sunward),gardenSunGlow,sunward*gardenGlowShare)');
   expect(f).not.toContain('#include <fog_fragment>');expect(f).not.toContain('uTime');}
 });
});
describe('rock-top moss',()=>{
 it('only on up-facing faces, outside the sandtray focus',()=>{
  expect(mossShare(.2)).toBe(0);expect(mossShare(-1)).toBe(0);expect(mossShare(1)).toBeCloseTo(MOSS.share,6);expect(mossShare(.5)).toBeGreaterThan(0);expect(mossShare(.5)).toBeLessThan(MOSS.share);
  expect(focusFade(0,0)).toBe(0);expect(focusFade(TRAY_FOCUS.halfX+1,0)).toBeGreaterThan(0);expect(focusFade(TRAY_FOCUS.halfX+3,0)).toBe(1);expect(focusFade(0,TRAY_FOCUS.maxZ+3)).toBe(1);
  for(let x=-40;x<=40;x+=.5)for(let z=-30;z<=40;z+=.5)if(inTrayFocus(x,z))expect(focusFade(x,z)).toBe(0);
 });
 it('patches Granite only (moss option), with the linear moss colour and the focus fade',()=>{
  const {shader,key}=compile({wrap:true,moss:true});const f=shader.fragmentShader as string;expect(key).toContain('-moss');
  expect(f).toContain('float mossTop=smoothstep(0.35,0.70,mossN.y)');expect(f).toContain(glslVec3(linearRgb(MOSS.colour)));expect(f).toContain('gardenFocusFade(vGardenWorld.xz)');
  expect(f).toContain(`max(abs(p.x)-${TRAY_FOCUS.halfX.toFixed(1)}`);expect(f).toContain('return smoothstep(0.0,3.0,d);}');
  expect(compile({wrap:true}).shader.fragmentShader).not.toContain('mossTop');
 });
});
describe('wet bank',()=>{
 it('wet at the bank, dry 2 m out',()=>{expect(shoreWet(1)).toBe(1);expect(shoreWet(SHORE.dryFrom)).toBe(0);expect(shoreWet(1.12)).toBeGreaterThan(0);expect(shoreWet(1.12)).toBeLessThan(1);expect(SHORE.darken).toBeLessThan(1);expect(SHORE.roughness).toBeLessThan(.5);});
 it('darkens and smooths the floor before lighting, outside the focus; not on materials without the option',()=>{
  const f=compile({shore:pond}).shader.fragmentShader as string;const at=f.indexOf('float shoreWet'),lights=f.indexOf('#include <lights_physical_fragment>');
  expect(at).toBeGreaterThan(0);expect(at).toBeLessThan(lights);expect(f).toContain(`roughnessFactor=mix(roughnessFactor,${SHORE.roughness.toFixed(2)},shoreWet)`);expect(f).toContain('*gardenFocusFade(vGardenWorld.xz)');
  expect(compile({}).shader.fragmentShader).not.toContain('shoreWet');
 });
 it('part of the bank lies in the sandtray focus, so the fade matters there',()=>{
  let inFocus=0;for(let a=0;a<360;a+=2){const x=POND.x+Math.cos(a*Math.PI/180)*POND.radiusX*1.1,z=POND.z+Math.sin(a*Math.PI/180)*POND.radiusZ*1.1;if(inTrayFocus(x,z))inFocus++;}
  expect(inFocus).toBeGreaterThan(0);
 });
});
describe('pond water',()=>{
 it('surface: static detail ripples, grazing sky reflection, deep absorption with teal scatter',()=>{
  const fog=createFogUniforms();setFogMood(fog,'evening',[-25,4,-25]);expect(fog.gardenHorizon.value.r).toBeCloseTo(new Color(WATER.horizon.evening).r,6);
  const f=compile({pond},fog).shader.fragmentShader as string;
  expect(f).toContain('uniform vec3 gardenHorizon;');expect(f).toContain('float pondFresnel=pow(');expect(f).toContain(glslVec3(linearRgb(WATER.scatter)));expect(f).toContain('normal=normalize(normal+(viewMatrix*vec4(-pondSlope.x');expect(f).toContain('float pondNear=1.0-smoothstep(15.0,40.0,');
  expect(f).not.toContain('uTime');expect(compile({}).shader.fragmentShader).not.toContain('pondFresnel');
  expect(WATER.absorb).toBeLessThan(1);
 });
 it('the mirror gets the same deep absorption and teal',()=>{
  const owned=createGardenReflection(null,256);const f=(owned.object.material as any).fragmentShader as string;owned.dispose();
  expect(f).toContain('float pondDeep=1.0-smoothstep(0.55,0.95,pondR);pondColor=pondColor*mix(1.0,');expect(f).toContain(glslVec3(linearRgb(WATER.scatter)));
 });
});
describe('which garden materials get W1',()=>{
 it('moss on Granite only; the wet bank on floor, rocks and gravel; the deck (Oiled_Timber, guardrail 1) gets neither',()=>{
  const source=new Group();for(const name of ['Granite','Forest_Floor','Garden_Gravel','Oiled_Timber','Lime_Plaster','Pond_Water']){const m=new MeshStandardMaterial();m.name=name;source.add(new Mesh(new BoxGeometry(),m));}
  const owned=gardenSurfaces(source,{fog:createFogUniforms(),ground:createGroundUniforms()});const fragments:Record<string,string>={};
  owned.root.traverse(o=>{if(o instanceof Mesh){const m=o.material as MeshStandardMaterial;const shader={uniforms:{},vertexShader:ShaderLib.physical.vertexShader,fragmentShader:ShaderLib.physical.fragmentShader} as any;m.onBeforeCompile(shader,undefined as any);fragments[m.name]=shader.fragmentShader;}});
  owned.dispose();
  expect(fragments.Granite).toContain('mossTop');for(const name of ['Forest_Floor','Garden_Gravel','Oiled_Timber','Lime_Plaster','Pond_Water'])expect(fragments[name],name).not.toContain('mossTop');
  for(const name of ['Granite','Forest_Floor','Garden_Gravel'])expect(fragments[name],name).toContain('shoreWet');for(const name of ['Oiled_Timber','Lime_Plaster','Pond_Water'])expect(fragments[name],name).not.toContain('shoreWet');
  expect(fragments.Pond_Water).toContain('pondFresnel');expect(fragments.Oiled_Timber).toContain('gardenFogColor');
 });
});
