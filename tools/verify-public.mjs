import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import {resolve,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(readFileSync(resolve(root,'PUBLIC_EXPORT.json'),'utf8'));
const declared=new Map(manifest.files.map(f=>[f.path,f]));
const ignored=['node_modules/','apps/web/dist/','apps/worker/dist/','dist/','.wrangler/','.npm-cache/','test-results/','test-results-public/'];
const generated=new Set(['PUBLIC_EXPORT.json','apps/web/public/source-code.zip']);
const forbidden=/(^|\/)(?:\.git|\.env(?!\.example)|\.dev\.vars|private-assets|working|claims)(?:\/|$)|Agent 留言板|CI_ASSETS_R2_|leepsyclinic\.(?:uk|com)|u8901006\.workers\.dev|8c2f963c-23fb|ababe557-7623/;
const privateText=/CI_ASSETS_R2_|leepsyclinic\.(?:uk|com)|u8901006\.workers\.dev|8c2f963c-23fb|ababe557-7623|[CD]:[\\/]心理學/;
const files=[];
function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){
 const absolute=resolve(dir,entry.name),name=relative(root,absolute).split(sep).join('/');
 if(name==='.git'||['node_modules','.wrangler','.npm-cache'].includes(entry.name)||ignored.some(p=>name===p.slice(0,-1)||name.startsWith(p)))continue;
 if(lstatSync(absolute).isSymbolicLink())throw Error('Symlink not allowed: '+name);
 if(entry.isDirectory()){if(forbidden.test(name+'/'))throw Error('Forbidden directory: '+name);walk(absolute);}else files.push(name);
}}
walk(root);
for(const name of files){
 if(forbidden.test(name))throw Error('Forbidden file: '+name);
 if(generated.has(name))continue;
 const entry=declared.get(name);if(!entry)throw Error('Unmanifested file: '+name);
 const content=readFileSync(resolve(root,name));
 if(content.length!==entry.bytes||hash(content)!==entry.sha256)throw Error('Integrity mismatch: '+name);
 if(name!=='tools/verify-public.mjs'&&/\.(?:[cm]?[jt]sx?|jsonc?|html|css|md|txt|ya?ml|py)$/.test(name)&&privateText.test(content.toString('utf8')))throw Error('Private configuration reference: '+name);
}
for(const [name] of declared)if(!files.includes(name))throw Error('Missing file: '+name);
for(const asset of manifest.assets){
 const model='apps/web/public'+asset.url,thumb='apps/web/public'+asset.thumbnail;
 if(!declared.has(model)||!declared.has(thumb))throw Error('Incomplete asset: '+asset.id);
 const b=readFileSync(resolve(root,model));
 if(hash(b)!==asset.sha256||b.length!==asset.bytes)throw Error('Asset hash mismatch: '+asset.id);
 const size=b.readUInt32LE(12);const json=JSON.parse(b.subarray(20,20+size).toString());
 for(const item of [...json.buffers??[],...json.images??[]])if(item.uri&&!item.uri.startsWith('data:'))throw Error('External GLB dependency: '+asset.id);
}
if(manifest.license!=='AGPL-3.0-only'||manifest.assets.length!==286)throw Error('Unexpected public release profile');
if(!manifest.sourceArchive||hash(readFileSync(resolve(root,manifest.sourceArchive.path)))!==manifest.sourceArchive.sha256)throw Error('Source archive mismatch');
console.log(`PUBLIC_VERIFY_PASS files=${declared.size} assets=${manifest.assets.length} source=${manifest.sourceCommit}`);
