import {z} from 'zod';
import type {Env} from './env';
import {Rejected} from '../../../packages/room-core/src/index';
import {id} from '../../../packages/protocol/src/index';
                                                                                     
                                                                                 
                        

const policySchema=z.strictObject({version:id,ttlMs:z.number().int().min(1000).max(86400000),purpose:z.literal('synthetic-testing')});
export function retentionPolicy(env:Env,version?:string){
 let input:unknown;try{input=JSON.parse(env.RETENTION_POLICY??'null');}catch{throw new Rejected('PERMISSION_DENIED');}
 const policy=policySchema.safeParse(input);
 if(!policy.success||(version!==undefined&&policy.data.version!==version)||!env.PRIVATE_SCENES||!env.DIRECTORY)throw new Rejected('PERMISSION_DENIED');
 return policy.data;
}

                                                                                  
                                                                                                
                                                          
export const DEFAULT_TOMBSTONE_TTL_MS=8*60*60*1000;
export function tombstoneTtlMs(env:Env){
 if(!env.DIRECTORY||!env.PRIVATE_SCENES)throw new Rejected('PERMISSION_DENIED');
 if(env.DEPLOY_ENV!==undefined){
  if(env.DEPLOY_ENV!=='staging'&&env.DEPLOY_ENV!=='production')throw new Rejected('PERMISSION_DENIED');
  if(env.RETENTION_POLICY!==undefined||env.TOMBSTONE_TTL_MS!==undefined)throw new Rejected('PERMISSION_DENIED');
  return DEFAULT_TOMBSTONE_TTL_MS;
 }
 if(env.TOMBSTONE_TTL_MS!==undefined){
  const ttl=z.coerce.number().int().min(1000).max(86400000).safeParse(env.TOMBSTONE_TTL_MS);
  if(!ttl.success)throw new Rejected('PERMISSION_DENIED');
  return ttl.data;
 }
 if(env.RETENTION_POLICY!==undefined)return retentionPolicy(env).ttlMs;
 return DEFAULT_TOMBSTONE_TTL_MS;
}
