                                                                                                     
                                                                                                      
                                                                                                   
                                                   
export type License='CC0-1.0'|'CC-BY-4.0'|'CC-BY-3.0'|'MIT'|'QAL-1.0'|'ITHAPPY-FREE'|'PROJECT-OWN'|'DEV_ONLY'|'UNVERIFIED';
export const ALLOWED_LICENSES:readonly License[]=['CC0-1.0','CC-BY-4.0','CC-BY-3.0','MIT','QAL-1.0','ITHAPPY-FREE','PROJECT-OWN','DEV_ONLY','UNVERIFIED'];
export const PUBLIC_PATHS=['/imported-assets/','/dev-assets/'];
export type Provenance={
 author:string;license:License;licenseUrl:string;sourceUrl:string;sourcePack?:string;
 requiresAttribution:boolean;attributionText:string;standaloneRedistributionAllowed:boolean;
                                                                                   
 releasable:boolean;licenseSnapshotSha256?:string;
};
const CC0='https://creativecommons.org/publicdomain/zero/1.0/';
const packs:Record<string,Omit<Provenance,'attributionText'|'requiresAttribution'|'standaloneRedistributionAllowed'|'releasable'>&Partial<Provenance>>={'kenney_mini-arena':{author:'Kenney',license:'CC0-1.0',licenseUrl:CC0,sourceUrl:'https://kenney.nl/assets/mini-arena',sourcePack:'Kenney Mini Arena'},'kenney_mini-dungeon':{author:'Kenney',license:'CC0-1.0',licenseUrl:CC0,sourceUrl:'https://kenney.nl/assets/mini-dungeon',sourcePack:'Kenney Mini Dungeon'},'kenney_furniture-kit':{author:'Kenney',license:'CC0-1.0',licenseUrl:CC0,sourceUrl:'https://kenney.nl/assets/furniture-kit',sourcePack:'Kenney Furniture Kit'},'kenney_mini-characters':{author:'Kenney',license:'CC0-1.0',licenseUrl:CC0,sourceUrl:'https://kenney.nl/assets/mini-characters',sourcePack:'Kenney Mini Characters'},'Ultimate Animated Character Pack - Nov 2019':{author:'Quaternius',license:'CC0-1.0',licenseUrl:CC0,sourceUrl:'https://quaternius.com/packs/ultimatedanimatedcharacter.html',sourcePack:'Quaternius Ultimate Animated Character Pack'},'本專案程序化建模':{author:'本專案（Claude Opus 5.5 依使用者指示程序化建模）',license:'PROJECT-OWN',licenseUrl:'LICENSE',sourceUrl:'tools/assets/build_procedural_batch.mjs',sourcePack:'本專案程序化建模'},'Quaternius Stylized Nature MegaKit':{author:'Quaternius',license:'CC0-1.0',licenseUrl:CC0,sourceUrl:'https://quaternius.com/packs/stylizednaturemegakit.html',sourcePack:'Quaternius Stylized Nature MegaKit'}};
                                                               
                                                                                                       
export const WITHDRAWN_PACKS:ReadonlySet<string>=new Set(['ITHappy Animals FREE']);
export function provenanceFor(asset:{id:string;sourcePack?:string;license?:string;author?:string}):Provenance{
 if(asset.id.startsWith('DEV_'))return{author:'本專案（開發用練習模型）',license:'DEV_ONLY',licenseUrl:'',sourceUrl:'',requiresAttribution:false,attributionText:'',standaloneRedistributionAllowed:true,releasable:false};
 const pack=asset.sourcePack?packs[asset.sourcePack]:undefined;
 if(!pack)return{author:asset.author??'',license:'UNVERIFIED',licenseUrl:'',sourceUrl:'',sourcePack:asset.sourcePack,requiresAttribution:false,attributionText:'',standaloneRedistributionAllowed:false,releasable:false};
 const requiresAttribution=pack.license==='CC-BY-4.0'||pack.license==='CC-BY-3.0'||pack.license==='MIT';
 return{...pack,requiresAttribution,attributionText:requiresAttribution?pack.attributionText??`${pack.author} — CC BY 4.0（已為 Web 最佳化）`:'',
  standaloneRedistributionAllowed:pack.license==='CC0-1.0'||pack.license==='PROJECT-OWN'||pack.license==='MIT',releasable:pack.license==='CC0-1.0'||pack.license==='CC-BY-4.0'||pack.license==='CC-BY-3.0'||pack.license==='MIT'||pack.license==='QAL-1.0'||(pack.license==='ITHAPPY-FREE'&&!WITHDRAWN_PACKS.has(pack.sourcePack??''))||pack.license==='PROJECT-OWN'};
}
export type ProvenanceIssue='MISSING'|'LICENSE_NOT_ALLOWED'|'AUTHOR_EMPTY'|'ATTRIBUTION_EMPTY'|'LICENSE_URL_EMPTY'|'RESTRICTED_ON_PUBLIC_PATH'|'ATTRIBUTION_REQUIRED';
                                                                                                                              
export function provenanceIssues(asset:{url:string;provenance?:Provenance}):ProvenanceIssue[]{
 const p=asset.provenance;if(!p)return['MISSING'];
 const issues:ProvenanceIssue[]=[];
 if(!ALLOWED_LICENSES.includes(p.license))issues.push('LICENSE_NOT_ALLOWED');
 if(!p.author.trim())issues.push('AUTHOR_EMPTY');
 if((p.license==='CC-BY-4.0'||p.license==='CC-BY-3.0'||p.license==='MIT')&&!p.requiresAttribution)issues.push('ATTRIBUTION_REQUIRED');
 if((p.requiresAttribution||p.license==='CC-BY-4.0'||p.license==='CC-BY-3.0'||p.license==='MIT')&&!p.attributionText.trim())issues.push('ATTRIBUTION_EMPTY');
 if(p.releasable&&!p.licenseUrl)issues.push('LICENSE_URL_EMPTY');
 if(!p.standaloneRedistributionAllowed&&p.license!=='UNVERIFIED'&&PUBLIC_PATHS.some(prefix=>asset.url.startsWith(prefix)))issues.push('RESTRICTED_ON_PUBLIC_PATH');
 return issues;
}
export function licenseLabel(license:License){return{'CC0-1.0':'CC0 · 無需署名','CC-BY-4.0':'CC BY 4.0 · 須署名','CC-BY-3.0':'CC BY 3.0 · 須署名','MIT':'MIT 授權 · 須附版權聲明','QAL-1.0':'Quaternius 授權 · 不得單獨再散布','ITHAPPY-FREE':'ITHappy 免費授權 · 不得單獨再散布','PROJECT-OWN':'專案自有 · 使用者自製','DEV_ONLY':'開發用練習模型','UNVERIFIED':'授權未核對（開發用）'}[license];}
                                                                                                                                                         
export function creditsText(assets:{name:string;provenance:Provenance}[]):string{
 const groups=new Map<string,{p:Provenance;names:string[]}>();
 for(const a of assets){const p=a.provenance;const key=JSON.stringify([p.sourcePack??p.author,p.author,p.license,p.licenseUrl,p.sourceUrl,p.requiresAttribution,p.attributionText]);const g=groups.get(key)??{p:a.provenance,names:[]};g.names.push(a.name);groups.set(key,g);}
 const lines=['素材出處（Sandtray）',''];
 for(const {p,names} of groups.values()){const key=p.sourcePack??p.author;
  lines.push(`${key} — 作者：${p.author} — ${licenseLabel(p.license)}${p.licenseUrl?` — ${p.licenseUrl}`:''}${p.sourceUrl?` — ${p.sourceUrl}`:''}`);
  if(p.requiresAttribution)lines.push(`  署名：${p.attributionText}`);
  lines.push(`  物件：${names.join('、')}`);
 }
 return lines.join('\n')+'\n';
}
