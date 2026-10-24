import {DurableObject} from 'cloudflare:workers';
import type {Env,Identity} from './env';
import {Rejected} from '../../../packages/room-core/src/index';
import {tombstoneTtlMs} from './policy';
import {id} from '../../../packages/protocol/src/index';
export class SceneCoordinatorDurableObject extends DurableObject<Env> {
 private deletionRunning=false;
 private maintenanceRunning=false;
                                                                                               
                                                                                                   
 private coordinatorStorageCleared=false;
                                                                              
                                         
 private recovering=false;
 constructor(ctx:DurableObjectState,env:Env){super(ctx,env);this.initSchema();}
                                                                                                  
 private initSchema(){const ctx=this.ctx;ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS writer (id INTEGER PRIMARY KEY CHECK(id=1), room TEXT NOT NULL, fence INTEGER NOT NULL, expires INTEGER NOT NULL)');ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS scene_generation (id INTEGER PRIMARY KEY CHECK(id=1), fence INTEGER NOT NULL)');ctx.storage.sql.exec('INSERT OR IGNORE INTO scene_generation SELECT 1,COALESCE(MAX(fence),0) FROM writer');ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS scene_rooms (room_id TEXT PRIMARY KEY)');ctx.storage.sql.exec('INSERT OR IGNORE INTO scene_rooms SELECT room FROM writer');ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS deletion (id INTEGER PRIMARY KEY CHECK(id=1), clinic_id TEXT NOT NULL, scene_id TEXT NOT NULL, deleted_at INTEGER NOT NULL, status TEXT NOT NULL)');}
 async claim(roomId:string){if(await this.isDeleted())throw new Rejected('PERMISSION_DENIED');return this.ctx.storage.transactionSync(()=>{if(this.deleted())throw new Rejected('PERMISSION_DENIED');if(this.recovering)throw new Rejected('LOCKED');const old=this.ctx.storage.sql.exec<{room:string;fence:number;expires:number}>('SELECT * FROM writer WHERE id=1').toArray()[0];if(old&&old.room!==roomId)throw new Rejected('LOCKED');const expiresAt=Date.now()+15000,fence=old?.fence??this.ctx.storage.sql.exec<{fence:number}>('SELECT fence FROM scene_generation WHERE id=1').one().fence+1;this.ctx.storage.sql.exec('UPDATE scene_generation SET fence=? WHERE id=1',fence);this.ctx.storage.sql.exec('INSERT OR REPLACE INTO writer VALUES(1,?,?,?)',roomId,fence,expiresAt);this.ctx.storage.sql.exec('INSERT OR IGNORE INTO scene_rooms VALUES(?)',roomId);return {fence,expiresAt};});}
 async canPublish(roomId:string,fence:number){if(this.deleted()||await this.hasDirectoryTombstone()||this.deleted())return false;const current=this.ctx.storage.sql.exec<{fence:number}>('SELECT fence FROM scene_generation WHERE id=1').one().fence;const writer=this.ctx.storage.sql.exec<{room:string}>('SELECT room FROM writer WHERE id=1').toArray()[0];return fence===current&&(!writer||writer.room===roomId);}
 async active():Promise<string|null>{return this.ctx.storage.sql.exec<{room:string}>('SELECT room FROM writer WHERE id=1').toArray()[0]?.room??null;}
 async release(roomId:string){this.ctx.storage.sql.exec('DELETE FROM writer WHERE room=?',roomId);}
 private deleted(){return this.coordinatorStorageCleared||this.ctx.storage.sql.exec('SELECT id FROM deletion').toArray().length>0;}
 private async hasDirectoryTombstone(){
  if(!this.env.DIRECTORY){
                                                                                             
                                                   
   if(this.env.DEPLOY_ENV!==undefined)throw new Rejected('PERMISSION_DENIED');
   return false;
  }
  const name=this.ctx.id.name,separator=name?.indexOf(':')??-1;
  if(!name||separator<=0||separator===name.length-1)throw new Rejected('PERMISSION_DENIED');
  const clinicId=id.parse(name.slice(0,separator)),sceneId=id.parse(name.slice(separator+1));
  try{return !!await this.env.DIRECTORY.prepare('SELECT 1 FROM scene_tombstones WHERE clinic_id=? AND scene_id=?').bind(clinicId,sceneId).first();}
  catch(error){
                                                                                                                     
   const message=error instanceof Error?error.message:String(error);
   if(this.env.DEPLOY_ENV===undefined&&/no such table:\s*scene_tombstones/i.test(message))return false;
   throw error;
  }
 }
 async isDeleted(){if(this.deleted())return true;const tombstoned=await this.hasDirectoryTombstone();return tombstoned||this.deleted();}
                                                                 
                                                          
                                                                          
                                                                                 
                                              
                                                                             
                                                                         
 async registerSessionEnd(clinicId:string,sceneId:string,roomId:string){
  id.parse(clinicId);id.parse(sceneId);id.parse(roomId);
  this.ctx.storage.transactionSync(()=>{
   this.ctx.storage.sql.exec('INSERT OR IGNORE INTO scene_rooms VALUES(?)',roomId);
   this.ctx.storage.sql.exec("INSERT OR IGNORE INTO deletion VALUES(1,?,?,?,'PENDING')",clinicId,sceneId,Date.now());
   this.ctx.storage.sql.exec('DELETE FROM writer');
  });
  await this.ctx.storage.setAlarm(Date.now()+1);
  return {status:this.ctx.storage.sql.exec<{status:string}>('SELECT status FROM deletion WHERE id=1').toArray()[0]?.status??'PENDING'};
 }
                                                    
 async endSession(clinicId:string,sceneId:string,roomId:string){
  await this.registerSessionEnd(clinicId,sceneId,roomId);
  await this.processDeletion();
  return this.deletionResult();
 }
 private deletionResult(){const row=this.ctx.storage.sql.exec<{status:string;deleted_at:number}>('SELECT status,deleted_at FROM deletion WHERE id=1').toArray()[0];if(!row)throw new Rejected('PERMISSION_DENIED');return {status:row.status,deletedAt:row.deleted_at};}
 protected async writeDeletionMarker(row:{clinic_id:string;scene_id:string;deleted_at:number}){const marker=await this.env.DIRECTORY!.prepare('INSERT INTO scene_tombstones VALUES(?,?,?) ON CONFLICT(clinic_id,scene_id) DO NOTHING').bind(row.clinic_id,row.scene_id,row.deleted_at).run();if(!marker.success)throw new Error('SAVE_FAILED');}
                                                                                                 
                                                                                          
                                                                         
 private deletionInFlight:Promise<void>|undefined;
 async processDeletion(){
  if(this.deletionInFlight)return this.deletionInFlight;
  const run=this.runDeletion();this.deletionInFlight=run;
  try{await run;}finally{if(this.deletionInFlight===run)this.deletionInFlight=undefined;}
 }
 private async runDeletion(){
  if(this.deletionRunning)return;const row=this.ctx.storage.sql.exec<{clinic_id:string;scene_id:string;deleted_at:number;status:string}>('SELECT * FROM deletion WHERE id=1').toArray()[0];if(!row||row.status==='COMPLETE')return;
  this.deletionRunning=true;
  try{
   if(!this.env.DIRECTORY||!this.env.PRIVATE_SCENES)throw new Error('SAVE_FAILED');
   await this.writeDeletionMarker(row);
   let pending=this.maintenanceRunning;
   for(const room of this.ctx.storage.sql.exec<{room_id:string}>('SELECT room_id FROM scene_rooms').toArray()){
    const result=await this.env.ROOM_DO.getByName(room.room_id).eraseScene(row.clinic_id,row.scene_id);if(!result.complete)pending=true;
   }
   if(pending)throw new Error('SAVE_FAILED');
   const objects=await this.env.PRIVATE_SCENES.list({prefix:row.clinic_id+'/'+row.scene_id+'/',limit:1000});
   if(objects.objects.length)await this.env.PRIVATE_SCENES.delete(objects.objects.map(o=>o.key));
   if(objects.truncated)throw new Error('SAVE_FAILED');
   for(const table of ['scene_versions','scene_archive']){const result=await this.env.DIRECTORY.prepare(`DELETE FROM ${table} WHERE clinic_id=? AND scene_id=?`).bind(row.clinic_id,row.scene_id).run();if(!result.success)throw new Error('SAVE_FAILED');}
   this.ctx.storage.sql.exec("UPDATE deletion SET status='COMPLETE' WHERE id=1");
  }catch{await this.ctx.storage.setAlarm(Date.now()+5000);}
  finally{this.deletionRunning=false;}
 }
                                                                                                            
                                                                                                          
 protected prepareCoordinatorPurge(clinicId:string,sceneId:string,deletedAt:number){
  this.ctx.storage.transactionSync(()=>{
   this.ctx.storage.sql.exec('DELETE FROM writer');this.ctx.storage.sql.exec('DELETE FROM scene_rooms');
   this.ctx.storage.sql.exec('UPDATE scene_generation SET fence=0 WHERE id=1');
   this.ctx.storage.sql.exec("INSERT OR REPLACE INTO deletion VALUES(1,?,?,?,'COMPLETE')",clinicId,sceneId,deletedAt);
  });
 }
 protected async deleteCoordinatorStorage(){await this.ctx.storage.deleteAll();this.coordinatorStorageCleared=true;}
                                                                                                            
 private preservePurgeMarker(clinicId:string,sceneId:string,deletedAt:number){
  this.initSchema();this.ctx.storage.transactionSync(()=>this.ctx.storage.sql.exec("INSERT OR REPLACE INTO deletion VALUES(1,?,?,?,'COMPLETE')",clinicId,sceneId,deletedAt));
 }
 protected async readPurgeTombstone(clinicId:string,sceneId:string){
  return this.env.DIRECTORY!.prepare('SELECT deleted_at FROM scene_tombstones WHERE clinic_id=? AND scene_id=?').bind(clinicId,sceneId).first<{deleted_at:number}>();
 }
 protected async deletePurgeTombstone(clinicId:string,sceneId:string,deletedAt:number,ttlMs:number,now:number){
  return this.env.DIRECTORY!.prepare('DELETE FROM scene_tombstones WHERE clinic_id=? AND scene_id=? AND deleted_at=? AND deleted_at+?<=?').bind(clinicId,sceneId,deletedAt,ttlMs,now).run();
 }
 async purgeTombstone(clinicId:string,sceneId:string):Promise<{purged:boolean;reason?:string}>{
  id.parse(clinicId);id.parse(sceneId);const ttlMs=tombstoneTtlMs(this.env);
  if(this.deletionRunning||this.maintenanceRunning||this.recovering)return {purged:false,reason:'BUSY'};
                                                                                          
                                                                                        
  this.maintenanceRunning=true;
  let deletedAt:number|undefined;
  try{
   if(!this.env.DIRECTORY)throw new Error('SAVE_FAILED');
   const marker=await this.readPurgeTombstone(clinicId,sceneId);
   if(!marker)return {purged:false,reason:'NO_TOMBSTONE'};
   deletedAt=marker.deleted_at;
   if(marker.deleted_at+ttlMs>Date.now())return {purged:false,reason:'RETAINED'};
                                                                                                     
                                                                                                      
                                                                                                    
   this.initSchema();this.coordinatorStorageCleared=false;
   const local=this.ctx.storage.sql.exec<{clinic_id:string;scene_id:string;status:string}>('SELECT clinic_id,scene_id,status FROM deletion WHERE id=1').toArray()[0];
   if(local&&(local.clinic_id!==clinicId||local.scene_id!==sceneId))return {purged:false,reason:'KEY_MISMATCH'};
   if(local&&local.status!=='COMPLETE')return {purged:false,reason:'DELETION_PENDING'};
   for(const table of ['scene_versions','scene_archive']){const rows=await this.env.DIRECTORY.prepare(`SELECT 1 FROM ${table} WHERE clinic_id=? AND scene_id=? LIMIT 1`).bind(clinicId,sceneId).first();if(rows)return {purged:false,reason:'ROWS_REMAIN'};}
   const objects=await this.env.PRIVATE_SCENES!.list({prefix:clinicId+'/'+sceneId+'/',limit:1});
   if(objects.objects.length)return {purged:false,reason:'OBJECTS_REMAIN'};
                                                                                                
                                                                                                  
   await this.ctx.storage.setAlarm(Date.now()+5000);
                                                                                                              
   for(const room of this.ctx.storage.sql.exec<{room_id:string}>('SELECT room_id FROM scene_rooms').toArray()){
    const result=await this.env.ROOM_DO.getByName(room.room_id).purgeErasure(clinicId,sceneId);
    if(!result.purged)return {purged:false,reason:'ROOM_'+(result.reason??'BUSY')};
   }
                                                                                                      
                                                                                             
   this.prepareCoordinatorPurge(clinicId,sceneId,deletedAt);
   await this.deleteCoordinatorStorage();
   const removed=await this.deletePurgeTombstone(clinicId,sceneId,deletedAt,ttlMs,Date.now());
   if(!removed.success)throw new Error('SAVE_FAILED');
   if(removed.meta.changes!==1)return {purged:false,reason:'MARKER_CHANGED'};
                                                                                                        
                                                                                                      
   return {purged:true};
  }catch(error){
   if(!this.coordinatorStorageCleared){
    try{if(deletedAt!==undefined)this.preservePurgeMarker(clinicId,sceneId,deletedAt);await this.ctx.storage.setAlarm(Date.now()+5000);}catch{/* D1 marker remains the independent retry index. */}
   }
   throw error;
  }finally{this.maintenanceRunning=false;}
 }
 async alarm(){
  if(this.coordinatorStorageCleared)return;
  const complete=this.ctx.storage.sql.exec<{clinic_id:string;scene_id:string;deleted_at:number;status:string}>('SELECT * FROM deletion WHERE id=1').toArray()[0];
  if(complete?.status==='COMPLETE'){
   try{
    if(!this.env.DIRECTORY&&this.env.DEPLOY_ENV!==undefined)throw new Error('DIRECTORY binding required for tombstone recovery');
    const marker=await this.env.DIRECTORY?.prepare('SELECT deleted_at FROM scene_tombstones WHERE clinic_id=? AND scene_id=?').bind(complete.clinic_id,complete.scene_id).first<{deleted_at:number}>();
    if(this.coordinatorStorageCleared)return;
    if(!marker){await this.deleteCoordinatorStorage();return;}
    const ttlMs=tombstoneTtlMs(this.env);
    if(marker.deleted_at+ttlMs<=Date.now()){
     const result=await this.purgeTombstone(complete.clinic_id,complete.scene_id);
     if(!this.coordinatorStorageCleared&&!result.purged&&result.reason!=='RETAINED')await this.ctx.storage.setAlarm(Date.now()+5000);
    }
   }catch{if(!this.coordinatorStorageCleared)await this.ctx.storage.setAlarm(Date.now()+5000);}
   return;
  }
                                                                            
  await this.processDeletion();
 }
}

