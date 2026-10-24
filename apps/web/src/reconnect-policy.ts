                                                    
                                                             
export const HEARTBEAT_MS=5000;
                                                                                                             
export const SILENT_MS=15000;
                                                                                                               
export const STALL_MS=2000;
export const RECONNECT_MAX_ATTEMPTS=8;
export type HeartbeatVerdict='ok'|'stalled'|'silent';
export function heartbeatVerdict({now,lastTick,lastHeard,interval=HEARTBEAT_MS}:{now:number;lastTick:number;lastHeard:number;interval?:number}):HeartbeatVerdict{
 if(now-lastTick-interval>STALL_MS)return 'stalled';
 return now-lastHeard>SILENT_MS?'silent':'ok';
}
                                               
export function reconnectDelay(attempt:number){return Math.min(30000,1000*2**Math.max(0,attempt));}
