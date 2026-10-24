import {describe,it,expect} from 'vitest';
import {focusPose,easeOut,lerp3,FOCUS_NEAR,FOCUS_FAR,FOCUS_MIN_ELEVATION,type Vec3} from '../apps/web/src/look-at-object';
import {helpCards} from '../apps/web/src/help-cards';
                                                           
const dist=(a:Vec3,b:Vec3)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const unit=(a:Vec3,b:Vec3):Vec3=>{const d=dist(a,b);return [(a[0]-b[0])/d,(a[1]-b[1])/d,(a[2]-b[2])/d];};

describe('focusPose',()=>{
 it('aims at the middle of the object and keeps the current viewing direction',()=>{
  const camera:Vec3=[0,13,15],target:Vec3=[0,0,0];
  const pose=focusPose(camera,target,[4,0,-2],1);
  expect(pose.target).toEqual([4,0.4,-2]);
  const before=unit(camera,target),after=unit(pose.position,pose.target);
  for(let i=0;i<3;i++)expect(after[i]).toBeCloseTo(before[i],6);
 });
 it('clamps the distance between near and far',()=>{
  expect(dist(...(p=>[p.position,p.target] as [Vec3,Vec3])(focusPose([0,40,40],[0,0,0],[1,0,1],1)))).toBeCloseTo(FOCUS_FAR,6);
  expect(dist(...(p=>[p.position,p.target] as [Vec3,Vec3])(focusPose([0,1,1],[0,0,0],[1,0,1],1)))).toBeCloseTo(FOCUS_NEAR,6);
 });
 it('lifts a camera lying almost flat on the sand to the minimum elevation',()=>{
  const pose=focusPose([0,0.2,10],[0,0,0],[2,0,0],0);
  expect(unit(pose.position,pose.target)[1]).toBeCloseTo(FOCUS_MIN_ELEVATION,6);
  expect(pose.position[1]).toBeGreaterThan(0);
 });
 it('falls back to the default oblique direction when camera and target coincide',()=>{
  const pose=focusPose([1,1,1],[1,1,1],[0,0,0],0);
  expect(pose.position.every(Number.isFinite)).toBe(true);
  expect(pose.position[1]).toBeGreaterThan(0);
 });
 it('caps very tall objects so the aim stays near the sand',()=>{
  expect(focusPose([0,13,15],[0,0,0],[0,0,0],50).target[1]).toBeCloseTo(1.6,6);
 });
 it('eases out and interpolates',()=>{
  expect(easeOut(-1)).toBe(0);expect(easeOut(2)).toBe(1);expect(easeOut(0.5)).toBeGreaterThan(0.5);
  expect(lerp3([0,0,0],[2,4,6],0.5)).toEqual([1,2,3]);
 });
});

describe('helpCards',()=>{
 const roles=['local','client','therapist'] as const;
 it('always shows the same three cards in the same order',()=>{
  for(const role of roles)for(const narrow of [false,true])expect(helpCards(role,narrow).map(c=>c.title)).toEqual(['選物件與放置','移動物件與轉視角','同意與收回操作']);
 });
 it('only explains controls: no hints about what to place or what it means',()=>{
  const banned=['應該','建議放','代表','象徵','意義','解讀','診斷','情緒'];
  for(const role of roles)for(const narrow of [false,true])for(const card of helpCards(role,narrow))for(const line of card.lines)for(const word of banned)expect(line,`${role}/${card.title}`).not.toContain(word);
 });
 it('names the buttons the client really sees for consent',()=>{
  const text=helpCards('client',false)[2]!.lines.join('');
  for(const label of ['同意上述動作','拒絕','收回全部操作'])expect(text).toContain(label);
  expect(helpCards('therapist',false)[2]!.lines.join('')).toContain('請求操作選中物件');
 });
 it('points phone users to the bottom drawer instead of the left shelf',()=>{
  expect(helpCards('client',true)[0]!.lines.join('')).toContain('「物件架」');
  expect(helpCards('client',false)[0]!.lines.join('')).toContain('左邊物件架');
 });
});
