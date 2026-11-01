import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import rows from '../packages/asset-catalog/src/tunnel-v1.json' with {type:'json'};
import {resolveAsset,pinnedModels,devAssets} from '../packages/asset-catalog/src/index';
import {missingLocalAssetsReason} from './runtime/local-asset-gate';

                                                                                                                
                                                                                                                                    
                                                                                                                            
                                                                                                                                 
const root=join(__dirname,'..');
const plan=JSON.parse(readFileSync(join(root,'tools/assets/tunnel-v1.json'),'utf8'));
function glb(path:string){
 const b=new Uint8Array(readFileSync(path)),v=new DataView(b.buffer,b.byteOffset,b.byteLength);
 expect(v.getUint32(0,true)).toBe(0x46546c67);expect(v.getUint32(4,true)).toBe(2);expect(v.getUint32(8,true)).toBe(b.length);
 const n=v.getUint32(12,true);return {bytes:b,doc:JSON.parse(new TextDecoder().decode(b.subarray(20,20+n)))};
}
function positions(id:string,material:(name:string)=>boolean=()=>true){
 const row=rows.find(r=>r.id===id)!,{bytes,doc}=glb(join(root,'apps/web/public',row.url)),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const bin=20+v.getUint32(12,true)+8,out:number[][]=[];
 for(const mesh of doc.meshes)for(const prim of mesh.primitives){
  if(!material(doc.materials[prim.material].name))continue;
  const acc=doc.accessors[prim.attributes.POSITION],view=doc.bufferViews[acc.bufferView],stride=view.byteStride??12;
  for(let i=0;i<acc.count;i++){const o=bin+(view.byteOffset??0)+(acc.byteOffset??0)+i*stride;out.push([v.getFloat32(o,true),v.getFloat32(o+4,true),v.getFloat32(o+8,true)]);}
 }
 return out;
}
                                                                                          
function triangles(id:string){
 const r=rows.find(x=>x.id===id)!,{bytes,doc}=glb(join(root,'apps/web/public',r.url)),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const bin=20+v.getUint32(12,true)+8,out:number[][][]=[];
 const read=(accIndex:number,i:number,size:number,f:'f32'|'u16'|'u32')=>{const acc=doc.accessors[accIndex],view=doc.bufferViews[acc.bufferView],w=f==='u16'?2:4,stride=view.byteStride??w*size,o=bin+(view.byteOffset??0)+(acc.byteOffset??0)+i*stride;
  return Array.from({length:size},(_,k)=>f==='f32'?v.getFloat32(o+k*4,true):f==='u16'?v.getUint16(o+k*2,true):v.getUint32(o+k*4,true));};
 for(const mesh of doc.meshes)for(const prim of mesh.primitives){
  const pos=prim.attributes.POSITION,idx=prim.indices,type=idx===undefined?null:doc.accessors[idx].componentType===5123?'u16':'u32';
  const n=idx===undefined?doc.accessors[pos].count:doc.accessors[idx].count;
  for(let i=0;i<n;i+=3)out.push([0,1,2].map(k=>read(pos,type?read(idx,i+k,1,type)[0]:i+k,3,'f32')));
 }
 return out;
}
                                                                                                                                    
function blocksLine(tris:number[][][],x:number,y:number){
 return tris.some(([a,b,c])=>{const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(d)<1e-9)return false;
  const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/d,w=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/d;return u>=0&&w>=0&&u+w<=1;});
}
                                                                                                                   
const sightLines=(top:number)=>[-0.25,0,0.25].flatMap(x=>[0.08,top/2,top-0.15].map(y=>[x,y] as const));
const span=(p:number[][],k:number)=>Math.max(...p.map(q=>q[k]))-Math.min(...p.map(q=>q[k]));
                                                                                                                          
const ceiling=(p:number[][])=>Math.min(...p.filter(q=>Math.abs(q[0])<0.05&&q[1]>0.3).map(q=>q[1]));
const skipWithout=(ctx:{skip:(note?:string)=>void},paths:string[],what:string)=>{const reason=missingLocalAssetsReason(paths,what);if(reason){console.warn(reason);ctx.skip(reason);}};
const pub=(rel:string)=>join(root,'apps/web/public',rel),glbOf=(id:string)=>pub(rows.find(r=>r.id===id)!.url);
describe('tunnel v1 styles',()=>{
 it('three style candidates, unreviewed, modelled in this repo, not on the tray shelf',()=>{
                                                                                                       
  expect(rows.map(r=>r.id)).toEqual(['TUN_ARCH_SHORT','TUN_TUNNEL_LONG','TUN_PLAY_TUNNEL']);
  expect(rows.map(r=>r.name)).toEqual(['短拱隧道','長隧道','布製遊戲隧道']);
  for(const r of rows){
                                                                                    
   expect(r.status).toBe('IMPORTED_UNREVIEWED');expect(plan.status).toBeUndefined();
   expect(r.license).toBe('PROJECT-OWN');expect(r.sourcePack).toBe('本專案程序化建模');
   expect(r.origin).toBe(`tools/assets/tunnel-v1/models.js#${r.id.slice(4).toLowerCase()}`);
                                                                                                                        
   expect(devAssets.some(a=>a.id===r.id)).toBe(false);expect(resolveAsset(r.id)).toBeUndefined();expect(pinnedModels.some(m=>m.id===r.id)).toBe(false);
  }
 });
 for(const r of rows)it(`${r.id}: pinned bytes, budget, self-contained, bottom-centred`,ctx=>{skipWithout(ctx,[pub(r.url),pub(r.thumbnail)],r.id+' GLB and thumbnail');
  const {bytes,doc}=glb(pub(r.url));
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(r.sha256);expect(bytes.length).toBe(r.bytes);
  expect(r.bytes).toBeLessThanOrEqual(plan.maxBytes);expect(r.triangles).toBeLessThanOrEqual(plan.maxTriangles);
  expect([...(doc.buffers??[]),...(doc.images??[])].some((x:{uri?:string})=>x.uri!==undefined)).toBe(false);
  expect(doc.animations??[]).toEqual([]);expect(doc.cameras??[]).toEqual([]);expect(doc.extensionsUsed??[]).toEqual([]);
  const all=positions(r.id);
  expect(Math.min(...all.map(q=>q[1]))).toBeCloseTo(0,4);
  expect(Math.abs((Math.max(...all.map(q=>q[0]))+Math.min(...all.map(q=>q[0])))/2)).toBeLessThan(1e-3);
  expect(existsSync(pub(r.thumbnail))).toBe(true);
 });
                                                                                                                                
                                                                                                                                   
              
 for(const id of ['TUN_ARCH_SHORT','TUN_TUNNEL_LONG'])it(`${id}: open end to end, no floor`,ctx=>{skipWithout(ctx,[glbOf(id)],id+' GLB');
  const all=positions(id),top=ceiling(all);
  expect(all.filter(q=>Math.abs(q[0])<0.3&&q[1]>0.02&&q[1]<top-0.1)).toEqual([]);
  expect(all.filter(q=>Math.abs(q[0])<0.3&&q[1]<0.02)).toEqual([]);
                                                                                                                                        
  const tris=triangles(id);for(const [x,y] of sightLines(top))expect(blocksLine(tris,x,y),`line at x=${x} y=${y.toFixed(2)}`).toBe(false);
  expect(span(all,2)).toBeGreaterThan(1.2);                          
                                                                                                                                    
                                                                                                     
  expect(top/span(all,1)).toBeGreaterThan(0.55);
 });
 it('布製遊戲隧道: round fabric tube, open end to end, panels between spring-wire rings, double-sided so the inside shows',ctx=>{skipWithout(ctx,[glbOf('TUN_PLAY_TUNNEL')],'TUN_PLAY_TUNNEL GLB');
  const all=positions('TUN_PLAY_TUNNEL'),fabric=positions('TUN_PLAY_TUNNEL',n=>n.startsWith('TUN_fabric_')),top=ceiling(fabric);
  expect(all.filter(q=>Math.abs(q[0])<0.3&&q[1]>0.15&&q[1]<top-0.1)).toEqual([]);
  const tris=triangles('TUN_PLAY_TUNNEL');for(const [x,y] of sightLines(top).filter(([,y])=>y>0.15))expect(blocksLine(tris,x,y),`line at x=${x} y=${y.toFixed(2)}`).toBe(false);
  expect(span(all,2)).toBeGreaterThan(2*span(all,0));
  const {doc}=glb(glbOf('TUN_PLAY_TUNNEL'));
  const fabrics=(doc.materials as {name:string;doubleSided?:boolean}[]).filter(m=>m.name.startsWith('TUN_fabric_'));
  expect(fabrics.map(m=>m.name).sort()).toEqual(['TUN_fabric_blue','TUN_fabric_green','TUN_fabric_red','TUN_fabric_yellow']);
  for(const m of fabrics)expect(m.doubleSided).toBe(true);
 });
 it('model code is deterministic',()=>{
  expect(readFileSync(join(root,'tools/assets/tunnel-v1/models.js'),'utf8')).not.toMatch(/Math\.random/);
 });
});
