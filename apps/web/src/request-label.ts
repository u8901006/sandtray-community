import {resolveAsset,supportsColorVariants} from '../../../packages/asset-catalog/src/index';
import {colorVariantHex,type ColorVariant} from '../../../packages/protocol/src/index';
                                                        
                                                       
type SceneObject={id:string;assetId:string;assetVersion?:string};
export function requestObjectLabel(objects:readonly SceneObject[]|undefined,objectId:string){
 const index=objects?.findIndex(o=>o.id===objectId)??-1;
 if(index<0)return '一件物件';
 const {assetId,assetVersion}=objects![index];const name=(resolveAsset(assetId,assetVersion)??resolveAsset(assetId))?.name;
 return name?`${name} ${index+1}`:`第 ${index+1} 件物件`;
}
                                                                                   
                                             
                                                         
type MarkedObject=Omit<SceneObject,'id'>&{colorVariant?:ColorVariant};
export type ObjectLook={thumbnail?:string;symbol:string;color:string;swatch?:string};
export function objectLook({assetId,assetVersion,colorVariant}:MarkedObject):ObjectLook|undefined{
 const asset=(assetVersion?resolveAsset(assetId,assetVersion):undefined)??resolveAsset(assetId);if(!asset)return undefined;
 const variant=assetVersion&&supportsColorVariants(assetId,assetVersion)?colorVariant??'t2':undefined;
 return {thumbnail:asset.thumbnail,symbol:asset.symbol,color:asset.color,swatch:variant&&variant!=='orig'?colorVariantHex[variant]:undefined};
}
