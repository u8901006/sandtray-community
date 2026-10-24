import {z} from 'zod';
import type {Env,Session} from './env';
import {error,hashToken,json,randomToken} from './http';
                                                                           
                                                 
                                                                      
const fence=(env:Env)=>env.AUTH_DO.getByName('sessions');
export const ENROLLMENT_TTL_MS=24*3600000;
const CODE=/^[a-f0-9]{64}$/;
export const enrollmentInputSchema=z.strictObject({displayName:z.string().trim().min(1).max(60),grantAdmin:z.boolean()});
type Admin={participantId:string;clinicId:string};
export async function requireAdmin(env:Env,session:Session):Promise<Admin|null>{
 if(session.role!=='therapist'||!env.DIRECTORY)return null;
                                                
 const row=await env.DIRECTORY.prepare('SELECT is_admin AS isAdmin FROM therapists WHERE participant_id=? AND clinic_id=? AND active=1').bind(session.participantId,session.clinicId).first<{isAdmin:number}>().catch(cause=>{console.warn(JSON.stringify({event:'admin_check_failed',message:cause instanceof Error?cause.message.slice(0,120):''}));return null;});
 if(row?.isAdmin!==1||await fence(env).isDeactivated(session.participantId))return null;
 return {participantId:session.participantId,clinicId:session.clinicId};
}
export async function therapistActive(env:Env,participantId:string){
 if(!env.DIRECTORY)return false;
 return (await env.DIRECTORY.prepare('SELECT 1 AS ok FROM therapists WHERE participant_id=? AND active=1').bind(participantId).first())!==null&&!await fence(env).isDeactivated(participantId);
}
                                                                                                      
export async function enrollmentUsable(env:Env,codeHash:string){
 if(!env.DIRECTORY||!CODE.test(codeHash)||await fence(env).enrollmentFenced(codeHash))return false;
 return (await env.DIRECTORY.prepare('SELECT 1 AS ok FROM enrollments WHERE code_hash=? AND used_at IS NULL AND revoked_at IS NULL AND expires_at>?').bind(codeHash,Date.now()).first())!==null;
}
   
                                                                                                             
                                                                                                               
                                                                                                           
   
export async function redeemEnrollment(env:Env,issuer:string,subject:string,codeHash:string){
 const db=env.DIRECTORY;if(!db||!CODE.test(codeHash))return false;
 const auth=fence(env),op=crypto.randomUUID(),until=Date.now()+ENROLLMENT_TTL_MS+3600000;
                                                          
 if(!await auth.reserveEnrollment(codeHash,op,until))return false;
 const now=Date.now();
 const existing=await db.prepare('SELECT participant_id AS participantId FROM therapists WHERE issuer=? AND subject=?').bind(issuer,subject).first<{participantId:string}>();
 const participantId=existing?.participantId??crypto.randomUUID();
                                             
 const priorGeneration=existing?await auth.deactivationGeneration(participantId):null;
 const mine='code_hash=? AND used_at=? AND used_by=?';
 let consumed:boolean;
 try{
  const [result]=await db.batch([
                                                                         
                                                 
   db.prepare('UPDATE enrollments SET used_at=?, used_by=? WHERE code_hash=? AND used_at IS NULL AND revoked_at IS NULL AND expires_at>? AND (SELECT participant_id FROM therapists WHERE issuer=? AND subject=?) IS ? AND NOT EXISTS (SELECT 1 FROM therapists WHERE issuer=? AND subject=? AND clinic_id<>enrollments.clinic_id)').bind(now,participantId,codeHash,now,issuer,subject,existing?participantId:null,issuer,subject),
                                                       
   db.prepare(`UPDATE therapists SET active=1, is_admin=MAX(is_admin,(SELECT grant_admin FROM enrollments WHERE ${mine})), display_name=(SELECT display_name FROM enrollments WHERE ${mine}) WHERE issuer=? AND subject=? AND clinic_id=(SELECT clinic_id FROM enrollments WHERE ${mine})`).bind(codeHash,now,participantId,codeHash,now,participantId,issuer,subject,codeHash,now,participantId),
   db.prepare(`INSERT INTO therapists (participant_id,clinic_id,issuer,subject,active,is_admin,display_name) SELECT ?,clinic_id,?,?,1,grant_admin,display_name FROM enrollments WHERE ${mine} AND NOT EXISTS (SELECT 1 FROM therapists WHERE issuer=? AND subject=?)`).bind(participantId,issuer,subject,codeHash,now,participantId,issuer,subject),
   db.prepare(`INSERT INTO admin_audit (clinic_id,at,actor,action,target,detail) SELECT clinic_id,?,created_by,'enrollment_redeemed',?,CASE grant_admin WHEN 1 THEN 'admin' ELSE 'therapist' END FROM enrollments WHERE ${mine}`).bind(now,participantId,codeHash,now,participantId),
  ]);
  consumed=result.meta.changes===1;
 }catch(cause){
                                                                          
                                                 
  const landed=await db.prepare(`SELECT 1 AS ok FROM enrollments WHERE ${mine}`).bind(codeHash,now,participantId).first().catch(()=>undefined);
  if(landed===undefined)throw cause;
  consumed=landed!==null;
  if(!consumed)console.warn(JSON.stringify({event:'enrollment_redeem_rolled_back',message:cause instanceof Error?cause.message.slice(0,120):''}));
 }
 if(!consumed){
                                                              
  const usable=await db.prepare('SELECT 1 AS ok FROM enrollments WHERE code_hash=? AND used_at IS NULL AND revoked_at IS NULL').bind(codeHash).first().catch(()=>null);
  if(usable)await auth.releaseEnrollment(codeHash,op);
  return false;
 }
 await auth.fenceEnrollment(codeHash,until);
                                                   
 if(priorGeneration!==null)await auth.clearDeactivated(participantId,priorGeneration);
 return true;
}
export async function adminDirectory(env:Env,admin:Admin){
 const db=env.DIRECTORY!,now=Date.now();
 const [therapists,enrollments,audit]=await db.batch([
  db.prepare('SELECT participant_id AS participantId, display_name AS displayName, is_admin AS isAdmin, active FROM therapists WHERE clinic_id=? ORDER BY active DESC, is_admin DESC, display_name').bind(admin.clinicId),
  db.prepare('SELECT code_hash AS id, display_name AS displayName, grant_admin AS grantAdmin, created_at AS createdAt, expires_at AS expiresAt FROM enrollments WHERE clinic_id=? AND used_at IS NULL AND revoked_at IS NULL AND expires_at>? ORDER BY created_at DESC').bind(admin.clinicId,now),
  db.prepare('SELECT at, actor, action, target, detail FROM admin_audit WHERE clinic_id=? ORDER BY id DESC LIMIT 50').bind(admin.clinicId),
 ]);
 const rows=therapists.results as {participantId:string;displayName:string|null;isAdmin:number;active:number}[];
 const fenced=new Set(await fence(env).deactivatedAmong(rows.map(t=>t.participantId)));
 return {
  me:admin.participantId,
  therapists:rows.map(t=>({participantId:t.participantId,displayName:t.displayName,isAdmin:t.isAdmin===1,active:t.active===1&&!fenced.has(t.participantId)})),
  enrollments:(enrollments.results as {id:string;displayName:string;grantAdmin:number;createdAt:number;expiresAt:number}[]).map(e=>({...e,grantAdmin:e.grantAdmin===1})),
  audit:audit.results,
 };
}
export async function createEnrollment(env:Env,admin:Admin,input:z.infer<typeof enrollmentInputSchema>,origin:string){
 const code=randomToken(),codeHash=await hashToken(code),now=Date.now(),expiresAt=now+ENROLLMENT_TTL_MS,db=env.DIRECTORY!;
 await db.batch([
  db.prepare('INSERT INTO enrollments (code_hash,clinic_id,display_name,grant_admin,created_by,created_at,expires_at) VALUES (?,?,?,?,?,?,?)').bind(codeHash,admin.clinicId,input.displayName,input.grantAdmin?1:0,admin.participantId,now,expiresAt),
  db.prepare('INSERT INTO admin_audit (clinic_id,at,actor,action,target,detail) VALUES (?,?,?,?,?,?)').bind(admin.clinicId,now,admin.participantId,'enrollment_created',codeHash.slice(0,12),input.grantAdmin?'admin':'therapist'),
 ]);
                          
 return {id:codeHash,link:origin+'/auth/enroll?code='+code,expiresAt};
}
export async function revokeEnrollment(env:Env,admin:Admin,codeHash:string){
 const db=env.DIRECTORY!,now=Date.now();
 const owned=await db.prepare('SELECT expires_at AS expiresAt FROM enrollments WHERE code_hash=? AND clinic_id=?').bind(codeHash,admin.clinicId).first<{expiresAt:number}>();
 if(!owned)return error('PERMISSION_DENIED',403);
 await fence(env).fenceEnrollment(codeHash,owned.expiresAt+3600000);
 const [revoked]=await db.batch([
  db.prepare('UPDATE enrollments SET revoked_at=? WHERE code_hash=? AND clinic_id=? AND used_at IS NULL AND revoked_at IS NULL').bind(now,codeHash,admin.clinicId),
  db.prepare("INSERT INTO admin_audit (clinic_id,at,actor,action,target,detail) SELECT clinic_id,?,?,'enrollment_revoked',?,NULL FROM enrollments WHERE code_hash=? AND clinic_id=? AND revoked_at=?").bind(now,admin.participantId,codeHash.slice(0,12),codeHash,admin.clinicId,now),
 ]);
 return revoked.meta.changes===1?json({revoked:true}):error('PERMISSION_DENIED',403);
}
   
                                                                                                               
                                                                                                            
                                                                                                              
   
export async function deactivateTherapist(env:Env,admin:Admin,participantId:string){
 const db=env.DIRECTORY!,now=Date.now();
                                                         
                                                                           
                                                  
 const admins=(await db.prepare('SELECT participant_id AS participantId FROM therapists WHERE clinic_id=? AND is_admin=1 AND active=1').bind(admin.clinicId).all<{participantId:string}>()).results.map(r=>r.participantId);
 const fenced=await fence(env).deactivatedAmong(admins);
 const effectiveOthers=admins.filter(id=>id!==participantId&&!fenced.includes(id));
 if(admins.includes(participantId)&&!fenced.includes(participantId)&&effectiveOthers.length===0)return error('LAST_ADMIN',409);
 const fencedJson=JSON.stringify(fenced);
 const [changed]=await db.batch([
  db.prepare('UPDATE therapists SET active=0 WHERE participant_id=? AND clinic_id=? AND active=1 AND (is_admin=0 OR participant_id IN (SELECT value FROM json_each(?)) OR (SELECT COUNT(*) FROM therapists AS t WHERE t.clinic_id=? AND t.is_admin=1 AND t.active=1 AND t.participant_id<>? AND t.participant_id NOT IN (SELECT value FROM json_each(?)))>0)').bind(participantId,admin.clinicId,fencedJson,admin.clinicId,participantId,fencedJson),
  db.prepare("INSERT INTO admin_audit (clinic_id,at,actor,action,target,detail) SELECT clinic_id,?,?,'therapist_deactivated',participant_id,NULL FROM therapists WHERE participant_id=? AND clinic_id=? AND active=0 AND changes()=1").bind(now,admin.participantId,participantId,admin.clinicId),
 ]);
 if(changed.meta.changes!==1){
  const target=await db.prepare('SELECT is_admin AS isAdmin, active FROM therapists WHERE participant_id=? AND clinic_id=?').bind(participantId,admin.clinicId).first<{isAdmin:number;active:number}>();
                                                 
  if(target&&target.active===0){await fence(env).markDeactivated(participantId);await fence(env).revokeParticipant(participantId);}
  return target?.active===1&&target.isAdmin===1?error('LAST_ADMIN',409):error('PERMISSION_DENIED',403);
 }
 await fence(env).markDeactivated(participantId);
                                                                  
 await fence(env).revokeParticipant(participantId);
 return json({deactivated:true});
}
