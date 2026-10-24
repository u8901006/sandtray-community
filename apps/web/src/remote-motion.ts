                                                                                     
                                                                        
                      
import type {Transform} from '../../../packages/protocol/src/index';
export const LOCK_RELEASE_GRACE_MS=600,REMOTE_DELAY_MS=100,PREVIEW_INTERVAL_MS=100,PREVIEW_STALE_MS=1500,SETTLE_MS=140;
export type Sample={at:number;position:[number,number,number];rotation:[number,number,number,number]};
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
                                                              
export function nlerpQuat(a:readonly number[],b:readonly number[],t:number):[number,number,number,number]{
 const sign=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3]<0?-1:1;
 const q=[0,1,2,3].map(i=>lerp(a[i],b[i]*sign,t));const n=Math.hypot(...q)||1;
 return [q[0]/n,q[1]/n,q[2]/n,q[3]/n];
}
                                                                                           
export function pushSample(buffer:Sample[],sample:Sample,keepMs=1000){
 if(buffer.length&&sample.at<buffer[buffer.length-1].at)return buffer;
 buffer.push(sample);while(buffer.length>2&&buffer[0].at<sample.at-keepMs)buffer.shift();return buffer;
}
                                                                                                                  
export function sampleAt(buffer:readonly Sample[],renderAt:number):Omit<Sample,'at'>|null{
 if(!buffer.length)return null;
 if(renderAt<=buffer[0].at)return {position:buffer[0].position,rotation:buffer[0].rotation};
 for(let i=1;i<buffer.length;i++){const a=buffer[i-1],b=buffer[i];if(renderAt<=b.at){const t=b.at===a.at?1:(renderAt-a.at)/(b.at-a.at);
  return {position:[lerp(a.position[0],b.position[0],t),lerp(a.position[1],b.position[1],t),lerp(a.position[2],b.position[2],t)],rotation:nlerpQuat(a.rotation,b.rotation,t)};}}
 const last=buffer[buffer.length-1];return {position:last.position,rotation:last.rotation};
}
                                                                                                    
export function settleProgress(elapsedMs:number,ms=SETTLE_MS){if(!(elapsedMs>0))return 0;if(elapsedMs>=ms)return 1;const t=elapsedMs/ms;return 1-(1-t)**3;}
                                                                                                  
export function shouldSendPreview(lastSentAt:number|undefined,now:number,interval=PREVIEW_INTERVAL_MS){return lastSentAt===undefined||now-lastSentAt>=interval;}

type Listener=()=>void;
const buffers=new Map<string,Sample[]>(),listeners=new Map<string,Set<Listener>>();
export const remoteMotion={
 push(objectId:string,transform:Transform,at=performance.now()){
  const buffer=buffers.get(objectId)??[];buffers.set(objectId,pushSample(buffer,{at,position:[...transform.position] as Sample['position'],rotation:[...transform.rotation] as Sample['rotation']}));
  listeners.get(objectId)?.forEach(l=>l());
 },
                                                                                
 pose(objectId:string,now=performance.now()){
  const buffer=buffers.get(objectId);if(!buffer?.length)return null;
  if(now-buffer[buffer.length-1].at>PREVIEW_STALE_MS){buffers.delete(objectId);return null;}
  return sampleAt(buffer,now-REMOTE_DELAY_MS);
 },
                                                                                                              
 clear(objectId?:string){if(objectId===undefined){const ids=[...buffers.keys()];buffers.clear();for(const id of ids)listeners.get(id)?.forEach(l=>l());}else if(buffers.delete(objectId))listeners.get(objectId)?.forEach(l=>l());},
                                                                                                       
 clearIfIdle(objectId:string,since:number){const b=buffers.get(objectId);if(b?.length&&b[b.length-1].at<=since)this.clear(objectId);},
 subscribe(objectId:string,listener:Listener){const set=listeners.get(objectId)??new Set();set.add(listener);listeners.set(objectId,set);return()=>{set.delete(listener);if(!set.size)listeners.delete(objectId);};},
};
