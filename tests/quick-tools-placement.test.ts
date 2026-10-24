import {describe,it,expect} from 'vitest';
import {placeQuickTools,quickToolsTransform,BELOW_GAP,MARGIN,HYSTERESIS} from '../apps/web/src/quick-tools-placement';
                                                                       
const canvas={width:800,height:600},toolbar={width:300,height:52};
const at=(x:number,y:number,height=60)=>({base:{x,y},top:{x,y:y-height},toolbar,canvas});
const lowest=canvas.height-MARGIN-BELOW_GAP-toolbar.height;                    
describe('quick tools placement',()=>{
 it('stays below an object in the middle of the canvas',()=>{expect(placeQuickTools(at(400,300))).toEqual({flip:false,dx:0});});
 it('flips above when the toolbar would leave the bottom of the canvas',()=>{expect(placeQuickTools(at(400,lowest)).flip).toBe(false);expect(placeQuickTools(at(400,lowest+1)).flip).toBe(true);});
 it('flips above when the view buttons sit underneath',()=>{
  const obstacles=[{left:250,right:550,top:520}];
  expect(placeQuickTools({...at(400,440),obstacles}).flip).toBe(true);
  expect(placeQuickTools({...at(120,440),obstacles:[{left:400,right:700,top:520}]}).flip).toBe(false);                  
 });
 it('needs extra room before flipping back down',()=>{
  const flipped={flip:true,dx:0};
  expect(placeQuickTools(at(400,lowest-HYSTERESIS+1),flipped).flip).toBe(true);
  expect(placeQuickTools(at(400,lowest-HYSTERESIS),flipped).flip).toBe(false);
 });
 it('stays below when neither side has room but below has more',()=>{expect(placeQuickTools({...at(400,lowest+20,580),canvas}).flip).toBe(false);});
 it('clamps the toolbar inside the canvas edges',()=>{
  expect(placeQuickTools(at(20,300)).dx).toBe(MARGIN-(20-150));
  expect(placeQuickTools(at(790,300)).dx).toBe(canvas.width-MARGIN-(790+150));
  expect(placeQuickTools({...at(100,300),canvas:{width:250,height:600}}).dx).toBe(125-100);           
 });
 it('writes the CSS transform for both sides',()=>{
  expect(quickToolsTransform({flip:false,dx:0})).toBe(`translate(-50%,${BELOW_GAP}px)`);
  expect(quickToolsTransform({flip:true,dx:-12.4})).toBe('translate(calc(-50% + -12px),calc(-100% - 12px))');
 });
});
