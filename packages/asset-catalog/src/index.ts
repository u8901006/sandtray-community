import animals from './animals-v2.json' with {type:'json'};
import previousAnimals from './animals-v1.json' with {type:'json'};
import previousPuppet from './dev-puppet-v1.json' with {type:'json'};
import imported from './imported-v1.json' with {type:'json'};
import blenderCity from './blendercity-v1.json' with {type:'json'};
import sunMoonLake from './sunmoonlake-v1.json' with {type:'json'};
import twScenic from './twscenic-v1.json' with {type:'json'};
import olympians from './olympians-v1.json' with {type:'json'};
import megaKits from './megakits-v1.json' with {type:'json'};
import adventure from './adventure-v1.json' with {type:'json'};
import bits from './bits-v1.json' with {type:'json'};
import houshin from './houshin-v1.json' with {type:'json'};
import userModels from './usermodels-v1.json' with {type:'json'};
import glbSymbol from './glbsymbol-v1.json' with {type:'json'};
import pocketWorld from './pocketworld-v1.json' with {type:'json'};
import polyPizza from './polypizza-v1.json' with {type:'json'};
import twFarm from './twfarm-v1.json' with {type:'json'};
import cloth from './cloth-v1.json' with {type:'json'};
import {provenanceFor,provenanceIssues,WITHDRAWN_PACKS,type Provenance} from './provenance';
import type {ColorVariant} from '../../protocol/src/index';
export * from './provenance';
export type LinearRgba=readonly [number,number,number,number];
                                                                                                                                  
export type CatalogAsset={id:string;name:string;category:string;symbol:string;color:string;url:string;version:string;thumbnail?:string;displaySize?:number;clips:{id:string;name:string;durationMs:number}[];sourcePack?:string;colorVariantOriginal?:LinearRgba;provenance:Provenance};
type RawAsset=Omit<CatalogAsset,'provenance'>&{provenance?:Provenance;license?:string;author?:string};
                                                                           
                                                                           
                                                                        
export const COLOR_VARIANT_ASSET_IDS:ReadonlySet<string>=new Set([
  'IMP_ULTIMATE_Casual_Male','IMP_ULTIMATE_Casual_Female',
  'IMP_ULTIMATE_Casual2_Male','IMP_ULTIMATE_Casual2_Female',
  'IMP_ULTIMATE_Suit_Male','IMP_ULTIMATE_Suit_Female',
  'IMP_ULTIMATE_Worker_Male','IMP_ULTIMATE_OldClassy_Male',
  'IMP_ULTIMATE_Doctor_Male_Young','IMP_ULTIMATE_Soldier_Male',
  'IMP_ULTIMATE_Knight_Male','IMP_ULTIMATE_Wizard',
]);
export const ORIGINAL_SKIN_LINEAR:LinearRgba=[0.013410447165369987,0.013410447165369987,0.013410447165369987,1];
                                                                                                                         
const withProvenance=(asset:RawAsset):CatalogAsset=>({...asset,...(COLOR_VARIANT_ASSET_IDS.has(asset.id)?{colorVariantOriginal:asset.colorVariantOriginal??ORIGINAL_SKIN_LINEAR}:{}),provenance:asset.provenance??provenanceFor(asset)});
const practiceAssets:RawAsset[] = [
  {id:'DEV_ROCK',name:'圓石',category:'自然',symbol:'●',color:'#9caba3',url:'/dev-assets/rock.glb',version:'dev-v1',clips:[]},
  {id:'DEV_HOUSE',name:'小屋',category:'建築',symbol:'⌂',color:'#c59477',url:'/dev-assets/house.glb',version:'dev-v1',clips:[]},
  {id:'DEV_ARCH',name:'拱門',category:'建築',symbol:'∩',color:'#c5b697',url:'/dev-assets/arch.glb',version:'dev-v1',clips:[]},
                                                                                                  
                                                                                
  {id:'DEV_PUPPET',name:'練習玩偶',category:'練習',symbol:'♟',color:'#8d7ae5',url:'/dev-assets/puppet-v2.glb',version:'puppet-v2',clips:[{id:'clip-0',name:'待機',durationMs:1000},{id:'clip-1',name:'原地行走',durationMs:800}]},
];
export const devAssets:CatalogAsset[]=[...practiceAssets,...imported,...animals,...blenderCity,...sunMoonLake,...twScenic,...olympians,...megaKits,...adventure,...bits,...userModels,...glbSymbol,...pocketWorld,...polyPizza,...twFarm,...cloth,...(houshin as RawAsset[])].map(withProvenance);
export const assetById=new Map(devAssets.map(asset=>[asset.id,asset]));
                                                                                   
export const readyAssetCount=new Set(devAssets.filter(asset=>(asset as {status?:string}).status==='ready').map(asset=>asset.id)).size;
const assetVersions=new Map<string,Map<string,CatalogAsset>>();
for(const asset of [...previousAnimals.map(withProvenance),...previousPuppet.map(withProvenance),...devAssets]){
 let versions=assetVersions.get(asset.id);if(!versions){versions=new Map();assetVersions.set(asset.id,versions);}versions.set(asset.version,asset);
}
export function resolveAsset(id:string,version?:string):CatalogAsset|undefined{return version===undefined?assetById.get(id):assetVersions.get(id)?.get(version);}
                                                                                                                          
export function validAssetVersion(id:string,version:string){const asset=resolveAsset(id,version);return asset!==undefined&&provenanceIssues(asset).length===0&&!WITHDRAWN_PACKS.has(asset.provenance.sourcePack??'');}
export function supportsColorVariants(id:string,version:string){const asset=resolveAsset(id,version);return asset!==undefined&&COLOR_VARIANT_ASSET_IDS.has(asset.id)&&asset.colorVariantOriginal!==undefined;}
export function colorVariantOriginal(id:string,version:string):LinearRgba|undefined{return resolveAsset(id,version)?.colorVariantOriginal;}
export const COLOR_VARIANT_OPTIONS:readonly ColorVariant[]=['t1','t2','t3','t4','t5','t6','orig'];
export function clipDuration(id:string,clipId:string,version?:string){return resolveAsset(id,version)?.clips.find(clip=>clip.id===clipId)?.durationMs;}
export type DevAssetId=typeof devAssets[number]['id'];
                                                                                                    
                                                                                                       
                                                                                                      
                                                                                               
                                                                                                                
                                                                                                                               
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               
export type PinnedModel={id:string;version:string;sha256:string;bytes:number;url:string;privateSource?:string};
const pinnedList:PinnedModel[]=[];const pinned=new Set<string>();
for(const raw of [...imported,...animals,...previousAnimals,...blenderCity,...sunMoonLake,...twScenic,...olympians,...megaKits,...adventure,...bits,...userModels,...glbSymbol,...pocketWorld,...polyPizza,...twFarm,...cloth] as PinnedModel[]){const key=raw.id+'\0'+raw.version;if(pinned.has(key))continue;pinned.add(key);pinnedList.push({id:raw.id,version:raw.version,sha256:raw.sha256,bytes:raw.bytes,url:raw.url,privateSource:raw.privateSource});}
export const pinnedModels:readonly PinnedModel[]=pinnedList;
export function privateModelUrl(asset:Pick<CatalogAsset,'id'|'version'|'provenance'>,roomId:string):string|undefined{
 if(!asset.provenance.releasable||!pinned.has(asset.id+'\0'+asset.version))return undefined;
 return `/api/assets/${encodeURIComponent(asset.id)}/${encodeURIComponent(asset.version)}/model.glb?roomId=${encodeURIComponent(roomId)}`;
}
export function modelUrlFor(asset:Pick<CatalogAsset,'id'|'version'|'url'|'provenance'>,roomId:string|null|undefined):string{
 return (roomId?privateModelUrl(asset,roomId):undefined)??asset.url;
}
