import {describe,it,expect} from 'vitest';
import {scopePose,scopeRange,scopeRemaining,formatRemaining,otherTray,hiddenTrayOf,SCOPE_DURATIONS,SCOPE_ZOOM_DEFAULT,ORBIT_MIN,ORBIT_MAX} from '../apps/web/src/telescope';
import {cameraView} from '../apps/web/src/tray-layout';
import {STANDARD_ROOM_TRAYS,type RoomTrays} from '../packages/protocol/src/index';

                                                       
const dist=(a:number[],b:number[])=>Math.hypot(...a.map((v,i)=>v-b[i]));
const unit=(a:number[],b:number[])=>{const d=dist(a,b);return a.map((v,i)=>(v-b[i])/d);};
describe('telescope',()=>{
 it('looks at the chosen tray, along the same direction as that tray\'s focus view, and hides the other one',()=>{
  for(const tray of ['dry','wet'] as const){
   const base=cameraView(tray,1.6),pose=scopePose(tray,SCOPE_ZOOM_DEFAULT,1.6);
   expect(pose.target).toEqual(base.target);
   unit(pose.position,pose.target).forEach((v,i)=>expect(v).toBeCloseTo(unit(base.position,base.target)[i],9));
   expect(otherTray(tray)).not.toBe(tray);expect(hiddenTrayOf({tray,zoom:.5,duration:30})).toBe(otherTray(tray));
  }
  expect(hiddenTrayOf(null)).toBeNull();
 });
 it('near is closer than far, the slider moves monotonically, and every distance stays inside the orbit limits',()=>{
  const aspects=[0.5,1,1.6,2.4],rooms:RoomTrays[]=[STANDARD_ROOM_TRAYS,{...STANDARD_ROOM_TRAYS,dry:{...STANDARD_ROOM_TRAYS.dry,w:30,h:30},wet:{...STANDARD_ROOM_TRAYS.wet,w:120,h:80}}];
  for(const trays of rooms)for(const a of aspects)for(const tray of ['dry','wet'] as const){
   let last=Infinity;
   for(let k=0;k<=10;k++){const p=scopePose(tray,k/10,a,trays),d=dist(p.position,p.target);
    expect(d).toBeLessThan(last+1e-9);expect(d).toBeGreaterThanOrEqual(ORBIT_MIN-1e-9);expect(d).toBeLessThanOrEqual(ORBIT_MAX+1e-9);last=d;}
   expect(dist(scopePose(tray,1,a,trays).position,scopePose(tray,1,a,trays).target)).toBeLessThan(dist(scopePose(tray,0,a,trays).position,scopePose(tray,0,a,trays).target));
  }
                                                                           
  expect(scopePose('dry',-1,1.6)).toEqual(scopePose('dry',0,1.6));expect(scopePose('dry',2,1.6)).toEqual(scopePose('dry',1,1.6));
  expect(scopeRange(1)).toEqual({near:ORBIT_MIN,far:ORBIT_MIN});expect(scopeRange(100).far).toBe(ORBIT_MAX);
 });
 it('the default slider sits near the existing focus view, a little closer',()=>{
  const base=cameraView('dry',1.6),d0=dist(base.position,base.target),p=scopePose('dry',SCOPE_ZOOM_DEFAULT,1.6);
  const d=dist(p.position,p.target);expect(d).toBeLessThan(d0*1.05);expect(d).toBeGreaterThan(d0*0.8);
 });
 it('durations are 30 s, 1 min and no limit; the countdown rounds up and never goes below zero',()=>{
  expect([...SCOPE_DURATIONS]).toEqual([30,60,null]);
  expect(scopeRemaining(null,123)).toBeNull();
  expect(scopeRemaining(10_000,0)).toBe(10);expect(scopeRemaining(10_000,9_001)).toBe(1);expect(scopeRemaining(10_000,10_000)).toBe(0);expect(scopeRemaining(10_000,99_999)).toBe(0);
  expect(formatRemaining(60)).toBe('1:00');expect(formatRemaining(9)).toBe('0:09');expect(formatRemaining(0)).toBe('0:00');
 });
});
