import navigation from './garden-colliders-v2.json';
                                                                                                                                         
import {GARDEN_STOPS,gardenFloor,POND,BRIDGE_WALK,TRAYS} from './garden-layout';
export {gardenFloor};
export const gardenStops=GARDEN_STOPS;
type Collider={kind:'box';name:string;x:number;z:number;halfX:number;halfZ:number}|{kind:'ellipse';name:string;x:number;z:number;radiusX:number;radiusZ:number};
                                                                                                   
const colliders=(navigation.colliders as Collider[]).filter(c=>c.name!=='Pavilion_column');
                                                                                                              
                                                                                                                      
export type GardenTree={x:number;z:number;radius:number};
const insideTree=(x:number,z:number,t:GardenTree)=>Math.hypot(x-t.x,z-t.z)<t.radius+navigation.bodyRadius;
export function canWalkGarden(x:number,z:number,trees:readonly GardenTree[]=[]){
 return canWalkBase(x,z)&&!trees.some(t=>insideTree(x,z,t));
}
function canWalkBase(x:number,z:number){
 const radius=navigation.bodyRadius;
 if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>navigation.bounds-radius||Math.abs(z)>navigation.bounds-radius)return false;
 const bridge=Math.abs(z-BRIDGE_WALK.z)<BRIDGE_WALK.halfWidth-radius&&x>BRIDGE_WALK.minX-radius&&x<BRIDGE_WALK.maxX+radius;
 if(((x-POND.x)/(POND.radiusX+radius))**2+((z-POND.z)/(POND.radiusZ+radius))**2<1&&!bridge)return false;
                                                                                
 if(Math.abs(x)<TRAYS.halfX+radius&&Math.abs(z)<TRAYS.halfZ+radius)return false;
 for(const c of colliders){
  if(bridge&&c.name==='Boulder')continue;
  if(c.kind==='box'&&Math.abs(x-c.x)<c.halfX+radius&&Math.abs(z-c.z)<c.halfZ+radius)return false;
  if(c.kind==='ellipse'&&((x-c.x)/(c.radiusX+radius))**2+((z-c.z)/(c.radiusZ+radius))**2<1)return false;
 }
 return true;
}
                                                                                                                  
                                                                                                  
function canStep(fromX:number,fromZ:number,toX:number,toZ:number,trees:readonly GardenTree[]){
 return canWalkBase(toX,toZ)&&trees.every(t=>!insideTree(toX,toZ,t)||insideTree(fromX,fromZ,t)&&Math.hypot(toX-t.x,toZ-t.z)>=Math.hypot(fromX-t.x,fromZ-t.z));
}
                                                                                              
export function moveInGarden(x:number,z:number,dx:number,dz:number,trees:readonly GardenTree[]=[]){
 if(![x,z,dx,dz].every(Number.isFinite)||!canWalkBase(x,z))return {x,z};
 const distance=Math.hypot(dx,dz);if(!distance)return {x,z};
 const ratio=Math.min(1,4/distance),steps=Math.ceil(Math.min(distance,4)/.08),sx=dx*ratio/steps,sz=dz*ratio/steps;
 for(let i=0;i<steps;i++){
  if(canStep(x,z,x+sx,z+sz,trees)){x+=sx;z+=sz;}
  else {if(canStep(x,z,x+sx,z,trees))x+=sx;if(canStep(x,z,x,z+sz,trees))z+=sz;}
 }
 return {x,z};
}
