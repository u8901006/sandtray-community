import {ReceiptRetry,advanceEpochs} from './receipt-retry';
import {useEffect,useRef,useState} from 'react';
import {remoteMotion,shouldSendPreview,LOCK_RELEASE_GRACE_MS} from './remote-motion';
import {heartbeatVerdict,reconnectDelay,RECONNECT_MAX_ATTEMPTS,HEARTBEAT_MS} from './reconnect-policy';
import {PROTOCOL_CAPABILITY_HEADER,PROTOCOL_CAPABILITY,WS_SUBPROTOCOL,type Transform,type Action} from '../../../packages/protocol/src/index';
                                                                                                                                  
export async function api(path:string,data?:unknown){const response=await fetch(path,{method:data===undefined?'GET':'POST',headers:{[PROTOCOL_CAPABILITY_HEADER]:PROTOCOL_CAPABILITY,...(data===undefined?{}:{'Content-Type':'application/json'})},body:data===undefined?undefined:JSON.stringify(data),cache:'no-store'});if(!response.ok){const value=await response.json() as {code:string};throw new Error(value.code);}return response.status===204?{}:await response.json() as any;}
export const words:Record<string,string>={PERMISSION_DENIED:'目前沒有這項操作的授權。',STALE_EPOCH:'連線已更新，請重新操作。',LOCKED:'物件正在操作中，請稍後再試。',GRANT_EXPIRED:'授權已到期，請重新請求。',UNAUTHENTICATED:'登入已失效，請重新登入。',ROOM_CLOSED:'會談已結束。',ROOM_FULL:'此席位已在另一頁開啟，可明確接管。',RATE_LIMITED:'操作太快，請稍後再試。',UPGRADE_REQUIRED:'沙盤程式已更新，請重新整理頁面。',STALE_FENCE:'物件操作權已更新，請重新選取物件後再操作。',REVISION_CONFLICT:'作品剛有更新，請再試一次。',INVALID_PAYLOAD:'這項操作無法完成，請重新操作。',SAVE_FAILED:'暫時無法保存，請稍後再試。'};
const WAITING_ROOM_POLL_MS=1000;
type DragLease={objectId:string;approval:Record<string,unknown>;ready:Promise<{id:string;fence:number}|null>;lease?:{id:string;fence:number};renew?:ReturnType<typeof setInterval>;lastPreview?:number;ended?:boolean};
export function useSharedRoom(roomId:string|null){
 const [info,setInfo]=useState<any>(null),[scene,setScene]=useState<any>(null),[status,setStatus]=useState('尚未連線'),[connected,setConnected]=useState(false);
 const socket=useRef<WebSocket|null>(null),latest=useRef<any>(null),pending=useRef(new Map<string,{resolve:(v:any)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>;objectId?:string;sentSeq:number}>());
 const receipts=useRef(new ReceiptRetry());
                                                                                                   
 const trayListener=useRef<((message:any)=>void)|null>(null);
                                                                                                       
 const active=useRef(true),generation=useRef(0),refreshNumber=useRef(0),connecting=useRef(false),waitingPollStopped=useRef(false);
 const inflight=useRef<{run:number;promise:Promise<void>}|null>(null);
                                                                                                                         
                                                                                                                                              
                                                                                                                             
 const reconnect=useRef<{attempt:number;timer?:ReturnType<typeof setTimeout>;stopped:boolean;neverOpened:boolean}>({attempt:0,stopped:false,neverOpened:false});
 const lastHeard=useRef(Date.now()),lastTick=useRef(Date.now());
                                                                                                                                                
 const hadSession=useRef(false);
                                                                                      
 const dragLease=useRef<DragLease|null>(null);
                                                                                                                                                
                                                                                                                                   
 const messageSeq=useRef(0),lockSeen=useRef(new Map<string,{seq:number;lease:any}>());
                                                                                                               
                                                                                                                
                                                                                                                   
                                                                                                                     
 function refresh():Promise<void>{if(!roomId)return Promise.resolve();const run=++refreshNumber.current;const promise=(async()=>{await load(run);const newer=inflight.current;if(newer&&newer.run!==run&&newer.run===refreshNumber.current)await newer.promise;})();inflight.current={run,promise};return promise;}
 async function load(run:number){const value=await api(`/api/rooms/${roomId}/info`);if(!active.current||run!==refreshNumber.current)return;receipts.current.bind(`${roomId}:${value.participantId}`);value.clockOffset=value.serverNow-Date.now();latest.current={...advanceEpochs(value,latest.current??{}),ready:latest.current?.ready??false};setInfo(value);if(value.admitted){const snapshot=await api(`/api/rooms/${roomId}/snapshot`);if(active.current&&run===refreshNumber.current)setScene(snapshot);}else {setScene(null);setStatus('等候治療師確認入房');}}
 function clearPending(){for(const p of pending.current.values()){clearTimeout(p.timer);p.reject(new Error('連線中斷，操作尚未確認。'));}pending.current.clear();dropDrag();}
 function dropDrag(){const d=dragLease.current;if(!d)return;d.ended=true;if(d.renew)clearInterval(d.renew);dragLease.current=null;}
 function cancelReconnect(){if(reconnect.current.timer!==undefined)clearTimeout(reconnect.current.timer);reconnect.current.timer=undefined;}
 function scheduleReconnect(){
  const r=reconnect.current;if(!active.current||!roomId||r.stopped||r.timer!==undefined)return;
  if(r.attempt>=RECONNECT_MAX_ATTEMPTS){setStatus(r.neverOpened?'多次自動重新連線都失敗。若這個席位已在另一頁開啟，請到要使用的那一頁繼續；要改用這一頁，請按「接管此席位」。':'多次自動重新連線都失敗，請檢查網路後按「重新連線」；操作授權需要重新取得。');return;}
  const delay=reconnectDelay(r.attempt++);
  setStatus(`連線中斷，${Math.round(delay/1000)} 秒後自動重新連線（第 ${r.attempt} 次）；操作授權需要重新取得。`);
  r.timer=setTimeout(()=>{r.timer=undefined;void connectInternal(false,true);},delay);
 }
 async function connectInternal(takeover=false,auto=false){if(!roomId||connecting.current)return;connecting.current=true;cancelReconnect();if(latest.current)latest.current.ready=false;setConnected(false);clearPending();try{await refresh();if(!latest.current?.admitted)return;
  const run=++generation.current;socket.current?.close();const ws=new WebSocket(location.origin.replace(/^http/,'ws')+`/api/rooms/${roomId}/socket${takeover?'?takeover=1':''}`,WS_SUBPROTOCOL);socket.current=ws;let opened=false;
  ws.onopen=()=>{if(run!==generation.current)return;opened=true;lastHeard.current=Date.now();setStatus('連線中，正在核對會談狀態');};
  ws.onmessage=event=>{if(run!==generation.current)return;lastHeard.current=Date.now();const message=JSON.parse(event.data);messageSeq.current++;if(message.type==='lock.changed')lockSeen.current.set(message.objectId,{seq:messageSeq.current,lease:message.lease});
   if(message.type==='object.preview'){if(message.participantId!==latest.current?.participantId)remoteMotion.push(message.objectId,message.transform);return;}
                                                                                                                                      
                                                                                                                                          
   if(message.type==='lock.changed'&&!message.lease){const at=performance.now(),objectId=message.objectId;setTimeout(()=>remoteMotion.clearIfIdle(objectId,at),LOCK_RELEASE_GRACE_MS);}if(message.type==='room.snapshot')remoteMotion.clear();if(latest.current){latest.current=advanceEpochs(latest.current,message);}
   if(message.type==='room.snapshot'){void refresh().then(()=>{if(run!==generation.current||ws.readyState!==WebSocket.OPEN)return;latest.current={...latest.current,ready:true};hadSession.current=true;reconnect.current.attempt=0;reconnect.current.neverOpened=false;setConnected(true);setStatus(receipts.current.size?'正在核對未確認操作':'已連線・會談期間暫存');for(const payload of receipts.current.replay())ws.send(payload);}).catch(fail);}
   if(message.type==='operation.ack'||message.type==='operation.rejected'){const recovered=receipts.current.settle(message.operationId);if(recovered){void refresh().then(()=>{if(run===generation.current)setStatus(message.type==='operation.ack'?(receipts.current.size?'仍有操作等待確認':'操作已確認於會談暫存'):(message.code==='STALE_EPOCH'?'上次操作未保存，請重新操作。':words[message.code]??message.code));}).catch(fail);}const p=pending.current.get(message.operationId);if(p){clearTimeout(p.timer);pending.current.delete(message.operationId);const seen=p.objectId===undefined?undefined:lockSeen.current.get(p.objectId);message.type==='operation.ack'?p.resolve({...message,lockSeen:seen&&seen.seq>p.sentSeq?seen.lease:undefined}):p.reject(new Error(words[message.code]??message.code));}}
   if(message.type==='tray.changed'){setScene((prev:any)=>prev&&prev.sceneRevision<message.sceneRevision?{...prev,sceneRevision:message.sceneRevision}:prev);trayListener.current?.(message);}
   if(['scene.patch','permission.changed','permission.requested','lock.changed','sync.required'].includes(message.type))void refresh().catch(fail);
  };
  ws.onerror=()=>{if(run===generation.current)setStatus('連線失敗；另一頁佔用時請按接管此席位。');};
  ws.onclose=event=>{if(run!==generation.current)return;const wasAdmitted=latest.current?.admitted===true;if(socket.current===ws)socket.current=null;remoteMotion.clear();refreshNumber.current++;if(latest.current)latest.current.ready=false;setConnected(false);clearPending();if(event.code===4001)receipts.current.clear();if(event.code===4003){receipts.current.clear();latest.current=null;setInfo(null);waitingPollStopped.current=true;}
   const terminal=event.code===4001||event.code===4003||event.reason==='ROOM_CLOSED';
                                                                                                                              
   if(terminal||!hadSession.current){reconnect.current.stopped=terminal;setScene(null);}
   setStatus(event.code===4001?'席位已由另一頁接管。':wasAdmitted&&event.code===4003?'登入已失效，請重新登入。':event.reason==='ROOM_CLOSED'?words.ROOM_CLOSED:'已斷線，請重新連線；操作授權需要重新取得。');
                                                                                                                                                      
                                                             
   if(!terminal&&hadSession.current){reconnect.current.neverOpened=!opened;scheduleReconnect();}};
 }catch(e){fail(e);if(auto&&hadSession.current)scheduleReconnect();}finally{connecting.current=false;}}
 async function connect(takeover=false){waitingPollStopped.current=false;cancelReconnect();reconnect.current={attempt:0,stopped:false,neverOpened:false};return connectInternal(takeover);}
                                                                                                                
 function dropConnection(){remoteMotion.clear();generation.current++;refreshNumber.current++;if(latest.current)latest.current.ready=false;setConnected(false);clearPending();const expired=socket.current;socket.current=null;expired?.close();scheduleReconnect();}
  function fail(e:unknown){
  const code=e instanceof Error?e.message:'';
  const waitingForAdmission=!socket.current&&!latest.current?.admitted;
                                                                                
                                                                             
  const waitingRoomGone=code==='PERMISSION_DENIED'&&latest.current?.roomId===roomId&&latest.current?.admitted===false;
  const terminalCode=code==='ROOM_CLOSED'||waitingRoomGone?'ROOM_CLOSED':code;
                                                                             
                                                                            
                                                                              
                                   
  const waitingTerminal=waitingForAdmission&&['UNAUTHENTICATED','PERMISSION_DENIED','ROOM_CLOSED'].includes(code);
  if(waitingTerminal){waitingPollStopped.current=true;refreshNumber.current++;}
  if(['UNAUTHENTICATED','PERMISSION_DENIED','ROOM_CLOSED','UPGRADE_REQUIRED'].includes(terminalCode)){reconnect.current.stopped=true;cancelReconnect();}
  if(['UNAUTHENTICATED','PERMISSION_DENIED','ROOM_CLOSED'].includes(terminalCode)){receipts.current.clear();latest.current=null;setInfo(null);setScene(null);setConnected(false);socket.current?.close();}
  setStatus(e instanceof Error?(words[terminalCode]??e.message):'操作失敗');
 }
                                                                                                                                
 async function send(input:Record<string,unknown>,options:{quiet?:boolean;ignoreFailure?:boolean}={}){if(socket.current?.readyState!==WebSocket.OPEN||!latest.current?.ready)throw new Error('尚未連線，操作未送出。');const state=latest.current;const operationId=typeof input.operationId==='string'?input.operationId:crypto.randomUUID();const heartbeat=input.type==='presence.heartbeat'||options.quiet===true;const command={protocolVersion:1,sessionEpoch:state.sessionEpoch,controlEpoch:state.controlEpoch,...input,operationId};if(!heartbeat)setStatus('同步中');try{const result=await new Promise<any>((resolve,reject)=>{receipts.current.remember(command);const timer=setTimeout(()=>{pending.current.delete(operationId);
                                                                                                                                                      
   if(input.type==='presence.heartbeat'){reject(new Error('心跳尚未確認'));return;}
   dropConnection();reject(new Error('尚未收到保存確認，正在重新連線核對。'));},8000);pending.current.set(operationId,{resolve,reject,timer,objectId:typeof input.objectId==='string'?input.objectId:undefined,sentSeq:messageSeq.current});try{socket.current!.send(JSON.stringify(command));}catch(e){clearTimeout(timer);pending.current.delete(operationId);receipts.current.settle(operationId);reject(e);}});if(options.quiet!==true)await refresh();if(!heartbeat)setStatus(receipts.current.size?'仍有操作等待確認':'已保存於會談暫存');return result;}catch(e){if(options.ignoreFailure!==true&&input.type!=='presence.heartbeat'||e instanceof Error&&['UNAUTHENTICATED','PERMISSION_DENIED','ROOM_CLOSED'].includes(e.message))fail(e);throw e;}}
  useEffect(()=>{active.current=true;waitingPollStopped.current=false;if(roomId)void connectInternal();lastTick.current=Date.now();const heartbeatTimer=setInterval(()=>{const now=Date.now();const verdict=heartbeatVerdict({now,lastTick:lastTick.current,lastHeard:lastHeard.current});lastTick.current=now;
   const open=socket.current?.readyState===WebSocket.OPEN&&latest.current?.ready===true;
                                                                                                                           
   if(verdict==='stalled'){lastHeard.current=now;return;}
   if(open&&verdict==='silent'){dropConnection();return;}
   if(open)void send({type:'presence.heartbeat'}).catch(()=>{});},HEARTBEAT_MS);
  const retryNow=()=>{if(reconnect.current.timer!==undefined&&document.visibilityState!=='hidden'){cancelReconnect();void connectInternal(false,true);}};
  window.addEventListener('online',retryNow);document.addEventListener('visibilitychange',retryNow);const waitingTimer=setInterval(()=>{if(roomId&&!waitingPollStopped.current&&!latest.current?.admitted&&!connecting.current)void connectInternal();},WAITING_ROOM_POLL_MS);return()=>{active.current=false;waitingPollStopped.current=true;generation.current++;hadSession.current=false;cancelReconnect();reconnect.current={attempt:0,stopped:false,neverOpened:false};window.removeEventListener('online',retryNow);document.removeEventListener('visibilitychange',retryNow);clearInterval(heartbeatTimer);clearInterval(waitingTimer);socket.current?.close();clearPending();receipts.current.clear();latest.current=null;setInfo(null);setScene(null);setConnected(false);};},[roomId]);
 function can(action:Action,objectId:string){return connected&&(info?.role==='client'||Object.values(info?.grants??{}).some((g:any)=>g.objectId===objectId&&g.active&&g.expiresAt>Date.now()&&g.actions.includes(action)));}
 function approvalFor(objectId:string,action?:Action){const grant=Object.values(latest.current?.grants??{}).find((g:any)=>g.objectId===objectId&&g.active&&(!action||g.actions.includes(action))) as any;return latest.current?.role==='therapist'?{grantId:grant?.id,grantVersion:grant?.version}:{};}
                                                                                                                                                               
 function beginDrag(objectId:string){
  if(!connected||socket.current?.readyState!==WebSocket.OPEN||!latest.current?.ready)return;
  if(dragLease.current)void endDrag(dragLease.current.objectId);
  const approval=approvalFor(objectId);
  const d:DragLease={objectId,approval,ready:Promise.resolve(null)};dragLease.current=d;const run=generation.current;
  d.ready=(async()=>{try{const ack=await send({type:'object.lock.acquire',objectId,actions:['translate'],...approval},{ignoreFailure:true});
                                                                                                                                                  
    const seen=ack?.lockSeen;const l=seen&&seen.participantId===latest.current?.participantId?{id:seen.leaseId as string,fence:seen.fencingToken as number}:null;
    if(!l)return null;
                                                                                                                                            
                                                                                                                             
    if(d.ended){if(run===generation.current)await send({type:'object.lock.release',objectId,leaseId:l.id,fencingToken:l.fence,...approval},{ignoreFailure:true}).catch(()=>{});return null;}
    d.lease={id:l.id,fence:l.fence};
                                                                                        
    d.renew=setInterval(()=>{if(d.ended||!d.lease)return;void send({type:'object.lock.renew',objectId,leaseId:d.lease.id,fencingToken:d.lease.fence,...approval},{quiet:true,ignoreFailure:true}).catch(()=>{});},1500);
    return d.lease;}catch{return null;}})();
 }
                                                                                                                                 
 function previewDrag(objectId:string,transform:Transform){
  const d=dragLease.current,state=latest.current,ws=socket.current;if(!d||d.objectId!==objectId||!d.lease||!state?.ready||ws?.readyState!==WebSocket.OPEN)return;
  const now=performance.now();if(!shouldSendPreview(d.lastPreview,now))return;d.lastPreview=now;
  try{ws.send(JSON.stringify({protocolVersion:1,type:'object.transform.preview',operationId:crypto.randomUUID(),sessionEpoch:state.sessionEpoch,controlEpoch:state.controlEpoch,objectId,leaseId:d.lease.id,fencingToken:d.lease.fence,transform,...d.approval}));}catch{/* the socket is closing; the drop reports it */}
 }
                                                                          
 async function endDrag(objectId:string){const d=dragLease.current;if(!d||d.objectId!==objectId)return;dropDrag();const lease=await d.ready;if(lease)await send({type:'object.lock.release',objectId,leaseId:lease.id,fencingToken:lease.fence,...d.approval},{ignoreFailure:true}).catch(()=>{});}
 async function transform(objectId:string,transform:Transform){
  const d=dragLease.current?.objectId===objectId?dragLease.current:null;let held:{id:string;fence:number}|null=null;
  if(d){held=await d.ready;dropDrag();}
  await refresh();const object=scene?.objects.find((o:any)=>o.id===objectId);if(!object){if(held&&d)await send({type:'object.lock.release',objectId,leaseId:held.id,fencingToken:held.fence,...d.approval},{ignoreFailure:true}).catch(()=>{});throw new Error('物件已不存在');}const actions:Action[]=[];if(object.transform.position.some((v:number,i:number)=>v!==transform.position[i]))actions.push('translate');if(object.transform.rotation.some((v:number,i:number)=>v!==transform.rotation[i]))actions.push('rotate');if(object.transform.scale!==transform.scale)actions.push('scale');
  if(!actions.length){if(held&&d)await send({type:'object.lock.release',objectId,leaseId:held.id,fencingToken:held.fence,...d.approval},{ignoreFailure:true}).catch(()=>{});return;}
  const approval=d&&held?d.approval:approvalFor(objectId);
  if(!held)await send({type:'object.lock.acquire',objectId,actions,...approval});const lease=held?{id:held.id,fence:held.fence}:latest.current.leases[objectId];try{await send({type:'object.transform.commit',objectId,expectedObjectRevision:object.revision,leaseId:lease.id,fencingToken:lease.fence,transform,...approval});}finally{await send({type:'object.lock.release',objectId,leaseId:lease.id,fencingToken:lease.fence,...approval},{ignoreFailure:true}).catch(()=>{});}
 }
 async function animate(objectId:string,animation:Record<string,unknown>){
  await refresh();const object=scene?.objects.find((o:any)=>o.id===objectId);if(!object)throw new Error('物件已不存在');
  const grant=Object.values(latest.current.grants??{}).find((g:any)=>g.objectId===objectId&&g.active&&g.actions.includes('animate')) as any;
  const approval=latest.current.role==='therapist'?{grantId:grant?.id,grantVersion:grant?.version}:{};
  await send({type:'object.lock.acquire',objectId,actions:['animate'],...approval});const lease=latest.current.leases[objectId];
  try{await send({type:'animation.set',objectId,expectedObjectRevision:object.revision,leaseId:lease.id,fencingToken:lease.fence,...animation,...approval});}
  finally{await send({type:'object.lock.release',objectId,leaseId:lease.id,fencingToken:lease.fence,...approval},{ignoreFailure:true}).catch(()=>{});}
 }
 return {info,scene,status,connected,connect,send,refresh,can,transform,animate,fail,trayListener,beginDrag,previewDrag,endDrag,hasUnconfirmedOperations:()=>pending.current.size>0||receipts.current.size>0};
}



