import {describe,it,expect} from 'vitest';
import {devAssets,pinnedModels,validAssetVersion,resolveAsset,provenanceIssues,modelUrlFor} from '../packages/asset-catalog/src/index';
import {resolvePrivateModel} from '../apps/worker/src/asset-delivery';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {staticLoginRequired} from '../apps/worker/src/static-gate';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {Vector3} from 'three';
import {modelBounds} from '../apps/web/src/model-size';
describe('public catalog profile',()=>{
 it('has 270 CC0 objects, 16 garden dependencies, two project cloths and four current DEV_ONLY practice objects',()=>{
  expect(devAssets.filter(a=>a.provenance.license==='CC0-1.0')).toHaveLength(286);
  expect(devAssets.filter(a=>a.provenance.license==='PROJECT-OWN').map(a=>a.id).sort()).toEqual(['CLT_LONG_CLOTH','CLT_SQUARE_CLOTH']);
  expect(devAssets.filter(a=>a.provenance.license==='DEV_ONLY')).toHaveLength(4);
  expect(devAssets).toHaveLength(292);
 });
 it('can load every displayed asset and thumbnail without external files',()=>{
  for(const a of devAssets){expect(existsSync('apps/web/public'+a.url),a.id).toBe(true);expect(provenanceIssues(a),a.id).toEqual([]);expect(validAssetVersion(a.id,a.version)).toBe(true);
   if(a.thumbnail)expect(existsSync('apps/web/public'+a.thumbnail)).toBe(true);
  }
 });
 it('keeps content hashes and authorized model routes aligned for every public model',()=>{
  for(const m of pinnedModels){const a=resolveAsset(m.id,m.version)!;expect(['CC0-1.0','PROJECT-OWN']).toContain(a.provenance.license);expect(m.privateSource).toBeUndefined();
   const bytes=readFileSync('apps/web/public'+m.url);expect(bytes.length).toBe(m.bytes);expect(createHash('sha256').update(bytes).digest('hex')).toBe(m.sha256);
   expect(resolvePrivateModel(m.id,m.version)?.sha256).toBe(m.sha256);expect(modelUrlFor(a,'room')).toContain('/api/assets/');
  }
 });
 it('does not allow absent private catalog models to be created',()=>{
  expect(validAssetVersion('ANIMAL_HORSE','animals-v2')).toBe(false);
  expect(validAssetVersion('missing','missing')).toBe(false);
 });
 it('offers corresponding source without opening model download authorization',()=>{
  for(const path of ['/source.html','/source-code.zip'])expect(staticLoginRequired({DEPLOY_ENV:'production'},path)).toBe(false);
  for(const path of ['/source-code.zip/evil','/%73ource.html','/imported-assets/test.glb','/dev-assets/rock.glb'])expect(staticLoginRequired({DEPLOY_ENV:'production'},path)).toBe(true);
 });
 it('preserves posed bounds for a shipped public skinned model',async()=>{
  const a=resolveAsset('IMP_ULTIMATE_Casual_Female')!,b=readFileSync('apps/web/public'+a.url);
  const gltf=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
  const size=modelBounds(clone(gltf.scene)).getSize(new Vector3());expect(Math.max(size.x,size.y,size.z)).toBeCloseTo(3.048,2);
 });
});
