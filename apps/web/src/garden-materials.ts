import {DoubleSide,MeshStandardMaterial,type Material} from 'three';
import {patchGardenMaterial,type GardenFogUniforms} from './garden-shaders';
                                                                      
                                                                  
                                                                      
                                                                 
                                                                         

                                                                                                           
export const GLB_TWEAKS:Record<string,(m:MeshStandardMaterial)=>void>={
 Pond_Water:m=>{m.color.set('#426f68');m.roughness=.12;m.metalness=.25;m.envMapIntensity=.75;m.normalScale.set(.18,.18);},
 Oiled_Timber:m=>{m.roughness=.57;m.normalScale.set(.25,.25);},
 Weathered_Cedar:m=>{m.normalScale.set(.35,.35);},
 Glazed_Ceramic:m=>{m.roughness=.19;m.envMapIntensity=.85;},
};
export type PaletteEntry={color:string;roughness:number;metalness?:number;doubleSided?:boolean;vertexColors?:boolean;transparent?:boolean;opacity?:number;emissive?:string;emissiveIntensity?:number;flatShading?:boolean};
                                                     
export const GARDEN_PALETTE={
                                                  
 lacquer:{color:'#b23a2c',roughness:.42},
                                            
 agedCedar:{color:'#5f4431',roughness:.82},
                                                   
 bronze:{color:'#6d6a4c',roughness:.38,metalness:.7},
                           
 granite:{color:'#8c8a83',roughness:.9,flatShading:true},
                                                           
 roofTile:{color:'#3a4046',roughness:.6},
                     
 plaster:{color:'#e6dfd0',roughness:.95},
                                                
 bamboo:{color:'#86a65a',roughness:.48},
 bambooNode:{color:'#5d7a3c',roughness:.55},
 bambooLeaf:{color:'#6f9a45',roughness:.6,doubleSided:true},
                       
 lilyPad:{color:'#3d7a3a',roughness:.55,doubleSided:true},
                            
 lotusPetal:{color:'#f4c4d0',roughness:.6,doubleSided:true},
 lotusBud:{color:'#e98ca3',roughness:.6},
                                                                                   
 koi:{color:'#ffffff',roughness:.45,vertexColors:true,transparent:true,opacity:.88},
                                                                                    
 silhouette:{color:'#4a4f55',roughness:1},
                                  
 lanternGlow:{color:'#ffd8a0',roughness:.8,emissive:'#ffc77a',emissiveIntensity:0},
} as const satisfies Record<string,PaletteEntry>;
export type PaletteName=keyof typeof GARDEN_PALETTE;
                                                                          
export function createPaletteMaterial(name:PaletteName,fog:GardenFogUniforms){
 const e:PaletteEntry=GARDEN_PALETTE[name];
 const m=new MeshStandardMaterial({color:e.color,roughness:e.roughness,metalness:e.metalness??0,vertexColors:!!e.vertexColors,transparent:!!e.transparent,opacity:e.opacity??1,flatShading:!!e.flatShading});
 if(e.doubleSided)m.side=DoubleSide;                                          
 if(e.emissive){m.emissive.set(e.emissive);m.emissiveIntensity=e.emissiveIntensity??1;}
 m.name='G3_'+name;patchGardenMaterial(m,{fog});return m;
}
                                                                                                               
export function createGardenMaterials(fog:GardenFogUniforms){
 const made=new Map<PaletteName,MeshStandardMaterial>();let disposed=false;
 return {get(name:PaletteName){if(disposed)throw new Error('garden materials disposed');let m=made.get(name);if(!m){m=createPaletteMaterial(name,fog);made.set(name,m);}return m;},
  dispose(){if(disposed)return;disposed=true;for(const m of made.values())m.dispose();made.clear();}};
}
export type GardenMaterials=ReturnType<typeof createGardenMaterials>;
export const isPaletteMaterial=(m:Material)=>m.name.startsWith('G3_');
