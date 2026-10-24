import {isLocalHost} from './asset-listing';
                                                                 
                                                         
                                                                   
export type EntrySession={role:'therapist'|'client';roomId?:string|null};
export type SessionCheck={kind:'checking'}|{kind:'none'}|{kind:'error'}|{kind:'ok';session:EntrySession};
export type EntryView={view:'app'}|{view:'loading'}|{view:'title'}|{view:'error'}|{view:'invite';token:string}|{view:'redirect';search:string};
export function gateEnforced(hostname:string,search:string){return !isLocalHost(hostname)||new URLSearchParams(search).get('gate')==='1';}
export function inviteFromHash(hash:string){const token=new URLSearchParams(hash.replace(/^#/,'')).get('invite');return token&&token.trim()?token:null;}
                                              
export function roomSearch(roomId:string,search:string){const next=new URLSearchParams({room:roomId});if(new URLSearchParams(search).get('gate')==='1')next.set('gate','1');return '?'+next.toString();}
                                                                                  
export function sessionFailure(cause:unknown):SessionCheck{return cause instanceof Error&&cause.message==='UNAUTHENTICATED'?{kind:'none'}:{kind:'error'};}
export function parseSession(value:unknown):SessionCheck{
 const v=value as {role?:unknown;roomId?:unknown}|null;
 if(!v||(v.role!=='therapist'&&v.role!=='client'))return {kind:'error'};
 return {kind:'ok',session:{role:v.role,roomId:typeof v.roomId==='string'?v.roomId:null}};
}
export function decideEntry({enforced,roomId,invite,check,search}:{enforced:boolean;roomId:string|null;invite:string|null;check:SessionCheck;search:string}):EntryView{
 if(!enforced)return {view:'app'};
 if(invite)return {view:'invite',token:invite};
 if(check.kind==='checking')return {view:'loading'};
 if(check.kind==='error')return {view:'error'};
 if(check.kind==='none')return {view:'title'};
 const {session}=check;
 if(session.role==='therapist')return {view:'app'};
                                                
 if(session.roomId)return roomId===session.roomId?{view:'app'}:{view:'redirect',search:roomSearch(session.roomId,search)};
 return {view:'title'};
}
