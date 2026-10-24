import type {Env} from './env';
import {tombstoneTtlMs} from './policy';
                                                                                      
                                                                   
                      

                                                                                           
                                                                                           
                                                                                             
                                                                                              
export async function purgeExpiredTombstones(env:Env){
 const ttlMs=tombstoneTtlMs(env);
 let clinic='',scene='',failed=0,purged=0,skipped=0;
 for(;;){
  const page=await env.DIRECTORY!.prepare('SELECT clinic_id,scene_id FROM scene_tombstones WHERE deleted_at+?<=? AND (clinic_id>? OR (clinic_id=? AND scene_id>?)) ORDER BY clinic_id,scene_id LIMIT 50').bind(ttlMs,Date.now(),clinic,clinic,scene).all<{clinic_id:string;scene_id:string}>();
  if(!page.success)throw new Error('SAVE_FAILED');
  if(!page.results.length)break;
  for(const row of page.results){
   try{const result=await env.SCENE_COORDINATOR_DO.getByName(row.clinic_id+':'+row.scene_id).purgeTombstone(row.clinic_id,row.scene_id);if(result.purged)purged++;else skipped++;}
   catch{failed++;}
  }
  const last=page.results[page.results.length-1];clinic=last.clinic_id;scene=last.scene_id;
 }
 if(failed)throw new Error('SAVE_FAILED');
 return {purged,skipped};
}
