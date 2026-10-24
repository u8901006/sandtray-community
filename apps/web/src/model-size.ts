import {Box3,Vector3,type Object3D} from 'three';
                                                                                                                             
                                                                                                                          
                                                               
export const DEFAULT_DISPLAY_SIZE=1.6;
export function normalizedScale(size:{x:number;y:number;z:number},displaySize?:number):number{
 return (displaySize??DEFAULT_DISPLAY_SIZE)/Math.max(size.x,size.y,size.z);
}
                                                                                                                        
                                                                                                                        
                                                                                                                      
                                                                                                                
                                                                                                                             
export function modelBounds(root:Object3D):Box3{
 root.updateMatrixWorld(true);
 return new Box3().setFromObject(root);
}
                                                                                                                                     
                                                                                                                                     
                                                                                                                                  
                                                                                      
export function fitToTray(instance:Object3D,wrapper:Object3D,normalize:boolean,displaySize?:number){
 if(!normalize){const size=modelBounds(instance).getSize(new Vector3());return {drawn:size.clone(),local:size};}
 const bounds=modelBounds(instance),size=bounds.getSize(new Vector3()),center=bounds.getCenter(new Vector3());const scale=normalizedScale(size,displaySize);
 if(!Number.isFinite(scale))throw new Error('Invalid model bounds');
 wrapper.scale.setScalar(scale);instance.position.sub(new Vector3(center.x,bounds.min.y,center.z));
 return {drawn:size.clone().multiplyScalar(scale),local:size};
}
