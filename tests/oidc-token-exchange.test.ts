import {afterEach,describe,expect,it,vi} from 'vitest';
import {oidc} from '../apps/worker/src/auth';
import type {Env} from '../apps/worker/src/env';

                                                                                                           
                                                                                                      
                                                                                                     
                                                                                                 
function callbackEnv(created:unknown[]) {
 const sessions={
  consume:async()=>({nonce:'n',verifier:'v'}),
  createSession:async(identity:unknown)=>{created.push(identity);return {token:'t'.repeat(64)};},
  lookup:async()=>null,revoke:async()=>undefined,
 };
 return {
  DEPLOY_ENV:'staging',
  APP_ORIGIN:'https://sandtray.example',
  OIDC_ISSUER:'https://identity.example/',
  OIDC_CLIENT_ID:'sandtray-web',
  OIDC_CLIENT_SECRET:'test-only-not-a-real-secret',
  OIDC_AUTHORIZATION_URL:'https://identity.example/authorize',
  OIDC_TOKEN_URL:'https://identity.example/token',
  OIDC_JWKS_URL:'https://identity.example/jwks',
  DIRECTORY:{},
  AUTH_DO:{getByName:()=>sessions},
 } as unknown as Env;
}
const callback=()=>new Request('https://sandtray.example/auth/callback?state=s&code=c',{headers:{Cookie:'sandtray_login=b'}});

afterEach(()=>vi.unstubAllGlobals());

describe('OIDC token exchange on the Workers runtime',()=>{
 it('never asks fetch for redirect:"error", which Workers reject with a TypeError',async()=>{
  const seen:RequestInit[]=[];
  vi.stubGlobal('fetch',async(_url:unknown,init:RequestInit)=>{seen.push(init);return new Response('{}',{status:400});});
  await oidc(callback(),callbackEnv([]));
  expect(seen).toHaveLength(1);
  expect(seen[0].redirect).toBe('manual');
 });

 it('treats a redirecting token endpoint as a rejected login and creates no session',async()=>{
  const created:unknown[]=[];
  vi.stubGlobal('fetch',async()=>new Response(null,{status:302,headers:{Location:'https://elsewhere.example/'}}));
  const response=await oidc(callback(),callbackEnv(created));
                                                                                                  
  expect(response.status).toBe(302);
  expect(response.headers.get('Location')).toBe('/?login=failed');
  expect(response.headers.get('Set-Cookie')??'').not.toContain('sandtray_session=');
  expect(created).toHaveLength(0);
 });
});
