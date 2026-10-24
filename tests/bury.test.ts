import {describe,expect,it} from 'vitest';
import {BURY_STEPS,MIN_Y,buriedDepth,buriedShare,buryDeeper,digOut,keepDepth} from '../apps/web/src/bury';
                                                                   
describe('bury',()=>{
 it('steps down by a share of the height and stops at the deepest step',()=>{
  const h=1;let y=0;const seen:number[]=[];
  for(;;){const next=buryDeeper(0,y,h);if(next===null)break;seen.push(next);y=next;}
  expect(seen).toEqual(BURY_STEPS.map(s=>-s*h));
  expect(buriedShare(0,y,h)).toBeCloseTo(.85,3);
 });
 it('measures depth against the sand under the object, not y = 0',()=>{
  expect(buriedDepth(.5,.2)).toBeCloseTo(.3,3);
  expect(buriedDepth(.2,.5)).toBe(0);
  expect(buryDeeper(.5,.5,1)).toBeCloseTo(.2,3);
 });
 it('needs a known height',()=>{
  expect(buryDeeper(0,0,0)).toBeNull();
  expect(buryDeeper(0,0,Number.NaN)).toBeNull();
  expect(buriedShare(0,-1,0)).toBe(0);
 });
 it('never goes below the protocol floor, and refuses a step that would not go deeper',()=>{
  expect(buryDeeper(-1.4,-1.4,3)).toBe(MIN_Y);
  expect(buryDeeper(-1.5,-1.5,3)).toBeNull();
  expect(keepDepth(-1.2,1)).toBe(MIN_Y);
 });
 it('digs out to the sand surface, and only when buried',()=>{
  expect(digOut(.4,-.2)).toBe(.4);
  expect(digOut(.4,.4)).toBeNull();
  expect(digOut(.4,.9)).toBeNull();
 });
 it('keeps the same depth at a new spot',()=>{
  expect(keepDepth(.6,.25)).toBeCloseTo(.35,3);
  expect(keepDepth(.6,0)).toBe(.6);
 });
});
