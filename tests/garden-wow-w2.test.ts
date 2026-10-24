import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {BoxGeometry,Group,Mesh,MeshStandardMaterial,ShaderLib,Vector3} from 'three';
import {beamSpots,BEAM,BEAM_SUNS,BEAM_SIDE_FADE,GardenSunbeams,pollenPosition,POLLEN,FIREFLY_SIZE,FIREFLY_COUNT,fireflyPosition,pollenBounds,fireflyBounds,pollenBoxes,fireflyBoxes,cloudSphere} from '../apps/web/src/garden-extras';
import {Box3,Frustum,Matrix4,PerspectiveCamera} from 'three';
import {patchGardenMaterial,createFogUniforms,createGroundUniforms,AUTUMN,FLOWER_GLOW,FLOOR_LOOK,autumnField,autumnShare,autumnHue,focusFade,linearRgb,glslVec3,type GardenPatch} from '../apps/web/src/garden-shaders';
import {plantMaterialPatch,litterSpot,leafGeometry,LITTER,autumnLeaves} from '../apps/web/src/garden-vegetation';
import {gardenSurfaces} from '../apps/web/src/garden-surfaces';
import {MOON_DIRECTION} from '../apps/web/src/garden-sky';
import {inTrayFocus,builtGround,gardenFloor} from '../apps/web/src/garden-layout';
                                                                             
const compileMaterial=(m:MeshStandardMaterial)=>{const shader={uniforms:{} as Record<string,unknown>,vertexShader:ShaderLib.physical.vertexShader,fragmentShader:ShaderLib.physical.fragmentShader} as any;m.onBeforeCompile(shader,undefined as any);return shader;};
const compile=(patch:Omit<GardenPatch,'fog'>)=>{const m=new MeshStandardMaterial();patchGardenMaterial(m,{fog:createFogUniforms(),...patch});return {shader:compileMaterial(m),key:m.customProgramCacheKey()};};
describe('light shafts',()=>{
 it('noise instead of sine stripes, and each plane fades as it turns side-on',()=>{
                                                                                                                      
  expect(GardenSunbeams.toString()).toContain('BEAM_FRAGMENT');const text=readFileSync(new URL('../apps/web/src/garden-extras.tsx',import.meta.url),'utf8');
  expect(text).not.toContain('sin(vBeamUv.x*23.0');expect(text).toContain('float streak=0.55+0.45*(beamNoise(');
  expect(text).toContain('abs(dot(normalize(cameraPosition-vBeamWorld),vBeamNormal))');expect(text).toContain('*near*side,1.0)');
  expect(BEAM_SIDE_FADE[0]).toBeLessThan(BEAM_SIDE_FADE[1]);expect(BEAM_SIDE_FADE[1]).toBeLessThanOrEqual(Math.SQRT1_2);                                               
 });
});
describe('pollen',()=>{
 it('rides in the shafts or hangs in the gap at their foot, never over the sandtray focus, and drifts with time',()=>{
  const spots=beamSpots();expect(spots.length).toBeGreaterThan(0);
  for(const sun of BEAM_SUNS)for(let i=0;i<POLLEN.count.cinema;i++)for(const t of [0,7,90,600]){
   const [x,y,z]=pollenPosition(i,t,spots,sun);expect(inTrayFocus(x,z),`${i} ${t}`).toBe(false);expect(y).toBeGreaterThan(0);
   const spot=spots[i%spots.length];expect(Math.hypot(x-spot.x,z-spot.z)).toBeLessThan(BEAM.length);
   if(i%2===1){expect(Math.hypot(x-spot.x,z-spot.z)).toBeLessThanOrEqual(POLLEN.gap+POLLEN.drift*1.5);expect(y).toBeLessThan(2.5+POLLEN.drift);}}
  expect(pollenPosition(3,1,spots,BEAM_SUNS[0])).not.toEqual(pollenPosition(3,2,spots,BEAM_SUNS[0]));
  expect(POLLEN.count.low).toBeLessThan(POLLEN.count.high);expect(POLLEN.count.high).toBeLessThan(POLLEN.count.cinema);
 });
});
describe('autumn groves',()=>{
 it('about a tenth of the garden, whole groves, none in the sandtray focus',()=>{
  let n=0,a=0;for(let x=-60;x<=60;x+=1)for(let z=-60;z<=60;z+=1){n++;if(autumnShare(x,z)>.5)a++;if(inTrayFocus(x,z))expect(autumnShare(x,z)).toBe(0);}
  expect(a/n).toBeGreaterThan(.05);expect(a/n).toBeLessThan(.15);
  let amber=0,red=0;for(let x=-60;x<=60;x+=3)for(let z=-60;z<=60;z+=3){const h=autumnHue(x,z);expect(h).toBeGreaterThanOrEqual(0);expect(h).toBeLessThanOrEqual(1);if(h<.2)amber++;if(h>.8)red++;}
  expect(amber).toBeGreaterThan(0);expect(red).toBeGreaterThan(0);                   
 });
 it('the shader evaluates the same field as the JS twin, after three\'s colour step, with the focus fade',()=>{
  const f=compile({canopy:true,autumn:true}).shader.fragmentShader as string;
  expect(f).toContain('float autumnF=(sin(autumnP.x*0.13+1.7)*sin(autumnP.y*0.11+0.4)+sin((autumnP.x-autumnP.y)*0.07+2.1))*0.5;');
  expect(f).toContain(`smoothstep(${AUTUMN.from.toFixed(2)},${AUTUMN.to.toFixed(2)},autumnF)*gardenFocusFade(autumnP)`);
  expect(f).toContain(glslVec3(linearRgb(AUTUMN.amber)));expect(f).toContain(glslVec3(linearRgb(AUTUMN.red)));
  expect(f.indexOf('#include <color_fragment>')).toBeLessThan(f.indexOf('float autumnF'));
  expect(compile({canopy:true}).shader.fragmentShader).not.toContain('autumnF');expect(compile({canopy:true,autumn:true}).key).toContain('-autumn');
                               
  const x=12.3,z=-45.6;expect(autumnField(x,z)).toBeCloseTo((Math.sin(x*.13+1.7)*Math.sin(z*.11+.4)+Math.sin((x-z)*.07+2.1))*.5,12);
  expect(focusFade(0,0)*autumnShare(0,0)).toBe(0);
 });
 it('goes to the GLB canopy and to planted tree leaves, not to bark or other materials',()=>{
  const source=new Group();for(const name of ['Foliage_0','Foliage_3','Granite','Oiled_Timber','Forest_Floor']){const m=new MeshStandardMaterial();m.name=name;source.add(new Mesh(new BoxGeometry(),m));}
  const owned=gardenSurfaces(source,{fog:createFogUniforms(),ground:createGroundUniforms()});const fragments:Record<string,string>={};
  owned.root.traverse(o=>{if(o instanceof Mesh){const m=o.material as MeshStandardMaterial;fragments[m.name]=compileMaterial(m).fragmentShader;}});owned.dispose();
  expect(fragments.Foliage_0).toContain('autumnF');expect(fragments.Foliage_3).toContain('autumnF');for(const name of ['Granite','Oiled_Timber','Forest_Floor'])expect(fragments[name],name).not.toContain('autumnF');
  const patch={fog:createFogUniforms(),ground:createGroundUniforms()};
  expect(plantMaterialPatch('Leaves_NormalTree',patch,true).autumn).toBe(true);expect(plantMaterialPatch('Bark_NormalTree',patch,false).autumn).toBe(false);
  expect(autumnLeaves('tree','Leaves_NormalTree')).toBe(true);expect(autumnLeaves('tree','Bark_NormalTree')).toBe(false);expect(autumnLeaves('bush','Leaves_Bush')).toBe(false);
 });
});
describe('leaf litter',()=>{
 it('only in autumn groves, under canopy, off built ground and outside the sandtray focus',()=>{
  let found=0;
  for(let x=-58;x<=58;x+=.75)for(let z=-58;z<=58;z+=.75){
   if(!litterSpot(x,z,.2))continue;found++;expect(inTrayFocus(x,z)).toBe(false);expect(builtGround(x,z)).toBe(false);expect(autumnShare(x,z)).toBeGreaterThan(.4);
   expect(litterSpot(x,z,.9)).toBe(false);                      
  }
                                                                                                                                
  for(const [x,z] of [[-23,10],[0,0],[21,-16],[-30,10]])expect(litterSpot(x,z,.2,1),`${x},${z}`).toBe(false);expect(litterSpot(-45,-40,.2,1)).toBe(true);
  expect(found).toBeGreaterThan(100);expect(LITTER.count.low).toBeLessThan(LITTER.count.cinema);
 });
 it('one leaf is a flat diamond facing up',()=>{const g=leafGeometry(),p=g.getAttribute('position'),nrm=g.getAttribute('normal');expect(p.count).toBe(4);for(let i=0;i<4;i++){expect(p.getY(i)).toBe(0);expect(nrm.getY(i)).toBe(1);}g.dispose();});
});
describe('gaps from G1 and G2',()=>{
 it('the moon sits inside the level 漫步庭園 view (fov 42, looking toward -z) and away from the evening sun',()=>{
  const m=new Vector3(...MOON_DIRECTION);const elevation=Math.asin(m.y)*180/Math.PI,heading=Math.atan2(-m.x,-m.z)*180/Math.PI;
  expect(elevation).toBeGreaterThan(8);expect(elevation).toBeLessThan(21-3);expect(Math.abs(heading)).toBeLessThan(28);
  const eveningSun=new Vector3(-25,4,-25).normalize();expect(Math.acos(m.dot(eveningSun))*180/Math.PI).toBeGreaterThan(20);
 });
 it('evening wildflowers glow with their own colour; nothing by day',()=>{
  expect(FLOWER_GLOW.day).toBe(0);expect(FLOWER_GLOW.evening).toBeGreaterThan(FLOWER_GLOW.sunset);expect(FLOWER_GLOW.sunset).toBeGreaterThan(0);
  const glow={value:FLOWER_GLOW.evening};const m=new MeshStandardMaterial();patchGardenMaterial(m,{fog:createFogUniforms(),glow});const shader=compileMaterial(m);
  expect(shader.fragmentShader).toContain('totalEmissiveRadiance+=diffuseColor.rgb*gardenGlow;');expect(shader.uniforms.gardenGlow).toBe(glow);expect(m.customProgramCacheKey()).toContain('-glow');
  expect(compile({}).shader.fragmentShader).not.toContain('uniform float gardenGlow;');
 });
 it('stronger dapple and bigger fireflies',()=>{
                                           
  expect(FLOOR_LOOK.dappleShade).toBeLessThan(.55);expect(FLOOR_LOOK.dappleSun).toBeGreaterThan(1.45);
  expect(FIREFLY_SIZE).toBeGreaterThan(.3);
 });
});
                                                                 
describe('drifting clouds are never culled while a mote is in view',()=>{
 const spots=beamSpots(),times=Array.from({length:2400},(_,k)=>k*.731);                                
 it('every pollen mote, both suns, every tier, stays inside the cloud bounding sphere',()=>{
  const outside:string[]=[];
  for(const sun of BEAM_SUNS)for(const tier of ['low','high','cinema'] as const){
   const count=POLLEN.count[tier],sphere=pollenBounds(spots,sun,count),boxes=pollenBoxes(spots,sun,count);
   for(const t of times)for(let i=0;i<count;i++){const [x,y,z]=pollenPosition(i,t,spots,sun),spot=spots[i%spots.length];
    const p=new Vector3(x,gardenFloor(spot.x,spot.z)+y,z);
                                                                                                           
    if(!boxes[i].containsPoint(p)||sphere.distanceToPoint(p)>-POLLEN.size/2+1e-9)outside.push(`${tier} ${i} t=${t}`);}
  }
  expect(outside).toEqual([]);
 });
 it('every firefly stays inside its cloud bounding sphere',()=>{
  const sphere=fireflyBounds(),boxes=fireflyBoxes(),outside:string[]=[];
  for(const t of times)for(let i=0;i<FIREFLY_COUNT;i++){const [x,y,z]=fireflyPosition(i,t),p=new Vector3(x,gardenFloor(x,z)+y,z);
   if(!boxes[i].containsPoint(p)||sphere.distanceToPoint(p)>-FIREFLY_SIZE/2+1e-9)outside.push(`${i} t=${t}`);}
  expect(outside).toEqual([]);
 });
 it('GPT counterexample: day sun, low tier, t=115, a mote in view keeps the cloud drawn',()=>{
  const sun=BEAM_SUNS[0],count=POLLEN.count.low,sphere=pollenBounds(spots,sun,count);
  const camera=new PerspectiveCamera(42,1.6,.1,1000);camera.position.set(-42.3035901603366,0,-25.56704629835054);
  camera.position.y=gardenFloor(camera.position.x,camera.position.z)+1.65;camera.rotation.set(-0.25098417327319084,-0.07920367320510197,0,'YXZ');camera.updateMatrixWorld();
  const frustum=new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  const [x,y,z]=pollenPosition(77,115,spots,sun),spot=spots[77%spots.length];
  expect(frustum.containsPoint(new Vector3(x,gardenFloor(spot.x,spot.z)+y,z))).toBe(true);expect(frustum.intersectsSphere(sphere)).toBe(true);
 });
 it('the sphere holds every box corner plus half a sprite',()=>{
  const corners=(b:Box3)=>[0,1,2,3,4,5,6,7].map(k=>new Vector3(k&1?b.max.x:b.min.x,k&2?b.max.y:b.min.y,k&4?b.max.z:b.min.z));
  const boxes=[new Box3(new Vector3(0,0,0),new Vector3(1,2,3)),new Box3(new Vector3(-5,1,1),new Vector3(-4,1.5,2))],s=cloudSphere(boxes,.4);
  for(const b of boxes)for(const c of corners(b))expect(s.distanceToPoint(c)).toBeLessThanOrEqual(-.2+1e-9);
 });
 it('the components use these bounds, not a one-off computeBoundingSphere',()=>{
  const text=readFileSync(new URL('../apps/web/src/garden-extras.tsx',import.meta.url),'utf8');
  expect(text).toContain('g.boundingSphere=fireflyBounds()');expect(text).toContain('g.boundingSphere=count?pollenBounds(spots,sun,count)');
  expect(text).not.toContain('computeBoundingSphere()');
 });
});
