import type {Env} from './env';
import {authenticate} from './auth';
import {error} from './http';
                                                            
                                                                                      
                                                                                     
                                                                        
                                                    
const PUBLIC_SHELL=/^\/(?:index\.html|assets\/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)?$/;
export function staticLoginRequired(env:Pick<Env,'DEPLOY_ENV'>,pathname:string){return env.DEPLOY_ENV!==undefined&&!PUBLIC_SHELL.test(pathname)&&!['/source.html','/source-code.zip'].includes(pathname);}
const CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' blob:; worker-src 'self' blob:; frame-ancestors 'none'";
export async function serveStatic(request:Request,env:Env,pathname:string):Promise<Response>{
 const gated=staticLoginRequired(env,pathname);
 if(gated&&!await authenticate(request,env))return error();
 const assetResponse=await env.ASSETS.fetch(request);
                                                                                                    
 if(gated&&!await authenticate(request,env)){await assetResponse.body?.cancel();return error();}
 const response=new Response(assetResponse.body,assetResponse);
 response.headers.set('Referrer-Policy','no-referrer');response.headers.set('X-Content-Type-Options','nosniff');
                                                                                                                   
 if(response.headers.get('Content-Type')?.startsWith('text/html'))response.headers.set('Cache-Control','no-cache');
 // 需登入的檔案不得進共用快取；瀏覽器可留存但每次都要經 Worker 重新驗證（ETag／304 由資產伺服器處理）。
 else if(gated)response.headers.set('Cache-Control','private, no-cache');
 if(gated)response.headers.append('Vary','Cookie');
 response.headers.set('Content-Security-Policy',CSP);return response;
}
