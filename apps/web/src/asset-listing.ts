import {PUBLIC_PATHS,type CatalogAsset} from '../../../packages/asset-catalog/src/index';
                                                                                                        
                                                                                        
                                                                                        
export function isLocalHost(hostname:string){return hostname==='localhost'||hostname==='127.0.0.1'||hostname==='[::1]'||hostname.endsWith('.localhost');}
export function listableAsset(asset:Pick<CatalogAsset,'id'|'url'|'provenance'>,{roomId,hostname,healthDeployed}:{roomId:string|null;hostname:string;healthDeployed:boolean}){
                                                                                                                      
 if(!roomId&&!PUBLIC_PATHS.some(prefix=>asset.url.startsWith(prefix)))return false;
 const deployed=healthDeployed||!isLocalHost(hostname);
 return !(deployed&&(asset.id.startsWith('DEV_')||!asset.provenance.releasable));
}
