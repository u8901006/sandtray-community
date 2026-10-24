import {AdmissionRoom,type RoomRecord} from './room';
import type {Env,Identity} from './env';
import {json,error,isInputError} from './http';
import {parseInbound,validTransform,hasV2Capability,offersWsSubprotocol,WS_SUBPROTOCOL,type Action} from '../../../packages/protocol/src/index';
import {acquireLease,reduceTransform,authorizeTransform,revokeAll,clientPresence,Rejected,type Connection} from '../../../packages/room-core/src/index';
import {issueGrant,revokeGrant} from '../../../packages/room-core/src/grant-lifecycle';
import {pathPosition} from '../../../packages/room-core/src/animation';
import {devAssets,validAssetVersion,clipDuration,supportsColorVariants} from '../../../packages/asset-catalog/src/index';
import {parseInboundFrame,recoverRejectedOperationId,type FrameBudget} from './ws-frame-budget';
import {TRAYS_TABLE,TRAY_HISTORY_TABLE,readTrays,writeTray,strokeTray,quantizeWater,recordTrayStep,trayStepStates,type TrayRow} from './trays';
import {bytesToBase64,base64ToBytes} from '../../../packages/sand-engine/src/core';
import {objectInTray} from '../../../packages/room-core/src/index';
                                                                                                                                                              
const OPERATIONS_LOOKUP_INDEX='CREATE INDEX IF NOT EXISTS operations_actor_op ON operations(actor,op,epoch)';
interface Attachment extends FrameBudget {hash:string;identity:Identity;connectionId:string;epoch:number}
interface PendingRequest {objectId:string;participantId:string;actions:Action[];expiresAt:number}
                                                                                                                                          
interface SharedState extends RoomRecord {requests?:Record<string,PendingRequest>;historyCursor?:number;historyGesture?:string;animationDeadlines?:Record<string,number>}
export class RoomDurableObject extends AdmissionRoom {
 constructor(ctx:DurableObjectState,env:Env){super(ctx,env);ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS operations (actor TEXT NOT NULL, epoch INTEGER NOT NULL, op TEXT NOT NULL, command TEXT NOT NULL, ack TEXT NOT NULL, PRIMARY KEY(actor,epoch,op))');ctx.storage.sql.exec(OPERATIONS_LOOKUP_INDEX);ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS history (step INTEGER PRIMARY KEY, before_state TEXT NOT NULL, after_state TEXT NOT NULL)');ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS room_cleanup (room_id TEXT PRIMARY KEY, clinic_id TEXT NOT NULL, scene_id TEXT NOT NULL, next_at INTEGER NOT NULL)');}
 private stopAnimations(s:RoomRecord,predicate:(o:RoomRecord['objects'][string])=>boolean,now:number){let changed=false;for(const o of Object.values(s.objects)){const a=o.animation;if(!a||a.state!=='playing'||!predicate(o))continue;const at=s.participants[a.initiatedBy]?.role==='therapist'?Math.max(a.serverStartedAt,Math.min(now,s.clientLiveUntil,(s as SharedState).animationDeadlines?.[o.id]??now)):now;const position=pathPosition(a,at);if(position)o.transform.position=position;a.offsetMs+=Math.max(0,at-a.serverStartedAt)*a.speed;a.state='stopped';o.revision++;changed=true;}if(changed)s.sceneRevision++;return changed;}
 private enforceAnimations(s:RoomRecord,now:number){return this.stopAnimations(s,o=>{const a=o.animation!;const grant=Object.values(s.grants).find(g=>g.active&&g.objectId===o.id&&g.participantId===a.initiatedBy&&g.actions.includes('animate'));return (!a.loop&&(a.path?.durationMs??clipDuration(o.assetId,a.clipId,o.assetVersion))!==undefined&&a.offsetMs+Math.max(0,now-a.serverStartedAt)*a.speed>=(a.path?.durationMs??clipDuration(o.assetId,a.clipId,o.assetVersion)!))||(s.participants[a.initiatedBy]?.role==='therapist'&&(!grant||grant.expiresAt<=now||s.clientLiveUntil<=now));},now);}
 protected async schedule(s:RoomRecord){const now=Date.now();let at=Math.min(s.lastActivity+7200000,this.cleanupDue());for(const o of Object.values(s.objects)){const a=o.animation;if(a?.state!=='playing')continue;const duration=a.path?.durationMs??clipDuration(o.assetId,a.clipId,o.assetVersion);if(!a.loop&&duration!==undefined)at=Math.min(at,a.serverStartedAt+(duration-a.offsetMs)/a.speed);if(s.participants[a.initiatedBy]?.role==='therapist'){at=Math.min(at,s.clientLiveUntil);for(const g of Object.values(s.grants))if(g.active&&g.objectId===o.id&&g.participantId===a.initiatedBy)at=Math.min(at,g.expiresAt);}}await this.ctx.storage.setAlarm(Math.max(now+1,at));}
 private message(s:RoomRecord,type:string,fields:Record<string,unknown>={}){return {protocolVersion:1,type,sessionEpoch:s.sessionEpoch,serverSeq:s.serverSeq,...fields};}
 private broadcast(value:unknown){const text=JSON.stringify(value);for(const ws of this.ctx.getWebSockets()){try{ws.send(text);}catch{/* closed transport; close callback clears authority */}}}
 private snapshotEvent(s:RoomRecord){return this.message(s,'room.snapshot',{snapshotPath:`/api/rooms/${s.roomId}/snapshot`,controlEpoch:s.controlEpoch});}
 private grantEvent(s:RoomRecord,grantId:string){const g=s.grants[grantId];return this.message(s,'permission.changed',{controlEpoch:s.controlEpoch,grant:{grantId:g.id,roomId:s.roomId,sessionEpoch:g.sessionEpoch,objectId:g.objectId,therapistParticipantId:g.participantId,actions:g.actions,issuedAt:0,expiresAt:g.expiresAt,grantVersion:g.version,status:g.active?'ACTIVE':'REVOKED'}});}
 private lockEvent(s:RoomRecord,objectId:string){const l=s.leases[objectId];return this.message(s,'lock.changed',{objectId,lease:l?{leaseId:l.id,objectId,participantId:l.participantId,sessionEpoch:l.sessionEpoch,controlEpoch:l.controlEpoch,fencingToken:l.fence,expiresAt:l.expiresAt}:null});}
 async fetch(request:Request):Promise<Response>{
  try{
   const hash=request.headers.get('X-Session-Hash');if(!hash)return error();
                                                                                                     
   if(!hasV2Capability(request.headers))return error('UPGRADE_REQUIRED',426);
   const identity=await this.env.AUTH_DO.getByName('sessions').lookup(hash);if(!identity)return error();
   const room=this.read();if(!await this.env.AUTH_DO.getByName('sessions').attachRoom(hash,room.roomId))return error();
   const s=this.read();this.member(s,identity);const oldId=s.connections[identity.participantId];
   const oldSocket=this.ctx.getWebSockets().find(ws=>(ws.deserializeAttachment() as Attachment)?.connectionId===oldId);
   if(oldSocket&&new URL(request.url).searchParams.get('takeover')!=='1')return error('ROOM_FULL',409);
   this.stopAnimations(s,()=>true,Date.now());delete s.exportConsent;s.sessionEpoch++;s.controlEpoch++;s.grants={};s.leases={};(s as SharedState).requests={};s.serverSeq++;s.lastActivity=Date.now();
                                                                                                                     
                                                                                                                            
                                                                   
   for(const p of Object.values(s.participants))p.sessionEpoch=s.sessionEpoch;
   const pair=new WebSocketPair();const connectionId=crypto.randomUUID();s.connections[identity.participantId]=connectionId;
   s.clientLiveUntil=clientPresence(s.clientLiveUntil,identity.role,'connect',Date.now());
   this.save(s);this.ctx.acceptWebSocket(pair[1]);
   pair[1].serializeAttachment({hash,identity,connectionId,epoch:s.sessionEpoch,window:Date.now(),normal:0,priority:0,commits:0,previews:0,invalidFrames:0} satisfies Attachment);
   for(const ws of this.ctx.getWebSockets()){if(ws===oldSocket)continue;const a=ws.deserializeAttachment() as Attachment;a.epoch=s.sessionEpoch;ws.serializeAttachment(a);}
   if(oldSocket)oldSocket.close(4001,'SEAT_TAKEN_OVER');
   this.broadcast(this.snapshotEvent(s));await this.schedule(s);return new Response(null,{status:101,webSocket:pair[0],...(offersWsSubprotocol(request.headers)?{headers:{'Sec-WebSocket-Protocol':WS_SUBPROTOCOL}}:{})});
  }catch{return error('PERMISSION_DENIED',403);}
 }
 async webSocketMessage(ws:WebSocket,raw:string|ArrayBuffer){
  let cmd:any;let s:SharedState|undefined;let a:Attachment|undefined;const receivedAt=Date.now();let acked=false;
  try{
   a=ws.deserializeAttachment() as Attachment;cmd=parseInboundFrame(raw,a,Date.now(),parseInbound);const now=Date.now();
   const priority=cmd.type==='control.revokeAll'||cmd.type==='permission.revoke'||cmd.type==='animation.stopAll';
   let limited=priority?++a.priority>10:++a.normal>60;
   if(cmd.type==='object.transform.preview')limited=++a.previews>15||limited;
   if(['object.create','object.delete','object.transform.commit','object.appearance.commit','animation.set','sand.stroke','tray.water'].includes(cmd.type))limited=++a.commits>10||limited;
   ws.serializeAttachment(a);if(limited)throw new Rejected('RATE_LIMITED',Math.max(1,a.window+1000-now));
   const identity=await this.env.AUTH_DO.getByName('sessions').lookup(a.hash);if(!identity){ws.close(4003,'UNAUTHENTICATED');throw new Rejected('UNAUTHENTICATED');}
   await this.assertAvailable();s=this.read();this.member(s,identity);
   if(s.connections[identity.participantId]!==a.connectionId)throw new Rejected('STALE_EPOCH');
   if(a.epoch!==s.sessionEpoch)throw new Rejected('STALE_EPOCH');
                                                                                                   
                                                                                                     
   const prior=this.ctx.storage.sql.exec<{command:string;ack:string}>('SELECT command,ack FROM operations WHERE actor=? AND op=? ORDER BY epoch LIMIT 1',identity.participantId,cmd.operationId).toArray()[0];
   if(prior){if(prior.command!==JSON.stringify(cmd))throw new Rejected('INVALID_PAYLOAD');ws.send(prior.ack);return;}
   if(cmd.sessionEpoch!==s.sessionEpoch||cmd.controlEpoch!==s.controlEpoch)throw new Rejected('STALE_EPOCH');
   if(s.writerLeaseUntil<=now+5000){const writer=await this.env.SCENE_COORDINATOR_DO.getByName(s.clinicId+':'+s.sceneId).claim(s.roomId);s=this.read();if(a.epoch!==s.sessionEpoch||s.connections[identity.participantId]!==a.connectionId||cmd.controlEpoch!==s.controlEpoch)throw new Rejected('STALE_EPOCH');s.writerLeaseUntil=writer.expiresAt;}
                                                                                    
   const connection:Connection={participantId:identity.participantId,clinicId:identity.clinicId,sessionEpoch:s.sessionEpoch};
   if(s.clientLiveUntil<=Date.now()&&Object.values(s.grants).some(g=>g.active)){for(const g of Object.values(s.grants)){g.active=false;g.version++;}s.leases={};this.save(s);this.broadcast(this.message(s,'permission.changed',{controlEpoch:s.controlEpoch,grant:null}));}
   if(this.enforceAnimations(s,Date.now())){this.save(s);this.broadcast(this.snapshotEvent(s));}
   const beforeObjects=JSON.stringify(s.objects);const events:unknown[]=[];let changed=false;let ephemeral=false;let historyMove=false;let trayWrite:TrayRow|undefined;let trayHistory:{before:{data:string;water:number};gesture?:string}|undefined;const restoredTrays:TrayRow[]=[];
   const client=()=>{if(identity.role!=='client')throw new Rejected('PERMISSION_DENIED');};
   const object=()=>{if(!Object.hasOwn(s!.objects,cmd.objectId))throw new Rejected('PERMISSION_DENIED');return s!.objects[cmd.objectId];};
   const revision=()=>{if(object().revision!==cmd.expectedObjectRevision)throw new Rejected('REVISION_CONFLICT');};
   switch(cmd.type){
    case 'room.hello':case 'sync.request':events.push(this.snapshotEvent(s));ephemeral=true;break;
    case 'presence.heartbeat':s.clientLiveUntil=clientPresence(s.clientLiveUntil,identity.role,'heartbeat',Date.now());ephemeral=true;break;
    case 'scene.undo':case 'scene.redo':{
     client();if(cmd.expectedSceneRevision!==s.sceneRevision)throw new Rejected('REVISION_CONFLICT');
     const cursor=s.historyCursor??0;const step=cmd.type==='scene.undo'?cursor:cursor+1;
     const row=this.ctx.storage.sql.exec<{before_state:string;after_state:string}>('SELECT before_state,after_state FROM history WHERE step=?',step).toArray()[0];if(!row)throw new Rejected('REVISION_CONFLICT');
     const restored=JSON.parse(cmd.type==='scene.undo'?row.before_state:row.after_state) as RoomRecord['objects'];
     for(const object of Object.values(restored)){object.revision=(s.objects[object.id]?.revision??object.revision)+1;if(object.animation)object.animation.state='stopped';}
                                                                                                                                
                                                                                                             
     const current=readTrays(this.ctx.storage.sql,s.trays);
     for(const state of trayStepStates(this.ctx.storage.sql,step,cmd.type==='scene.undo'?'before':'after')){const tray=current.find(t=>t.id===state.id);if(!tray)continue;tray.hm.data.set(base64ToBytes(state.data));tray.water=state.water;tray.revision++;restoredTrays.push(tray);}
     s.objects=restored;s.historyCursor=cmd.type==='scene.undo'?cursor-1:cursor+1;delete s.historyGesture;s.grants={};s.leases={};s.controlEpoch++;s.requests={};changed=true;historyMove=true;events.push(this.snapshotEvent(s));break;
    }
    case 'object.create':{
     client();if(Object.hasOwn(s.objects,cmd.objectId)||Object.keys(s.objects).length>=100)throw new Rejected('INVALID_PAYLOAD');
     if(!objectInTray(s,cmd.trayId,cmd.transform.position))throw new Rejected('INVALID_PAYLOAD');
     if(!validAssetVersion(cmd.assetId,cmd.assetVersion))throw new Rejected('INVALID_PAYLOAD');
     if(['__proto__','constructor','prototype'].includes(cmd.objectId))throw new Rejected('INVALID_PAYLOAD');
     if(cmd.colorVariant!==undefined&&!supportsColorVariants(cmd.assetId,cmd.assetVersion))throw new Rejected('INVALID_PAYLOAD');
     const colorVariant=cmd.colorVariant??(supportsColorVariants(cmd.assetId,cmd.assetVersion)?'t2':undefined);
     s.objects[cmd.objectId]={id:cmd.objectId,assetId:cmd.assetId,assetVersion:cmd.assetVersion,transform:cmd.transform,materialOverrides:{},...(colorVariant?{colorVariant}:{}),hidden:false,revision:0,trayId:cmd.trayId??'dry'};changed=true;break;
    }
    case 'object.delete':client();revision();delete s.objects[cmd.objectId];delete s.leases[cmd.objectId];for(const g of Object.values(s.grants)){if(g.objectId===cmd.objectId){g.active=false;g.version++;}}changed=true;break;
    case 'object.transform.commit':s=reduceTransform(s,connection,cmd,Date.now()) as SharedState;if(s.objects[cmd.objectId].animation)s.objects[cmd.objectId].animation!.state='stopped';changed=true;break;
    case 'object.appearance.commit':{
     client();const o=object();revision();
     if(cmd.colorVariant!==undefined&&!supportsColorVariants(o.assetId,o.assetVersion))throw new Rejected('INVALID_PAYLOAD');
     const nextVariant=cmd.colorVariant??o.colorVariant;
                                                                                
                                                                             
                                                                      
     const overridesChanged=JSON.stringify(o.materialOverrides??{})!==JSON.stringify(cmd.materialOverrides);
     const hiddenChanged=o.hidden!==cmd.hidden;
     if(overridesChanged||hiddenChanged)throw new Rejected('INVALID_PAYLOAD');
     if(o.colorVariant!==nextVariant){if(nextVariant===undefined)delete o.colorVariant;else o.colorVariant=nextVariant;o.revision++;changed=true;}
     break;
    }
    case 'object.transform.preview':{
     const candidate={...cmd,type:'object.transform.commit',expectedObjectRevision:object().revision};authorizeTransform(s,connection,candidate,Date.now());
     this.broadcast(this.message(s,'object.preview',{objectId:cmd.objectId,transform:cmd.transform,participantId:identity.participantId,fencingToken:cmd.fencingToken}));return;
    }
    case 'object.lock.acquire':{
     object();if(identity.role==='client'&&s.leases[cmd.objectId]?.participantId!==identity.participantId){for(const g of Object.values(s.grants)){if(g.objectId===cmd.objectId&&g.active){this.stopAnimations(s,o=>o.id===cmd.objectId&&o.animation?.initiatedBy===g.participantId,Date.now());s=revokeGrant(s,connection,cmd.objectId,g.id) as SharedState;events.push(this.grantEvent(s,g.id));}}}
     s=acquireLease(s,connection,cmd.objectId,cmd.actions,Date.now(),crypto.randomUUID(),cmd.grantId,cmd.grantVersion) as SharedState;
     s.leases[cmd.objectId].expiresAt=Math.min(s.leases[cmd.objectId].expiresAt,Date.now()+3000);events.push(this.lockEvent(s,cmd.objectId));break;
    }
    case 'object.lock.release':case 'object.lock.renew':{
     const l=s.leases[cmd.objectId];if(!l||l.id!==cmd.leaseId||l.participantId!==identity.participantId||l.fence!==cmd.fencingToken||l.expiresAt<=Date.now())throw new Rejected('STALE_FENCE');
     if(cmd.type==='object.lock.release')delete s.leases[cmd.objectId];else {authorizeTransform(s,connection,{...cmd,type:'object.transform.commit',expectedObjectRevision:object().revision,transform:object().transform},Date.now());l.expiresAt=Math.min(Date.now()+3000,s.writerLeaseUntil,identity.role==='therapist'?s.clientLiveUntil:Infinity);}
     events.push(this.lockEvent(s,cmd.objectId));break;
    }
    case 'animation.set':{
     const o=object();revision();authorizeTransform(s,connection,{protocolVersion:1,type:'object.transform.commit',operationId:cmd.operationId,sessionEpoch:cmd.sessionEpoch,controlEpoch:cmd.controlEpoch,objectId:cmd.objectId,leaseId:cmd.leaseId,fencingToken:cmd.fencingToken,grantId:cmd.grantId,grantVersion:cmd.grantVersion,expectedObjectRevision:o.revision,transform:o.transform},Date.now());
     if(identity.role==='therapist'&&!s.grants[cmd.grantId]?.actions.includes('animate'))throw new Rejected('PERMISSION_DENIED');
     if(cmd.clipId==='path'?!cmd.path:(!clipDuration(o.assetId,cmd.clipId,o.assetVersion)||cmd.path!==undefined))throw new Rejected('INVALID_PAYLOAD');
     if(cmd.path?.points.some((point:number[])=>!objectInTray(s!,o.trayId,point)))throw new Rejected('INVALID_PAYLOAD');
     if(cmd.state==='playing'&&o.animation?.state!=='playing'&&Object.values(s.objects).filter(o=>o.animation?.state==='playing').length>=5)throw new Rejected('RATE_LIMITED');
     s.animationDeadlines??={};s.animationDeadlines[o.id]=identity.role==='therapist'?s.grants[cmd.grantId].expiresAt:Number.MAX_SAFE_INTEGER;
     o.animation={clipId:cmd.clipId,state:cmd.state,serverStartedAt:Date.now(),offsetMs:cmd.offsetMs,speed:cmd.speed,loop:cmd.loop,initiatedBy:identity.participantId,path:cmd.path};o.revision++;changed=true;break;
    }
    case 'sand.stroke':case 'tray.water':{
                                                                                                                              
                                                                                                                  
     client();
     const tray=readTrays(this.ctx.storage.sql,s.trays).find(t=>t.id===cmd.trayId)!;
     trayHistory={before:{data:bytesToBase64(tray.hm.data),water:tray.water},...(cmd.gestureId?{gesture:identity.participantId+':'+tray.id+':'+cmd.type+':'+cmd.gestureId}:{})};
     if(cmd.type==='tray.water'){const level=quantizeWater(cmd.level);if(level===tray.water)throw new Rejected('INVALID_PAYLOAD');tray.water=level;}
     else {if(cmd.points.some(([i,j]:[number,number])=>i>=tray.hm.w||j>=tray.hm.h||!tray.hm.mask[j*tray.hm.w+i]))throw new Rejected('INVALID_PAYLOAD');strokeTray(tray.hm,cmd.tool,cmd.points);}
     tray.revision++;s.sceneRevision++;trayWrite=tray;
     events.push(this.message(s,'tray.changed',{trayId:tray.id,trayRevision:tray.revision,sceneRevision:s.sceneRevision,operationId:cmd.operationId,...(cmd.type==='sand.stroke'?{stroke:{tool:cmd.tool,points:cmd.points}}:{}),waterLevel:tray.water}));break;
    }
    case 'animation.stopAll':client();this.stopAnimations(s,()=>true,Date.now());s.controlEpoch++;s.leases={};events.push(this.snapshotEvent(s));break;
    case 'permission.request':{
     if(identity.role!=='therapist')throw new Rejected('PERMISSION_DENIED');object();s.requests??={};if(Object.keys(s.requests).length>=100)throw new Rejected('RATE_LIMITED');
     if(['__proto__','constructor','prototype'].includes(cmd.operationId))throw new Rejected('INVALID_PAYLOAD');
     s.requests[cmd.operationId]={objectId:cmd.objectId,participantId:identity.participantId,actions:cmd.actions,expiresAt:Date.now()+300000};
     events.push(this.message(s,'permission.requested',{requestId:cmd.operationId,objectId:cmd.objectId,actions:cmd.actions,participantId:identity.participantId}));break;
    }
    case 'permission.grant':{
     client();const r=s.requests&&Object.hasOwn(s.requests,cmd.requestId)?s.requests[cmd.requestId]:undefined;if(!r||r.objectId!==cmd.objectId||r.expiresAt<=Date.now()||cmd.actions.some((a:Action)=>!r.actions.includes(a)))throw new Rejected('PERMISSION_DENIED');
     const grantId=crypto.randomUUID();this.stopAnimations(s,o=>o.id===r.objectId&&o.animation?.initiatedBy===r.participantId,Date.now());s=issueGrant(s,connection,{objectId:r.objectId,participantId:r.participantId,actions:cmd.actions,durationMs:cmd.durationMs},Date.now(),grantId) as SharedState;delete s.requests![cmd.requestId];events.push(this.grantEvent(s,grantId));break;
    }
    case 'permission.reject':client();if(s.requests)delete s.requests[cmd.requestId];break;
    case 'permission.revoke':client();this.stopAnimations(s,o=>o.id===cmd.objectId&&o.animation?.initiatedBy!==identity.participantId,Date.now());s=revokeGrant(s,connection,cmd.objectId,cmd.grantId) as SharedState;events.push(this.grantEvent(s,cmd.grantId),this.lockEvent(s,cmd.objectId));break;
    case 'control.revokeAll':client();this.stopAnimations(s,o=>o.animation?.initiatedBy!==identity.participantId,Date.now());s=revokeAll(s,connection) as SharedState;s.requests={};events.push(this.message(s,'permission.changed',{controlEpoch:s.controlEpoch,grant:null}));break;
    default:throw new Rejected('INVALID_PAYLOAD');
   }
   if(changed&&cmd.type!=='object.transform.commit')s.sceneRevision++;
                                                                                                                           
                                                                                                                         
   s.serverSeq++;if(!ephemeral)s.lastActivity=Date.now();
   if(changed)events.push(this.message(s,'scene.patch',{sceneRevision:s.sceneRevision,upserts:s.objects[cmd.objectId]?[s.objects[cmd.objectId]]:[],deletedIds:cmd.type==='object.delete'?[cmd.objectId]:[]}));
                                                                                                                         
   const ack=this.message(s,'operation.ack',{operationId:cmd.operationId,sceneRevision:s.sceneRevision,...(cmd.objectId&&s.objects[cmd.objectId]?{objectRevision:s.objects[cmd.objectId].revision}:{}),serverMs:Math.max(0,Date.now()-receivedAt)});
   const committed=s;this.ctx.storage.transactionSync(()=>{
    const sql=this.ctx.storage.sql;
    const newStep=(objectsBefore:string)=>{const step=(committed.historyCursor??0)+1;for(const table of ['history','tray_history'])sql.exec(`DELETE FROM ${table} WHERE step>=?`,step);sql.exec('INSERT INTO history VALUES(?,?,?)',step,objectsBefore,JSON.stringify(committed.objects));committed.historyCursor=step;for(const table of ['history','tray_history'])sql.exec(`DELETE FROM ${table} WHERE step<?`,step-99);return step;};
    if(changed&&!historyMove){newStep(beforeObjects);delete committed.historyGesture;}
                                                                                                          
    if(trayWrite&&trayHistory){const merge=trayHistory.gesture!==undefined&&committed.historyGesture===trayHistory.gesture&&(committed.historyCursor??0)>0;const step=merge?committed.historyCursor!:newStep(JSON.stringify(committed.objects));recordTrayStep(sql,step,trayHistory.before,trayWrite);if(trayHistory.gesture)committed.historyGesture=trayHistory.gesture;else delete committed.historyGesture;}
    this.save(committed);if(trayWrite)writeTray(sql,trayWrite);for(const tray of restoredTrays)writeTray(sql,tray);if(!ephemeral)this.ctx.storage.sql.exec('INSERT INTO operations VALUES(?,?,?,?,?)',identity.participantId,committed.sessionEpoch,cmd.operationId,JSON.stringify(cmd),JSON.stringify(ack));});
                                                                                    
   for(const event of events)this.broadcast({...event as object,serverSeq:s.serverSeq,sessionEpoch:s.sessionEpoch});ws.send(JSON.stringify(ack));acked=true;await this.schedule(s);
  }catch(cause){
                                                                                                                                                 
   if(acked){console.error(JSON.stringify({event:'ws_post_ack_exception',type:typeof cmd?.type==='string'?cmd.type:null,name:cause instanceof Error?cause.name:typeof cause,message:(cause instanceof Error?cause.message:String(cause)).slice(0,200)}));return;}
   const blockedBeforeParse=cmd===undefined&&cause instanceof Rejected&&cause.code==='RATE_LIMITED';
   if(a&&cmd===undefined&&!blockedBeforeParse){try{ws.serializeAttachment(a);}catch{/* disconnected */}}
                                                                                                                                    
                                                                                                                              
   if(!(cause instanceof Rejected)&&!isInputError(cause))console.error(JSON.stringify({event:'ws_unexpected_exception',type:typeof cmd?.type==='string'?cmd.type:null,name:cause instanceof Error?cause.name:typeof cause,message:(cause instanceof Error?cause.message:String(cause)).slice(0,200)}));
   const code=cause instanceof Rejected?cause.code:isInputError(cause)?'INVALID_PAYLOAD':'SAVE_FAILED';
   let operationId=cmd?.operationId as string|undefined;
                                                                                                           
   if(operationId===undefined)operationId=recoverRejectedOperationId(raw,blockedBeforeParse);
                                                                                                                                                     
   const retryAfterMs=cause instanceof Rejected&&cause.code==='RATE_LIMITED'&&typeof cause.retryAfterMs==='number'?{retryAfterMs:cause.retryAfterMs}:{};
   try{ws.send(JSON.stringify({protocolVersion:1,type:'operation.rejected',sessionEpoch:s?.sessionEpoch??0,serverSeq:s?.serverSeq??0,operationId:operationId??'invalid',code,requestId:crypto.randomUUID(),...retryAfterMs}));}catch{/* already disconnected */}}
 }
 async invalidateSession(hash:string){for(const ws of this.ctx.getWebSockets()){const a=ws.deserializeAttachment() as Attachment;if(a.hash===hash){this.disconnect(ws);ws.close(4003,'UNAUTHENTICATED');}}}
 private cleanupDue(){return this.ctx.storage.sql.exec<{due:number|null}>('SELECT MIN(next_at) AS due FROM room_cleanup').one().due??Infinity;}
 async eraseScene(clinicId:string,sceneId:string){
  const room=this.ctx.storage.sql.exec<{data:string}>('SELECT data FROM room WHERE id=1').toArray()[0];
  if(room){const s=JSON.parse(room.data) as RoomRecord;if(s.clinicId!==clinicId||s.sceneId!==sceneId)throw new Rejected('PERMISSION_DENIED');}
  this.ctx.storage.transactionSync(()=>{
   this.ctx.storage.sql.exec('INSERT OR REPLACE INTO room_erasure VALUES(1,?,?)',clinicId,sceneId);
   for(const table of ['room','history','operations','room_cleanup','trays','tray_history'])this.ctx.storage.sql.exec(`DELETE FROM ${table}`);
  });
  for(const ws of this.ctx.getWebSockets())ws.close(1000,'SCENE_DELETED');
  await this.scheduleRemaining();
                                                   
  return {complete:true};
 }
                                                                                                          
                                                                                                    
                                                                                                         
 async purgeErasure(clinicId:string,sceneId:string):Promise<{purged:boolean;reason?:string}>{
  const marker=this.ctx.storage.sql.exec<{clinic_id:string;scene_id:string}>('SELECT clinic_id,scene_id FROM room_erasure WHERE id=1').toArray()[0];
  if(!marker){
                                                                                             
   if(this.ctx.storage.sql.exec('SELECT id FROM room').toArray().length)return {purged:false,reason:'NOT_ERASED'};
   return {purged:true};
  }
  if(marker.clinic_id!==clinicId||marker.scene_id!==sceneId)return {purged:false,reason:'KEY_MISMATCH'};
  if(this.ctx.getWebSockets().length)return {purged:false,reason:'SOCKETS_ATTACHED'};
  await this.ctx.storage.deleteAlarm();await this.ctx.storage.deleteAll();
                                                                                             
  this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS room (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL)');
  this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS room_erasure (id INTEGER PRIMARY KEY CHECK(id=1), clinic_id TEXT NOT NULL, scene_id TEXT NOT NULL)');
  this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS operations (actor TEXT NOT NULL, epoch INTEGER NOT NULL, op TEXT NOT NULL, command TEXT NOT NULL, ack TEXT NOT NULL, PRIMARY KEY(actor,epoch,op))');this.ctx.storage.sql.exec(OPERATIONS_LOOKUP_INDEX);
  this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS history (step INTEGER PRIMARY KEY, before_state TEXT NOT NULL, after_state TEXT NOT NULL)');
  this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS room_cleanup (room_id TEXT PRIMARY KEY, clinic_id TEXT NOT NULL, scene_id TEXT NOT NULL, next_at INTEGER NOT NULL)');
  this.ctx.storage.sql.exec(TRAYS_TABLE);this.ctx.storage.sql.exec(TRAY_HISTORY_TABLE);
  return {purged:true};
 }
 private async scheduleRemaining(){const at=this.cleanupDue();if(Number.isFinite(at))await this.ctx.storage.setAlarm(Math.max(Date.now()+1,at));}
 private async releaseClosedRooms(){
  for(const row of this.ctx.storage.sql.exec<{room_id:string;clinic_id:string;scene_id:string}>('SELECT * FROM room_cleanup WHERE next_at<=?',Date.now()).toArray()){
                                                                                      
                                                                                          
                                                                                       
     try{const coordinator=this.env.SCENE_COORDINATOR_DO.getByName(row.clinic_id+':'+row.scene_id);await coordinator.registerSessionEnd(row.clinic_id,row.scene_id,row.room_id);await this.env.AUTH_DO.getByName('sessions').detachRoomFromAll(row.room_id);this.ctx.storage.sql.exec('DELETE FROM room_cleanup WHERE room_id=?',row.room_id);}
   catch{this.ctx.storage.sql.exec('UPDATE room_cleanup SET next_at=? WHERE room_id=?',Date.now()+5000,row.room_id);}
  }
 }
 private finishRoom(s:RoomRecord){
                                                                            
                                                                                          
  this.ctx.storage.transactionSync(()=>{
   this.ctx.storage.sql.exec('INSERT OR REPLACE INTO room_cleanup VALUES(?,?,?,?)',s.roomId,s.clinicId,s.sceneId,Date.now());
   this.clearActiveRoom();
  });
 }
                                                                                                                       
                                                                                                                       
                                                                                                                       
                                                                     
 protected clearActiveRoom(){
  this.ctx.storage.sql.exec('DELETE FROM operations');this.ctx.storage.sql.exec('DELETE FROM history');this.ctx.storage.sql.exec('DELETE FROM trays');this.ctx.storage.sql.exec('DELETE FROM tray_history');this.ctx.storage.sql.exec('DELETE FROM room');
 }
 async close(p:Identity){
                                                                                                                               
                                                                                                                                  
  {const current=this.read();this.owner(current,p);}
                                                                                           
  await this.ctx.storage.setAlarm(Date.now()+1);
  const s=this.read();this.member(s,p);this.stopAnimations(s,()=>true,Date.now());this.finishRoom(s);
  for(const ws of this.ctx.getWebSockets())ws.close(1000,'ROOM_CLOSED');
  await this.releaseClosedRooms();await this.scheduleRemaining();
                                                                              
                                                                                   
  return {id:s.roomId,sceneId:s.sceneId,clinicId:s.clinicId};
 }
                                                                                                                                 
                                                                                                                          
 async leave(p:Identity){
  return this.ctx.storage.transactionSync(()=>{
   const s=this.read();this.member(s,p,false);if(p.role!=='client')throw new Rejected('PERMISSION_DENIED');
   this.stopAnimations(s,()=>true,Date.now());
   s.grants={};s.leases={};(s as SharedState).requests={};delete s.exportConsent;
   delete s.participants[p.participantId];if(s.waitingClient===p.participantId)delete s.waitingClient;delete s.invite;
   s.controlEpoch++;s.serverSeq++;s.lastActivity=Date.now();this.save(s);
   this.broadcast({...this.message(s,'permission.changed',{controlEpoch:s.controlEpoch,grant:null}) as object,serverSeq:s.serverSeq,sessionEpoch:s.sessionEpoch});
   return {id:s.roomId};
  });
 }
 async alarm(){
  await this.releaseClosedRooms();
  const row=this.ctx.storage.sql.exec<{data:string}>('SELECT data FROM room WHERE id=1').toArray()[0];
  if(!row){await this.scheduleRemaining();return;}
  const s=JSON.parse(row.data) as RoomRecord,now=Date.now();
  if(s.status==='ACTIVE'&&s.lastActivity+7200000>now){
   if(this.enforceAnimations(s,now)){s.serverSeq++;this.save(s);this.broadcast(this.snapshotEvent(s));}
   await this.schedule(s);return;
  }
  this.stopAnimations(s,()=>true,Math.min(now,s.lastActivity+7200000));
  try{this.finishRoom(s);}catch{await this.ctx.storage.setAlarm(now+5000);return;}
  for(const ws of this.ctx.getWebSockets())ws.close(1000,'EXPIRED');
                                                                     
                                                                          
  await this.releaseClosedRooms();await this.scheduleRemaining();
 }
 async webSocketClose(ws:WebSocket){this.disconnect(ws);try{ws.close(1000,'CONNECTION_CLOSED');}catch{/* transport already closed */}}
 async webSocketError(ws:WebSocket){this.disconnect(ws);try{ws.close(1011,'CONNECTION_ERROR');}catch{}}
 private disconnect(ws:WebSocket){try{const a=ws.deserializeAttachment() as Attachment;const s=this.read();if(s.connections[a.identity.participantId]!==a.connectionId)return;delete s.connections[a.identity.participantId];this.stopAnimations(s,()=>true,Date.now());s.grants={};s.leases={};s.controlEpoch++;s.clientLiveUntil=clientPresence(s.clientLiveUntil,a.identity.role,'disconnect',Date.now());s.serverSeq++;this.save(s);this.broadcast(this.snapshotEvent(s));this.ctx.waitUntil(this.schedule(s));}catch{/* expired or closed room */}}
}





