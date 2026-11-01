import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import rows from '../packages/asset-catalog/src/cloth-v1.json' with {type:'json'};
import {resolveAsset,validAssetVersion,provenanceIssues,pinnedModels,devAssets} from '../packages/asset-catalog/src/index';
import {categoryGroup} from '../apps/web/src/shelf-groups';
import {resolvePrivateModel} from '../apps/worker/src/asset-delivery';
import {coveredIds,CLOTH_SHAPES,isCloth} from '../apps/web/src/cloth';
import {missingLocalAssetsReason} from './runtime/local-asset-gate';

                                                                                                           
                                                                                                                                  
                                        
const root=join(__dirname,'..');
const plan=JSON.parse(readFileSync(join(root,'tools/assets/cloth-v1.json'),'utf8'));
const pub=(rel:string)=>join(root,'apps/web/public',rel);
const skipWithout=(ctx:{skip:(note?:string)=>void},paths:string[],what:string)=>{const reason=missingLocalAssetsReason(paths,what);if(reason){console.warn(reason);ctx.skip(reason);}};
function bounds(path:string){
 const b=new Uint8Array(readFileSync(path)),v=new DataView(b.buffer,b.byteOffset,b.byteLength),n=v.getUint32(12,true);
 const doc=JSON.parse(new TextDecoder().decode(b.subarray(20,20+n)));const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const mesh of doc.meshes)for(const p of mesh.primitives){const a=doc.accessors[p.attributes.POSITION];a.min.forEach((x:number,i:number)=>lo[i]=Math.min(lo[i],x));a.max.forEach((x:number,i:number)=>hi[i]=Math.max(hi[i],x));}
 return {bytes:b,doc,lo,hi};
}
const size=(id:string)=>resolveAsset(id)?.displaySize;
const Q0=[0,0,0,1] as const,yaw=(deg:number)=>{const h=deg*Math.PI/360;return [0,Math.sin(h),0,Math.cos(h)] as const;};
const obj=(id:string,assetId:string,x:number,z:number,o:{y?:number;scale?:number;tray?:'dry'|'wet';rot?:readonly [number,number,number,number]}={})=>
 ({id,assetId,trayId:o.tray??'dry',transform:{position:[x,o.y??0,z] as const,rotation:o.rot??Q0,scale:o.scale??1}});

describe('cloth v1 catalog',()=>{
 it('registers 方布 and 長布, unreviewed, modelled in this repo, on the 日常 shelf, with a displaySize',()=>{
  expect(rows.map(r=>r.id)).toEqual(['CLT_SQUARE_CLOTH','CLT_LONG_CLOTH']);expect(rows.map(r=>r.name)).toEqual(['方布','長布']);
  for(const r of rows){
   expect(r.status).toBe('IMPORTED_UNREVIEWED');expect(plan.status).toBeUndefined();
   const p=resolveAsset(r.id)!.provenance;expect(p.license).toBe('PROJECT-OWN');expect(p.sourcePack).toBe('本專案程序化建模');expect(p.releasable).toBe(true);
   expect(categoryGroup(r.category).id).toBe('daily');expect(isCloth(r.id)).toBe(true);
   expect(r.displaySize).toBe(plan.items.find((i:{slug:string})=>'CLT_'+i.slug.toUpperCase()===r.id).displaySize);
   expect(devAssets.filter(a=>a.id===r.id)).toHaveLength(1);
  }
 });
 for(const r of rows)it(`${r.id}: pinned bytes, budget, one double-sided material, shape constants match the model`,ctx=>{skipWithout(ctx,[pub(r.url),pub(r.thumbnail)],r.id+' GLB and thumbnail');
  const {bytes,doc,lo,hi}=bounds(pub(r.url));
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(r.sha256);expect(bytes.length).toBe(r.bytes);
  expect(r.bytes).toBeLessThanOrEqual(plan.maxBytes);expect(r.triangles).toBeLessThanOrEqual(plan.maxTriangles);
  expect(doc.materials).toHaveLength(1);expect(doc.materials[0].doubleSided).toBe(true);expect(doc.extensionsUsed??[]).toEqual([]);
                                                                                                        
  for(const c of doc.materials[0].pbrMetallicRoughness.baseColorFactor.slice(0,3))expect(c).toBeGreaterThan(0.05),expect(c).toBeLessThan(0.6);
  const shape=CLOTH_SHAPES[r.id];
  expect(lo[1]).toBeCloseTo(0,4);expect(hi[1]).toBeCloseTo(shape.height,4);
  expect(Math.max(hi[0]-lo[0],hi[1]-lo[1],hi[2]-lo[2])).toBeCloseTo(shape.longest,3);
                                                
  expect(shape.half[0]).toBeLessThan(hi[0]);expect(shape.half[1]).toBeLessThan(hi[2]);
  expect(validAssetVersion(r.id,r.version)).toBe(true);expect(provenanceIssues(resolveAsset(r.id,r.version)!)).toEqual([]);
  expect(pinnedModels.some(m=>m.id===r.id&&m.sha256===r.sha256)).toBe(true);
  expect(resolvePrivateModel(r.id,r.version)).toEqual({key:'models/'+r.sha256+'.glb',sha256:r.sha256,bytes:r.bytes});
 });
 it('model code is deterministic',()=>{expect(readFileSync(join(root,'tools/assets/cloth-v1/models.js'),'utf8')).not.toMatch(/Math\.random/);});
});

describe('coveredIds',()=>{
                                                                                                                      
 const k=3.0/CLOTH_SHAPES.CLT_SQUARE_CLOTH.longest,half=1.14*k,top=1.3*k;
 it('hides objects inside the footprint and below the top, and nothing else',()=>{
  const items=[obj('c','CLT_SQUARE_CLOTH',0,0),obj('in','DEV_ROCK',half-0.05,0),obj('edge-out','DEV_ROCK',half+0.05,0),obj('far','DEV_ROCK',3,3),obj('corner','DEV_ROCK',half-0.05,-(half-0.05))];
  expect([...coveredIds(items,{},size)].sort()).toEqual(['corner','in']);
 });
 it('never hides a cloth, so it can always be found and lifted',()=>{
  const items=[obj('a','CLT_SQUARE_CLOTH',0,0),obj('b','CLT_LONG_CLOTH',0,0)];
  expect(coveredIds(items,{},size).size).toBe(0);
 });
 it('an object taller than the cloth pokes out and stays listed; unknown height counts as covered',()=>{
  const items=[obj('c','CLT_SQUARE_CLOTH',0,0),obj('short','DEV_ROCK',0,0),obj('tall','DEV_ROCK',0.2,0),obj('unknown','DEV_ROCK',-0.2,0)];
  expect([...coveredIds(items,{short:top-0.2,tall:top+0.3},size)].sort()).toEqual(['short','unknown']);
                                                                      
  expect(coveredIds([obj('c','CLT_SQUARE_CLOTH',0,0),{...obj('s','DEV_ROCK',0,0),transform:{position:[0,0,0],rotation:Q0,scale:3}}],{s:top-0.2},size).has('s')).toBe(false);
 });
 it('scaling the cloth up covers more; the long cloth is long along its own x and turns with its rotation',()=>{
  const at=(x:number,z:number,cloth:ReturnType<typeof obj>)=>coveredIds([cloth,obj('o','DEV_ROCK',x,z)],{},size).has('o');
  expect(at(half+0.3,0,obj('c','CLT_SQUARE_CLOTH',0,0))).toBe(false);
  expect(at(half+0.3,0,obj('c','CLT_SQUARE_CLOTH',0,0,{scale:1.5}))).toBe(true);
  const kl=5.0/CLOTH_SHAPES.CLT_LONG_CLOTH.longest,along=2.14*kl-0.1;
  expect(at(along,0,obj('l','CLT_LONG_CLOTH',0,0))).toBe(true);expect(at(0,along,obj('l','CLT_LONG_CLOTH',0,0))).toBe(false);
  expect(at(0,along,obj('l','CLT_LONG_CLOTH',0,0,{rot:yaw(90)}))).toBe(true);expect(at(along,0,obj('l','CLT_LONG_CLOTH',0,0,{rot:yaw(90)}))).toBe(false);
                                                           
  expect(at(4+along,1,obj('l','CLT_LONG_CLOTH',4,1))).toBe(true);
 });
 it('only covers objects in the same tray',()=>{
  const items=[obj('c','CLT_SQUARE_CLOTH',0,0,{tray:'dry'}),obj('w','DEV_ROCK',0,0,{tray:'wet'})];
  expect(coveredIds(items,{},size).size).toBe(0);
 });
});
