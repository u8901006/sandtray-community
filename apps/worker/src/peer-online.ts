                                                                          
type Member={id:string;role:'client'|'therapist';admitted?:boolean};
export function peerOnline(s:{participants:Record<string,Member>;connections:Record<string,string>;clientLiveUntil:number},self:string,now:number):boolean|undefined{
 const peer=Object.values(s.participants).find(m=>m.id!==self&&m.admitted);
 if(!peer)return undefined;
 return Object.hasOwn(s.connections,peer.id)&&(peer.role!=='client'||s.clientLiveUntil>now);
}
