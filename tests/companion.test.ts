import {describe,it,expect} from 'vitest';
import {readCompanion,writeCompanion,canFollow,effectiveMode,clampToViewport,followTarget,followStep,settled,overControl,COMPANION_DEFAULT,COMPANION_KEY,COMPANION_SIZE,TRAIL} from '../apps/web/src/companion';

                                                                                        
const store=(init:Record<string,string>={})=>{const m=new Map(Object.entries(init));return {getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>void m.set(k,v),m};};
describe('companion preferences',()=>{
 it('is off by default and when storage is missing, empty, malformed or throws',()=>{
  expect(COMPANION_DEFAULT.enabled).toBe(false);
  expect(readCompanion(undefined)).toEqual(COMPANION_DEFAULT);
  expect(readCompanion(store())).toEqual(COMPANION_DEFAULT);
  expect(readCompanion(store({[COMPANION_KEY]:'{not json'}))).toEqual(COMPANION_DEFAULT);
  expect(readCompanion({getItem:()=>{throw new Error('blocked');}})).toEqual(COMPANION_DEFAULT);
 });
 it('round-trips, and rejects unknown animals, modes and truthy-but-not-true flags',()=>{
  const s=store();writeCompanion(s,{enabled:true,animal:'turtle',mode:'follow'});
  expect(readCompanion(s)).toEqual({enabled:true,animal:'turtle',mode:'follow'});
  expect(readCompanion(store({[COMPANION_KEY]:JSON.stringify({enabled:'yes',animal:'dragon',mode:'fly'})}))).toEqual(COMPANION_DEFAULT);
  expect(()=>writeCompanion({setItem:()=>{throw new Error('quota');}},COMPANION_DEFAULT)).not.toThrow();
 });
});
describe('companion movement',()=>{
 const desk={fineHover:true,wide:true,reducedMotion:false};
 it('follows only with a mouse, on a wide screen, with motion allowed; otherwise it stays parked',()=>{
  const on={...COMPANION_DEFAULT,enabled:true,mode:'follow' as const};
  expect(canFollow(desk)).toBe(true);expect(effectiveMode(on,desk)).toBe('follow');
  for(const env of [{...desk,fineHover:false},{...desk,wide:false},{...desk,reducedMotion:true}]){expect(canFollow(env)).toBe(false);expect(effectiveMode(on,env)).toBe('park');}
  expect(effectiveMode({...on,mode:'park'},desk)).toBe('park');
 });
 it('trails beside the pointer, never under the tip, and stays inside the viewport',()=>{
  expect(followTarget(100,100,1000,800)).toEqual([100+TRAIL[0],100+TRAIL[1]]);
  expect(followTarget(990,790,1000,800)).toEqual([1000-COMPANION_SIZE,800-COMPANION_SIZE]);
  expect(clampToViewport(-50,-50,1000,800)).toEqual([0,0]);
  expect(clampToViewport(10,10,40,40)).toEqual([0,0]);                                                                 
 });
 it('smoothing moves part of the way each frame, independent of frame rate, and settles',()=>{
  const a:[number,number]=[0,0],b:[number,number]=[100,0];
  const one=followStep(a,b,1/30),two=followStep(followStep(a,b,1/60),b,1/60);
  expect(one[0]).toBeGreaterThan(0);expect(one[0]).toBeLessThan(100);expect(two[0]).toBeCloseTo(one[0],9);
  let p=a;for(let i=0;i<120;i++)p=followStep(p,b,1/60);expect(settled(p,b)).toBe(true);
  expect(followStep(a,b,0)).toEqual(a);expect(followStep(a,b,-1)).toEqual(a);
 });
 it('fades over anything you can press or type in',()=>{
  const at=(hit:boolean)=>({closest:(sel:string)=>hit&&sel.includes('button')?{}:null});
  expect(overControl(at(true))).toBe(true);expect(overControl(at(false))).toBe(false);expect(overControl(null)).toBe(false);
 });
});
