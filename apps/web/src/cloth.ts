                                                                                 
                                                               
type Vec3=readonly [number,number,number];type Quat=readonly [number,number,number,number];
type Placed={id:string;assetId:string;trayId?:string;transform:{position:Vec3;rotation:Quat;scale:number}};
                                                                                                                 
                                                                                                                                    
                                                               
export const CLOTH_SHAPES:Record<string,{half:readonly [number,number];height:number;longest:number}>={
 CLT_SQUARE_CLOTH:{half:[1.14,1.14],height:1.3,longest:2.48723},
 CLT_LONG_CLOTH:{half:[2.14,1.14],height:1.3,longest:4.4869},
};
export const isCloth=(assetId:string)=>Object.hasOwn(CLOTH_SHAPES,assetId);
                                                                  
function unrotate([x,y,z]:Vec3,[qx,qy,qz,qw]:Quat):[number,number,number]{
 const ix=qw*x-qy*z+qz*y,iy=qw*y-qz*x+qx*z,iz=qw*z-qx*y+qy*x,iw=qx*x+qy*y+qz*z;
 return [ix*qw+iw*qx+iy*qz-iz*qy,iy*qw+iw*qy+iz*qx-ix*qz,iz*qw+iw*qz+ix*qy-iy*qx];
}
const EPS=0.05;
   
                                                                                                                                  
                                                                                                                             
                                                                                  
   
export function coveredIds(items:readonly Placed[],heights:Readonly<Record<string,number|undefined>>,displaySize:(assetId:string)=>number|undefined):Set<string>{
 return new Set(coveringCloths(items,heights,displaySize).keys());
}
                                                                                                                                         
                                                                                                                          
export function coveringCloths(items:readonly Placed[],heights:Readonly<Record<string,number|undefined>>,displaySize:(assetId:string)=>number|undefined):Map<string,{position:Vec3;top:number}>{
 const out=new Map<string,{position:Vec3;top:number}>();
 const cloths=items.filter(i=>isCloth(i.assetId));if(!cloths.length)return out;
 for(const cloth of cloths){
  const shape=CLOTH_SHAPES[cloth.assetId],k=(displaySize(cloth.assetId)??1.6)*cloth.transform.scale/shape.longest;
  const [cx,cy,cz]=cloth.transform.position,top=cy+shape.height*k;
  for(const item of items){
   if(isCloth(item.assetId)||out.has(item.id)||(item.trayId??'dry')!==(cloth.trayId??'dry'))continue;
   const [x,y,z]=item.transform.position,[lx,,lz]=unrotate([x-cx,y-cy,z-cz],cloth.transform.rotation);
   if(Math.abs(lx)>shape.half[0]*k||Math.abs(lz)>shape.half[1]*k)continue;
   const h=heights[item.id];if(h!==undefined&&y+h*item.transform.scale>top+EPS)continue;
   out.set(item.id,{position:cloth.transform.position,top});
  }
 }
 return out;
}
                                                                                                        
export const COVERED_NAME='布下的東西';
   
                                                                                                                             
                                                                                                           
   
export function creditAssets<A extends {name:string}>(objects:readonly {id:string}[],covered:ReadonlySet<string>,resolve:(o:any)=>A|undefined):A[]{
 return objects.flatMap(o=>{const a=resolve(o);return a?[covered.has(o.id)?{...a,name:COVERED_NAME}:a]:[];});
}
