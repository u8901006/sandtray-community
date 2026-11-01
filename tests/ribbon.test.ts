import {describe,it,expect} from 'vitest';
import {parseInbound,sceneSnapshotV2Schema,ribbonsWithoutObject,RIBBON_MAX,outboundSchemas,type Ribbon} from '../packages/protocol/src/index';
import {ribbonAnchors,lineControls,loopControls,hull2d,ribbonSamples,ribbonStrip,ribbonPath,pickRibbonObject,LOOP_MARGIN,RIBBON_PICK_MAX} from '../apps/web/src/ribbon';
import {coveringCloths,coveredIds} from '../apps/web/src/cloth';

                                                                                                                                        
                                                                 
const base={protocolVersion:1,operationId:'op-1',sessionEpoch:1,controlEpoch:1};
const create=(extra:Record<string,unknown>)=>JSON.stringify({...base,type:'ribbon.create',ribbonId:'r1',objectIds:['a','b'],closed:false,color:1,...extra});
const item=(id:string,x:number,z:number,trayId='dry',y=0)=>({id,trayId,assetId:'X',transform:{position:[x,y,z] as [number,number,number],rotation:[0,0,0,1] as [number,number,number,number],scale:1}});
const offsets={dry:-6,wet:6};

describe('ribbon protocol',()=>{
 it('ribbon.create takes 2-6 object ids, a shape and one of the 12 colours; ribbon.delete takes an id',()=>{
  expect(parseInbound(create({}))).toMatchObject({type:'ribbon.create',objectIds:['a','b'],closed:false,color:1});
  expect(parseInbound(create({objectIds:['a','b','c','d','e','f'],closed:true,color:12}))).toMatchObject({closed:true,color:12});
  for(const bad of [{objectIds:['a']},{objectIds:['a','b','c','d','e','f','g']},{color:0},{color:13},{closed:'yes'},{ribbonId:'bad id'},{extra:1},{objectIds:['a','b c']}])
   expect(()=>parseInbound(create(bad))).toThrow();
  expect(()=>parseInbound(JSON.stringify({...base,type:'ribbon.create',ribbonId:'r1',objectIds:['a','b'],color:1}))).toThrow();                  
  expect(parseInbound(JSON.stringify({...base,type:'ribbon.delete',ribbonId:'r1'}))).toMatchObject({type:'ribbon.delete',ribbonId:'r1'});
  expect(Object.keys(outboundSchemas)).not.toContain('ribbon.changed');                             
 });
 it('the snapshot may carry ribbons that link distinct objects of one tray; older snapshots without them still parse',()=>{
  const tray=(id:'dry'|'wet')=>({id,kind:id,shape:'rect',sizeCm:{w:72,h:57,depth:7},heightmap:{w:144,h:114,encoding:'u8-base64',data:'A'.repeat(21888)},waterLevel:0,baseColor:'#1F5F8B'});
  const objects=[item('a',0,0),item('b',1,0),item('c',0,0,'wet')].map(o=>({...o,assetVersion:'v1',materialOverrides:{},hidden:false,revision:0}));
  const scene=(ribbons?:Ribbon[])=>({schemaVersion:2,sceneId:'s',sceneRevision:1,trays:[tray('dry'),tray('wet')],objects,environment:{sandColor:'#deceac',backgroundColor:'#e9e5db'},updatedAt:1,...(ribbons?{ribbons}:{})});
  expect(sceneSnapshotV2Schema.safeParse(scene()).success).toBe(true);
  expect(sceneSnapshotV2Schema.safeParse(scene([{id:'r',objectIds:['a','b'],closed:true,color:3}])).success).toBe(true);
  for(const objectIds of [['a','c'],['a','a'],['a','gone']])expect(sceneSnapshotV2Schema.safeParse(scene([{id:'r',objectIds,closed:false,color:3}])).success).toBe(false);
  expect(RIBBON_MAX).toBe(24);
 });
 it('deleting an object takes it out of every ribbon, and drops a ribbon left with one object',()=>{
  const ribbons:Ribbon[]=[{id:'r1',objectIds:['a','b'],closed:false,color:1},{id:'r2',objectIds:['a','b','c'],closed:true,color:2},{id:'r3',objectIds:['c','d'],closed:false,color:3}];
  expect(ribbonsWithoutObject(ribbons,'a')).toEqual([{id:'r2',objectIds:['b','c'],closed:true,color:2},ribbons[2]]);
  expect(ribbonsWithoutObject(ribbons,'zzz')[0]).toBe(ribbons[0]);                                        
 });
});

describe('ribbon shape',()=>{
 const items=[item('a',-2,0),item('b',2,1),item('c',0,-2),item('w',0,0,'wet')];
 const heights={a:2,b:1,c:4};
 it('touches each object part way up, in world coordinates of its tray',()=>{
  const a=ribbonAnchors({id:'r',objectIds:['a','b'],closed:false,color:1},items,heights,offsets,new Map())!;
  expect(a.trayId).toBe('dry');expect(a.points[0]).toEqual([-8,1.1,0]);expect(a.points[1][0]).toBe(-4);expect(a.points[1][1]).toBeCloseTo(.55,9);
  const tall=ribbonAnchors({id:'r',objectIds:['c','a'],closed:false,color:1},items,{c:10},offsets,new Map())!;expect(tall.points[0][1]).toBe(2);         
 });
 it('is not drawn when fewer than two of its objects are present, or they are in different trays',()=>{
  expect(ribbonAnchors({id:'r',objectIds:['a','gone'],closed:false,color:1},items,heights,offsets,new Map())).toBeNull();
  expect(ribbonAnchors({id:'r',objectIds:['a','w'],closed:false,color:1},items,heights,offsets,new Map())).toBeNull();
 });
 it('an object under a cloth is touched on the cloth top at the cloth centre, not where the object stands',()=>{
  const cloth={id:'cl',trayId:'dry',assetId:'CLT_SQUARE_CLOTH',transform:{position:[1.5,0,0.8] as [number,number,number],rotation:[0,0,0,1] as [number,number,number,number],scale:1}};
  const under=item('u',1.8,1.0);
  const cover=coveringCloths([cloth,under,items[0]],{u:.3},()=>1.6);
  expect([...cover.keys()]).toEqual(['u']);expect([...coveredIds([cloth,under,items[0]],{u:.3},()=>1.6)]).toEqual(['u']);
  const a=ribbonAnchors({id:'r',objectIds:['a','u'],closed:false,color:1},[cloth,under,items[0]],{u:.3},offsets,cover)!;
  expect(a.points[1][0]).toBe(-6+1.5);expect(a.points[1][2]).toBe(0.8);expect(a.points[1][1]).toBeCloseTo(cover.get('u')!.top+.05,9);
 });
 it('a line goes through every touch point in order and arches between them',()=>{
  const c=lineControls([[0,1,0],[4,1,0],[4,2,3]]);
  expect(c.length).toBe(5);expect(c[0]).toEqual([0,1,0]);expect(c[2]).toEqual([4,1,0]);expect(c[4]).toEqual([4,2,3]);
  expect(c[1][1]).toBeCloseTo(1+.2+.12*4,9);expect(c[3][1]).toBeGreaterThan(2);
 });
 it('a loop keeps at least LOOP_MARGIN (less the sampling chord) outside every base, at one height above the highest base',()=>{
  const items3=[item('a',-2,0,'dry',.1),item('b',2,1,'dry',.4),item('c',0,-2,'dry',-.3)];
  const anchors=ribbonAnchors({id:'r',objectIds:['a','b','c'],closed:true,color:1},items3,{},offsets,new Map())!;
  const controls=loopControls(anchors);expect(new Set(controls.map(p=>p[1])).size).toBe(1);expect(controls[0][1]).toBeCloseTo(.6,9);
  const samples=ribbonSamples(controls,true);
  for(const [x,,z] of samples)for(const [ax,,az] of anchors.points)expect(Math.hypot(x-ax,z-az)).toBeGreaterThan(LOOP_MARGIN*.95);
                                          
  const two=loopControls(ribbonAnchors({id:'r',objectIds:['a','b'],closed:true,color:1},items3,{},offsets,new Map())!);expect(two.length).toBeGreaterThan(8);
 });
 it('hull2d drops inner and collinear points',()=>{
  expect(hull2d([[0,0],[2,0],[1,0],[2,2],[0,2],[1,1]])).toEqual([[0,0],[2,0],[2,2],[0,2]]);
 });
 it('the strip has two vertices per sample; a loop closes, a line does not',()=>{
  const samples=ribbonSamples([[0,0,0],[1,0,0],[2,0,1]],false);
  const open=ribbonStrip(samples,false,.2,false);expect(open.positions.length).toBe(samples.length*6);expect(open.indices.length).toBe((samples.length-1)*6);
                                                                                                  
  const p=open.positions;expect(p[1]).toBe(p[4]);expect(Math.hypot(p[0]-p[3],p[2]-p[5])).toBeCloseTo(.2,6);
  const loop=ribbonStrip(ribbonSamples([[0,0,0],[1,0,0],[1,0,1],[0,0,1]],true),true,.2,true);expect(loop.indices.length).toBe(loop.positions.length);                    
  expect(loop.positions[1]).toBeCloseTo(loop.positions[4]-.2,6);          
  expect(ribbonPath({id:'r',objectIds:['a','b','c'],closed:false,color:1},items,heights,offsets,new Map())!.samples.length).toBeGreaterThan(20);
 });
});

describe('choosing what a ribbon links',()=>{
 const trayOf=(id:string)=>({a:'dry',b:'dry',w:'wet'} as Record<string,string>)[id];
 it('adds objects in order, a second tap takes one out, only one tray, at most six',()=>{
  let r=pickRibbonObject([],{id:'a',trayId:'dry'},trayOf);expect(r.picked).toEqual(['a']);
  r=pickRibbonObject(r.picked,{id:'b',trayId:'dry'},trayOf);expect(r.picked).toEqual(['a','b']);
  expect(pickRibbonObject(r.picked,{id:'a',trayId:'dry'},trayOf).picked).toEqual(['b']);
  const wet=pickRibbonObject(r.picked,{id:'w',trayId:'wet'},trayOf);expect(wet.picked).toEqual(['a','b']);expect(wet.notice).toContain('同一盤');
  const full=pickRibbonObject(['a','1','2','3','4','5'],{id:'b',trayId:'dry'},trayOf);expect(full.picked.length).toBe(RIBBON_PICK_MAX);expect(full.notice).toContain('6');
 });
});
