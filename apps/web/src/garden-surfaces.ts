import {Group,Mesh,MeshStandardMaterial,BufferAttribute,Vector3,type Material,type Texture,type BufferGeometry} from 'three';
import {patchGardenMaterial,type GardenFogUniforms,type GardenGroundUniforms} from './garden-shaders';
import {POND,PAVILION_POSTS} from './garden-layout';
import {GLB_TWEAKS} from './garden-materials';
                                                                                  
                                                       
const CANOPY_MATERIALS=/^Foliage_[0-3]$/,WRAP_MATERIALS=new Set(['Weathered_Cedar','Granite','Lime_Plaster','Slate_Roof']);
const STILL_FOLIAGE={uWindTime:{value:0},uWindAmp:{value:0}};
                                                                                                                                   
                                                                                                                                   
                                                                                                                           
const POSTS=PAVILION_POSTS;
export function inPavilionPost(v:Vector3){return v.y>-.5&&v.y<4.3&&POSTS.some(([x,z])=>Math.abs(v.x-x)<.6&&Math.abs(v.z-z)<.6);}
function removePavilionPosts(mesh:Mesh){
 const geometry=mesh.geometry as BufferGeometry;if(geometry.userData.pavilionPostsRemoved)return;
 const position=geometry.getAttribute('position');if(!position)return;mesh.updateWorldMatrix(true,false);
 const world=(i:number)=>new Vector3().fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);
 const index=geometry.getIndex(),count=index?index.count:position.count,kept:number[]=[];
 for(let t=0;t<count;t+=3){const ids=[0,1,2].map(k=>index?index.getX(t+k):t+k);if(!ids.every(i=>inPavilionPost(world(i))))kept.push(...ids);}
 if(kept.length!==count){geometry.setIndex(new BufferAttribute(position.count>65535?new Uint32Array(kept):new Uint16Array(kept),1));}
 geometry.userData.pavilionPostsRemoved=true;
}

                                                                                          
                                                                                                                        
                                                                                                                
const OCCLUDED=new Set(['Granite','Garden_Gravel']);
const SHORE_MATERIALS=new Set(['Forest_Floor','Granite','Garden_Gravel']);
export function gardenSurfaces(source:Group,patch?:{fog:GardenFogUniforms;ground:GardenGroundUniforms}){
 const root=source.clone(true),owned=new Map<Material,Material>();let waterNormal:Texture|null=null;const waterMeshes:Mesh[]=[];
 root.traverse(object=>{
  if(!(object instanceof Mesh))return;
  const prepare=(original:Material)=>{
   if(owned.has(original))return owned.get(original)!;
   const material=original.clone();owned.set(original,material);
   if(material instanceof MeshStandardMaterial){
    if(material.name==='Pond_Water')waterNormal=material.normalMap;
    GLB_TWEAKS[material.name]?.(material);
   }
   const canopy=CANOPY_MATERIALS.test(material.name),wrap=WRAP_MATERIALS.has(material.name);
   const pond=material.name==='Pond_Water'?{centre:[POND.x,POND.z] as [number,number],radius:[POND.radiusX,POND.radiusZ] as [number,number]}:undefined;
                                                                                                  
   const shore=SHORE_MATERIALS.has(material.name)?{centre:[POND.x,POND.z] as [number,number],radius:[POND.radiusX,POND.radiusZ] as [number,number]}:undefined,moss=material.name==='Granite';
   if(patch)patchGardenMaterial(material,pond?{fog:patch.fog,pond}:material.name==='Forest_Floor'?{fog:patch.fog,ground:patch.ground,groundMode:'floor',shore}:OCCLUDED.has(material.name)?{fog:patch.fog,ground:patch.ground,groundMode:'occlude',wrap,moss,shore}:canopy?{fog:patch.fog,foliage:STILL_FOLIAGE,canopy:true,autumn:true}:{fog:patch.fog,wrap});
   return material;
  };
  object.material=Array.isArray(object.material)?object.material.map(prepare):prepare(object.material);
  if((Array.isArray(object.material)?object.material:[object.material]).some(m=>m.name==='Weathered_Cedar'))removePavilionPosts(object);
                                                                                                 
  if(/^Pavilion_/.test(object.name))object.visible=false;
  object.castShadow=true;object.receiveShadow=true;
  if((Array.isArray(object.material)?object.material:[object.material]).some(m=>m.name==='Pond_Water')){object.castShadow=false;waterMeshes.push(object);}
 });
 let released=false;
 return {root,waterNormal,setReflections(enabled:boolean){for(const mesh of waterMeshes)mesh.visible=!enabled;},setLanterns(lit:boolean){for(const material of owned.values())if(material instanceof MeshStandardMaterial&&material.name==='Warm_Lantern')material.emissiveIntensity=lit?2.4:0;},dispose(){if(released)return;released=true;for(const material of owned.values())material.dispose();}};
}
