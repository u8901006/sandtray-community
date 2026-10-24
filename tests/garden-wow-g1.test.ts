import {describe,expect,it} from 'vitest';
import {MeshStandardMaterial,ShaderLib} from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
import {patchGardenMaterial,createFogUniforms,createGroundUniforms,canopyTint,slopeRock,CANOPY,FLOOR_LOOK} from '../apps/web/src/garden-shaders';
import {patchGardenSky,SKY_LOOK,MOON_DIRECTION} from '../apps/web/src/garden-sky';
import {LEAF_MATERIAL,plantMaterialPatch} from '../apps/web/src/garden-vegetation';
                                                                            
const compile=(m:MeshStandardMaterial)=>{const shader={uniforms:{} as Record<string,unknown>,vertexShader:ShaderLib.physical.vertexShader,fragmentShader:ShaderLib.physical.fragmentShader} as any;m.onBeforeCompile(shader,undefined as any);return shader;};
describe('canopy, cabins and rocks',()=>{
 it('canopy is deep teal low and warm green high',()=>{
  expect(canopyTint(-5)).toEqual([...CANOPY.low]);expect(canopyTint(50)).toEqual([...CANOPY.high]);
  const mid=canopyTint((CANOPY.from+CANOPY.to)/2);expect(mid[0]).toBeGreaterThan(CANOPY.low[0]);expect(mid[0]).toBeLessThan(CANOPY.high[0]);
 });
 it('patches the real shader: canopy tint and half-Lambert fill, each with its own program key; nothing extra otherwise',()=>{
  const fog=createFogUniforms();
  const leaf=new MeshStandardMaterial();patchGardenMaterial(leaf,{fog,foliage:{uWindTime:{value:0},uWindAmp:{value:0}},canopy:true});const leafShader=compile(leaf);
  expect(leaf.customProgramCacheKey()).toBe('garden-v4-none-foliage-canopy');expect(leafShader.fragmentShader).toContain('float canopyT=smoothstep(');
  const cabin=new MeshStandardMaterial();patchGardenMaterial(cabin,{fog,wrap:true});const cabinShader=compile(cabin);
  expect(cabin.customProgramCacheKey()).toBe('garden-v4-none-wrap');expect(cabinShader.fragmentShader).toContain('float wrapNl=dot(normal,wrapLight.direction);');expect(cabinShader.fragmentShader).not.toContain('canopyT');
  const plain=new MeshStandardMaterial();patchGardenMaterial(plain,{fog});const plainShader=compile(plain);
  for(const tag of ['canopyT','wrapNl','floorRock','dappleBand'])expect(plainShader.fragmentShader).not.toContain(tag);
 });
});
describe('bark sways but does not glow',()=>{
 it('leaf, grass and flower materials are translucent; bark and mushrooms only take the wind',()=>{
  for(const name of ['Leaves','Leaves_NormalTree','Leaves_TwistedTree','Grass','Flowers'])expect(LEAF_MATERIAL.test(name),name).toBe(true);
  for(const name of ['Bark_NormalTree','Mushrooms','Granite'])expect(LEAF_MATERIAL.test(name),name).toBe(false);
  const wind={uWindTime:{value:0},uWindAmp:{value:.015}};
  const bark=new MeshStandardMaterial();patchGardenMaterial(bark,{fog:createFogUniforms(),foliage:wind,translucent:false});const b=compile(bark);
  expect(bark.customProgramCacheKey()).toBe('garden-v4-none-wind');expect(b.vertexShader).toContain('uWindTime');expect(b.fragmentShader).not.toContain('leafBack');
  const leaf=new MeshStandardMaterial();patchGardenMaterial(leaf,{fog:createFogUniforms(),foliage:wind});expect(compile(leaf).fragmentShader).toContain('leafBack');
  const planted={fog:createFogUniforms(),ground:createGroundUniforms(),plantWind:wind};
  expect(plantMaterialPatch('Bark_NormalTree',planted)).toMatchObject({foliage:wind,translucent:false});expect(plantMaterialPatch('Leaves_NormalTree',planted)).toMatchObject({foliage:wind,translucent:true});
 });
});
describe('forest floor',()=>{
 it('rock shows on steep ground only',()=>{
  expect(slopeRock(1)).toBe(0);expect(slopeRock(FLOOR_LOOK.slopeTo)).toBe(0);expect(slopeRock(.5)).toBeCloseTo(FLOOR_LOOK.rockMix,5);
  expect(slopeRock(.7)).toBeGreaterThan(0);expect(slopeRock(.7)).toBeLessThan(FLOOR_LOOK.rockMix);
 });
 it('floor mode adds slope rock after the normal is known and dapples the direct light under the canopy edge',()=>{
  const floor=new MeshStandardMaterial();patchGardenMaterial(floor,{fog:createFogUniforms(),ground:createGroundUniforms(),groundMode:'floor'});const f=compile(floor).fragmentShader;
  expect(f.indexOf('float floorRock=')).toBeGreaterThan(f.indexOf('#include <normal_fragment_maps>'));
  expect(f.indexOf('float floorRock=')).toBeLessThan(f.indexOf('#include <lights_fragment_begin>'));
                                                                                                                    
  expect(f).toContain('reflectedLight.directDiffuse*=mix(1.0,0.40+1.10*dappleSpot,dappleBand);');
  const occlude=new MeshStandardMaterial();patchGardenMaterial(occlude,{fog:createFogUniforms(),ground:createGroundUniforms(),groundMode:'occlude'});
  expect(compile(occlude).fragmentShader).not.toContain('dappleBand');
 });
});
describe('sky',()=>{
 it("injects gold lining inside the cloud block and stars + moon before the final colour, into three's real Sky shader",()=>{
  const sky=new Sky();const shader={uniforms:{} as Record<string,unknown>,fragmentShader:sky.material.fragmentShader};
  const looks={gold:{value:1},night:{value:0}};patchGardenSky(shader as any,looks);
  expect(shader.fragmentShader).toContain('uniform float uGoldLining;');
  expect(shader.fragmentShader.indexOf('uGoldLining*vSunE')).toBeGreaterThan(shader.fragmentShader.indexOf('texColor = mix( texColor, cloudColor, cloudMask * cloudDensity );'));
  expect(shader.fragmentShader.indexOf('if(uNight>0.0&&direction.y>0.0)')).toBeLessThan(shader.fragmentShader.indexOf('gl_FragColor = vec4( texColor, 1.0 );'));
  expect(shader.uniforms.uNight).toBe(looks.night);sky.geometry.dispose();sky.material.dispose();
 });
 it('night only in the evening, gold strongest at sunset, moon above the horizon',()=>{
  expect(SKY_LOOK.evening.night).toBe(1);expect(SKY_LOOK.day.night).toBe(0);expect(SKY_LOOK.sunset.night).toBe(0);
  expect(SKY_LOOK.sunset.gold).toBeGreaterThan(SKY_LOOK.day.gold);expect(MOON_DIRECTION[1]).toBeGreaterThan(.1);                                                                                   
  expect(Math.hypot(...MOON_DIRECTION)).toBeCloseTo(1,6);
 });
});
