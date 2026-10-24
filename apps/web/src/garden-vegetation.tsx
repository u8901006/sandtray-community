import {useEffect,useMemo,useRef,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {BufferGeometry,Color,Float32BufferAttribute,Group,InstancedMesh,Matrix4,Mesh,MeshStandardMaterial,Quaternion,Vector3,type Material} from 'three';
import {assetById} from '../../../packages/asset-catalog/src/index';
import {acquireAsset} from './asset-pool';
import {gardenPlanting,plantedTrunks,inTrayFocus,builtGround,noise,type GardenTier,type PlantKind,type PlantedTrunk} from './garden-layout';
import {patchGardenMaterial,FOLIAGE,FLOWER_GLOW,autumnShare,type FoliageUniforms,type GardenFogUniforms,type GardenGroundUniforms,type GardenPatch} from './garden-shaders';
import type {GardenGround} from './garden-ground';
                                                                                                                                  
                                                                                                                                                                                                                         
                                                                                                                   
export const GRASS_BUDGET:Record<GardenTier,{clumps:number;radius:number}>={low:{clumps:3000,radius:30},high:{clumps:8000,radius:44},cinema:{clumps:16000,radius:58}};
const TILE=20;
function rng(seed:number){let s=seed>>>0;return()=>{s=(s+0x6d2b79f5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
                                                                                                                            
export function grassClumpGeometry(){
 const random=rng(7),position:number[]=[],color:number[]=[],normal:number[]=[],index:number[]=[];
 const base=[.045,.085,.018],tip=[.15,.22,.042];
 for(let b=0;b<9;b++){
  const a=random()*Math.PI*2,r=random()*.16,h=.2+random()*.18,w=.05+random()*.025,bend=(random()-.3)*.12,yaw=random()*Math.PI;
  const ox=Math.cos(a)*r,oz=Math.sin(a)*r,dx=Math.cos(yaw),dz=Math.sin(yaw),start=position.length/3;
  [[0,1],[.4,.78],[.75,.45],[1,0]].forEach(([t,k],row)=>{
   const y=t*h,lean=bend*t*t,cx=ox+Math.sin(yaw)*lean,cz=oz-Math.cos(yaw)*lean,half=w*k/2;
   const shade=base.map((v,i)=>v+(tip[i]-v)*t);
   if(row<3){position.push(cx-dx*half,y,cz-dz*half,cx+dx*half,y,cz+dz*half);color.push(...shade,...shade);normal.push(0,1,0,0,1,0);}
   else {position.push(cx,y,cz);color.push(...shade);normal.push(0,1,0);}
  });
                                                                                                               
  for(let row=0;row<2;row++){const i=start+row*2;index.push(i,i+1,i+3,i,i+3,i+2,i+3,i+1,i,i+2,i+3,i);}
  index.push(start+4,start+5,start+6,start+6,start+5,start+4);
 }
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(position,3));geometry.setAttribute('color',new Float32BufferAttribute(color,3));geometry.setAttribute('normal',new Float32BufferAttribute(normal,3));geometry.setIndex(index);geometry.computeBoundingSphere();return geometry;
}
type Built={group:Group;dispose():void};
                                                                                      
                                                    
export const LEAF_MATERIAL=/^(Leaves|Grass|Flowers)/;
type VegetationPatch={fog:GardenFogUniforms;ground:GardenGroundUniforms;grassWind?:FoliageUniforms;plantWind?:FoliageUniforms;flowerGlow?:{value:number}};
                                                                                                                                           
                                                                                                 
export function plantMaterialPatch(name:string,patch:VegetationPatch,autumnLeaves=false):GardenPatch{return {fog:patch.fog,ground:patch.ground,groundMode:'occlude',foliage:patch.plantWind,translucent:LEAF_MATERIAL.test(name),autumn:autumnLeaves};}
                                                                                    
                                
export const LITTER={count:{low:600,high:1500,cinema:3000} as Record<GardenTier,number>,radius:{low:30,high:44,cinema:58} as Record<GardenTier,number>,colours:[[.78,.42,.1],[.72,.24,.1],[.45,.28,.14],[.85,.6,.18]] as const};
                                                                                                                               
                                                                                                 
export function litterSpot(x:number,z:number,occlusion:number,share=autumnShare(x,z)){return share>.4&&occlusion<.75&&!builtGround(x,z)&&!inTrayFocus(x,z);}
                                                                                                                   
export const autumnLeaves=(kind:PlantKind,materialName:string)=>kind==='tree'&&/^Leaves/.test(materialName);
                                                                            
export function leafGeometry(){
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute([-.07,0,0,0,0,-.04,.07,0,0,0,0,.04],3));geometry.setAttribute('normal',new Float32BufferAttribute([0,1,0,0,1,0,0,1,0,0,1,0],3));
 geometry.setIndex([0,1,2,0,2,3,2,1,0,3,2,0]);geometry.computeBoundingSphere();return geometry;
}
function buildLitter(ground:GardenGround,tier:GardenTier,patch:VegetationPatch):Built{
 const target=LITTER.count[tier],radius=LITTER.radius[tier],random=rng(5151),m=new Matrix4(),q=new Quaternion(),e=new Vector3(),p=new Vector3(),s=new Vector3(),matrices:Matrix4[]=[],colours:Color[]=[];
 for(let attempt=0;attempt<target*40&&matrices.length<target;attempt++){
  const a=random()*Math.PI*2,r=Math.sqrt(random())*radius,x=Math.cos(a)*r,z=Math.sin(a)*r;if(!litterSpot(x,z,ground.occlusionAt(x,z)))continue;
  q.setFromAxisAngle(e.set(0,1,0),random()*Math.PI*2);p.set(x,ground.heightAt(x,z)+.012,z);s.setScalar(.8+random()*.6);matrices.push(m.compose(p,q,s).clone());
  const c=LITTER.colours[Math.floor(random()*LITTER.colours.length)];colours.push(new Color(c[0],c[1],c[2]));}
 const geometry=leafGeometry(),material=new MeshStandardMaterial({roughness:.85,metalness:0});material.name='Garden_Leaf_Litter';
 patchGardenMaterial(material,{fog:patch.fog,ground:patch.ground,groundMode:'occlude'});
 const group=new Group();group.name='Garden_leaf_litter';const mesh=new InstancedMesh(geometry,material,Math.max(1,matrices.length));mesh.count=matrices.length;
 matrices.forEach((matrix,i)=>{mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,colours[i]);});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();mesh.receiveShadow=true;group.add(mesh);
 group.userData.leaves=matrices.length;
 return {group,dispose(){mesh.dispose();geometry.dispose();material.dispose();}};
}
function buildGrass(ground:GardenGround,tier:GardenTier,patch:VegetationPatch):Built{
 const {clumps,radius}=GRASS_BUDGET[tier],random=rng(4242),tiles=new Map<string,Matrix4[]>(),colors=new Map<string,Color[]>();
 const m=new Matrix4(),q=new Quaternion(),s=new Vector3(),p=new Vector3(),axis=new Vector3(0,1,0);let placed=0;
 for(let attempt=0;attempt<clumps*8&&placed<clumps;attempt++){
  const a=random()*Math.PI*2,r=Math.sqrt(random())*radius,x=Math.cos(a)*r,z=Math.sin(a)*r,g=ground.grassAt(x,z);
  if(random()>=g)continue;
  q.setFromAxisAngle(axis,random()*Math.PI*2);const k=.7+random()*.6*g;s.set(k,k*(.8+random()*.5),k);p.set(x,ground.heightAt(x,z)-.02,z);m.compose(p,q,s);
  const key=Math.floor(x/TILE)+':'+Math.floor(z/TILE);if(!tiles.has(key)){tiles.set(key,[]);colors.set(key,[]);}
  tiles.get(key)!.push(m.clone());const dry=random()<.18?.35:0,v=.8+random()*.4;colors.get(key)!.push(new Color(v*(1+dry*.9),v*(1+dry*.35),v*(1-dry*.3)));placed++;
 }
 const geometry=grassClumpGeometry(),material=new MeshStandardMaterial({vertexColors:true,roughness:.92,metalness:0});material.name='Garden_Grass_Blades';
 patchGardenMaterial(material,{fog:patch.fog,ground:patch.ground,groundMode:'occlude',foliage:patch.grassWind});
 const group=new Group();group.name='Garden_grass';const meshes:InstancedMesh[]=[];
 for(const [key,list] of tiles){const mesh=new InstancedMesh(geometry,material,list.length);list.forEach((matrix,i)=>{mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,colors.get(key)![i]);});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.receiveShadow=true;mesh.name='Garden_grass_'+key;group.add(mesh);meshes.push(mesh);}
 group.userData.clumps=placed;
 return {group,dispose(){for(const mesh of meshes)mesh.dispose();geometry.dispose();material.dispose();}};
}
                                                                        
                                                          
export const FLOWER_SHARE=.12;
export const FLOWER_COLOURS=[[1,.97,.9],[1,.82,.3],[.78,.68,1],[1,.6,.3]] as const;
                                                                                                                                         
export function flowerSpot(grass:number,x:number,z:number){return grass>.3&&noise(x*.15,z*.15,7)>.55&&!inTrayFocus(x,z);}
                                                                                                                                             
export function flowerClumpGeometry(){
 const random=rng(11),position:number[]=[],color:number[]=[],normal:number[]=[],index:number[]=[];
 for(let k=0;k<4;k++){
  const a=random()*Math.PI*2,r=random()*.12,x=Math.cos(a)*r,z=Math.sin(a)*r,h=.16+random()*.12,head=.045+random()*.02,start=position.length/3;
  position.push(x-.006,0,z,x+.006,0,z,x,h,z);color.push(.12,.3,.08,.12,.3,.08,.2,.42,.1);normal.push(0,1,0,0,1,0,0,1,0);index.push(start,start+1,start+2,start+2,start+1,start);
  for(const [dx,dz] of [[1,0],[0,1]] as const){const b=position.length/3;
   position.push(x-dx*head,h-head*.5,z-dz*head,x+dx*head,h-head*.5,z+dz*head,x+dx*head,h+head*.5,z+dz*head,x-dx*head,h+head*.5,z-dz*head);
   for(let v=0;v<4;v++){color.push(1,1,1);normal.push(0,1,0);}index.push(b,b+1,b+2,b,b+2,b+3,b+2,b+1,b,b+3,b+2,b);}
 }
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(position,3));geometry.setAttribute('color',new Float32BufferAttribute(color,3));geometry.setAttribute('normal',new Float32BufferAttribute(normal,3));geometry.setIndex(index);geometry.computeBoundingSphere();return geometry;
}
function buildFlowers(ground:GardenGround,tier:GardenTier,patch:VegetationPatch):Built{
 const {clumps,radius}=GRASS_BUDGET[tier],target=Math.round(clumps*FLOWER_SHARE),random=rng(9090),m=new Matrix4(),q=new Quaternion(),s=new Vector3(),p=new Vector3(),axis=new Vector3(0,1,0);
 const matrices:Matrix4[]=[],colours:Color[]=[];
 for(let attempt=0;attempt<target*30&&matrices.length<target;attempt++){
  const a=random()*Math.PI*2,r=Math.sqrt(random())*radius,x=Math.cos(a)*r,z=Math.sin(a)*r;if(!flowerSpot(ground.grassAt(x,z),x,z))continue;
  q.setFromAxisAngle(axis,random()*Math.PI*2);const k=.8+random()*.5;s.set(k,k,k);p.set(x,ground.heightAt(x,z)-.01,z);m.compose(p,q,s);matrices.push(m.clone());
  const c=FLOWER_COLOURS[Math.floor(noise(x*.15,z*.15,13)*FLOWER_COLOURS.length)%FLOWER_COLOURS.length];colours.push(new Color(c[0],c[1],c[2]));
 }
 const geometry=flowerClumpGeometry(),material=new MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:0});material.name='Flowers_Garden_Wild';
 patchGardenMaterial(material,{fog:patch.fog,ground:patch.ground,groundMode:'occlude',foliage:patch.grassWind,glow:patch.flowerGlow});
 const group=new Group();group.name='Garden_wildflowers';const mesh=new InstancedMesh(geometry,material,Math.max(1,matrices.length));mesh.count=matrices.length;
 matrices.forEach((matrix,i)=>{mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,colours[i]);});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();mesh.receiveShadow=true;group.add(mesh);
 group.userData.flowers=matrices.length;
 return {group,dispose(){mesh.dispose();geometry.dispose();material.dispose();}};
}
const SHADOW:Record<PlantKind,boolean>={tree:true,bush:true,ground:false,reed:false};
function buildPlants(ground:GardenGround,tier:GardenTier,roots:Map<string,Group>,patch:VegetationPatch):Built{
 const group=new Group();group.name='Garden_planting';const owned:Material[]=[],meshes:InstancedMesh[]=[];
 const planting=gardenPlanting(tier),place=new Matrix4(),q=new Quaternion(),axis=new Vector3(0,1,0),s=new Vector3(),p=new Vector3(),local=new Matrix4(),inverse=new Matrix4();
 for(const kind of Object.keys(planting) as PlantKind[]){
  const byVariant=new Map<string,typeof planting[PlantKind]>();for(const item of planting[kind]){if(!byVariant.has(item.variant))byVariant.set(item.variant,[]);byVariant.get(item.variant)!.push(item);}
  for(const [variant,items] of byVariant){
   const root=roots.get(variant);if(!root)continue;root.updateWorldMatrix(true,true);inverse.copy(root.matrixWorld).invert();
   root.traverse(object=>{
    if(!(object instanceof Mesh))return;local.multiplyMatrices(inverse,object.matrixWorld);
    const sources=Array.isArray(object.material)?object.material:[object.material];
    const materials=sources.map((source:Material)=>{const material=source.clone();patchGardenMaterial(material,plantMaterialPatch(material.name,patch,autumnLeaves(kind,material.name)));owned.push(material);return material;});
    const mesh=new InstancedMesh(object.geometry,materials.length===1?materials[0]:materials,items.length);
    items.forEach((item,i)=>{q.setFromAxisAngle(axis,item.rotation);s.setScalar(item.scale);p.set(item.x,ground.heightAt(item.x,item.z),item.z);place.compose(p,q,s).multiply(local);mesh.setMatrixAt(i,place);});
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=SHADOW[kind];mesh.receiveShadow=true;mesh.name=`Garden_${kind}_${variant}`;group.add(mesh);meshes.push(mesh);
   });
  }
 }
 return {group,dispose(){for(const mesh of meshes)mesh.dispose();for(const material of owned)material.dispose();}};
}
                                                                                                    
export function plantVariants(tier:GardenTier){const planting=gardenPlanting(tier);return [...new Set(Object.values(planting).flat().map(p=>p.variant))];}
                                                                                                                            
export function GardenVegetation({ground,tier,patch,onTrees,mood='day'}:{ground:GardenGround;tier:GardenTier;patch:{fog:GardenFogUniforms;ground:GardenGroundUniforms};onTrees:(trees:readonly PlantedTrunk[])=>void;mood?:keyof typeof FLOWER_GLOW}){
 const {invalidate}=useThree();const [grass,setGrass]=useState<Group>(),[plants,setPlants]=useState<Group>(),[flowers,setFlowers]=useState<Group>(),[litter,setLitter]=useState<Group>();
 const reportTrees=useRef(onTrees);reportTrees.current=onTrees;
                                                                      
 const [wind]=useState(()=>{const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;const time={value:0};
  return {time,grass:{uWindTime:time,uWindAmp:{value:reduced?0:FOLIAGE.grassAmp}},plants:{uWindTime:time,uWindAmp:{value:reduced?0:FOLIAGE.plantAmp}}};});
 const [flowerGlow]=useState(()=>({value:FLOWER_GLOW[mood]}));
 useEffect(()=>{flowerGlow.value=FLOWER_GLOW[mood];invalidate();},[mood]);
 const vegetationPatch=useMemo(()=>({...patch,grassWind:wind.grass,plantWind:wind.plants,flowerGlow}),[patch,wind,flowerGlow]);
 useFrame(state=>{wind.time.value=state.clock.elapsedTime;});
 useEffect(()=>{const built=buildGrass(ground,tier,vegetationPatch);setGrass(built.group);invalidate();return()=>{setGrass(undefined);built.dispose();};},[ground,tier,vegetationPatch]);
 useEffect(()=>{const built=buildFlowers(ground,tier,vegetationPatch);setFlowers(built.group);invalidate();return()=>{setFlowers(undefined);built.dispose();};},[ground,tier,vegetationPatch]);
 useEffect(()=>{const built=buildLitter(ground,tier,vegetationPatch);setLitter(built.group);invalidate();return()=>{setLitter(undefined);built.dispose();};},[ground,tier,vegetationPatch]);
 useEffect(()=>{
  let active=true,built:Built|undefined;const handles=plantVariants(tier).flatMap(id=>{const url=assetById.get(id)?.url;return url?[{id,handle:acquireAsset(url)}]:[];});
                                                                                               
  void Promise.all(handles.map(({id,handle})=>handle.promise.then(root=>[id,root] as const,()=>undefined))).then(results=>{
   if(!active)return;const roots=new Map(results.filter((r):r is readonly [string,Group]=>!!r));built=buildPlants(ground,tier,roots,vegetationPatch);setPlants(built.group);reportTrees.current(plantedTrunks().filter(t=>roots.has(t.variant)));invalidate();
  });
  return()=>{active=false;reportTrees.current([]);setPlants(undefined);built?.dispose();for(const {handle} of handles)handle.release();};
 },[ground,tier,vegetationPatch]);
 return <>{grass&&<primitive object={grass} dispose={null}/>}{flowers&&<primitive object={flowers} dispose={null}/>}{litter&&<primitive object={litter} dispose={null}/>}{plants&&<primitive object={plants} dispose={null}/>}</>;
}
