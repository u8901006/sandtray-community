import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {parseInbound,outboundSchemas,traySchema,SPRAY_COLORS} from '../packages/protocol/src/index';
import {createStandardHeightmap,createTrayHeightmap} from '../packages/sand-engine/src/tray';
import {bytesToBase64} from '../packages/sand-engine/src/core';
import {createPaint,sprayTray,strokeTrayPainted,hasPaint,SPRAY_RADIUS_CM} from '../packages/sand-engine/src/paint';
import {TrayModel} from '../apps/web/src/tray-model';
import {paintedShade,SPRAY_TINTS,SPRAY_OPACITY} from '../apps/web/src/sandtray-surface';
                                                                                                                                        
const base={protocolVersion:1,operationId:'op-1',sessionEpoch:1,controlEpoch:1};
const frame=(value:Record<string,unknown>)=>JSON.stringify({...base,...value});
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const rc=SPRAY_RADIUS_CM*2;

describe('protocol: sand.spray / tray.wash / paint map',()=>{
 it('has exactly 12 colours, and a spray takes colour 1..12 with 1..8 integer cells on either tray',()=>{
  expect(SPRAY_COLORS).toHaveLength(12);expect(new Set(SPRAY_COLORS.map(c=>c.hex)).size).toBe(12);
  expect(parseInbound(frame({type:'sand.spray',trayId:'wet',color:12,points:[[1,1]],gestureId:'g'}))).toMatchObject({type:'sand.spray',color:12});
  for(const bad of [{color:0},{color:13},{color:1.5},{color:'1'},{points:[]},{points:Array.from({length:9},()=>[1,1])},{points:[[240,0]]},{trayId:'sea'},{radius:9}])
   expect(()=>parseInbound(frame({type:'sand.spray',trayId:'dry',color:1,points:[[1,1]],...bad}))).toThrow();
 });
 it('tray.wash names one tray and nothing else',()=>{
  expect(parseInbound(frame({type:'tray.wash',trayId:'dry'}))).toMatchObject({type:'tray.wash',trayId:'dry'});
  expect(()=>parseInbound(frame({type:'tray.wash',trayId:'sea'}))).toThrow();expect(()=>parseInbound(frame({type:'tray.wash'}))).toThrow();
  expect(()=>parseInbound(frame({type:'tray.wash',trayId:'dry',color:1}))).toThrow();
 });
 it('tray.changed carries a spray or a wash; the snapshot paint map must match the heightmap',()=>{
  const out={protocolVersion:1,type:'tray.changed',sessionEpoch:1,serverSeq:3,trayId:'dry',trayRevision:2,sceneRevision:5,operationId:'op-1',waterLevel:0};
  expect(outboundSchemas['tray.changed'].parse({...out,spray:{color:3,points:[[3,4]]}})).toBeTruthy();
  expect(outboundSchemas['tray.changed'].parse({...out,wash:true})).toBeTruthy();
  expect(()=>outboundSchemas['tray.changed'].parse({...out,wash:false})).toThrow();
  expect(()=>outboundSchemas['tray.changed'].parse({...out,spray:{color:13,points:[[3,4]]}})).toThrow();
  const hm=createStandardHeightmap(),map=(w:number,h:number)=>({w,h,encoding:'u8-base64',data:bytesToBase64(new Uint8Array(w*h))});
  const tray={id:'dry',kind:'dry',shape:'rect',sizeCm:{w:72,h:57,depth:7},heightmap:map(hm.w,hm.h),waterLevel:0,baseColor:'#1F5F8B',revision:0};
  expect(traySchema.parse(tray)).toBeTruthy();expect(traySchema.parse({...tray,paint:map(144,114)})).toBeTruthy();
  expect(()=>traySchema.parse({...tray,paint:map(114,144)})).toThrow();
 });
});

describe('spray kernel',()=>{
 it('paints the whole core, a thinning mist out to the radius, and nothing beyond it',()=>{
  const hm=createStandardHeightmap(),paint=createPaint(hm);sprayTray(hm,paint,5,[[72,57]]);
  for(let j=0;j<hm.h;j++)for(let i=0;i<hm.w;i++){const d2=(i-72)**2+(j-57)**2,v=paint[j*hm.w+i];
   if(d2<=(rc/2)**2)expect(v).toBe(5);if(d2>rc*rc)expect(v).toBe(0);}
                                                                                 
  const ring=(lo:number,hi:number)=>{let n=0,c=0;for(let j=0;j<hm.h;j++)for(let i=0;i<hm.w;i++){const d=Math.hypot(i-72,j-57);if(d>lo&&d<=hi){n++;if(paint[j*hm.w+i])c++;}}return c/n;};
  expect(ring(rc/2,rc*.75)).toBeGreaterThan(ring(rc*.75,rc));expect(ring(rc*.75,rc)).toBeGreaterThan(0);expect(ring(rc/2,rc)).toBeLessThan(1);
 });
 it('only sand cells take colour (a round tray leaves its corners clean) and a later colour covers an earlier one',()=>{
  const hm=createTrayHeightmap({shape:'circle',w:60,h:60,depth:7}),paint=createPaint(hm);
  sprayTray(hm,paint,2,[[0,0],[119,119],[60,60]]);for(let k=0;k<paint.length;k++)if(!hm.mask[k])expect(paint[k]).toBe(0);
  expect(paint[60*hm.w+60]).toBe(2);sprayTray(hm,paint,9,[[60,60]]);expect(paint[60*hm.w+60]).toBe(9);
 });
 it('never touches the heightmap',()=>{const hm=createStandardHeightmap(),before=hm.data.slice();sprayTray(hm,createPaint(hm),1,[[10,10],[100,100]]);expect(Buffer.from(hm.data).equals(Buffer.from(before))).toBe(true);});
 it('is deterministic: a fixed 300-puff sequence always gives the same bytes (pinned, so Node and the browser must agree)',()=>{
  const run=()=>{const hm=createStandardHeightmap(),paint=createPaint(hm);let seed=7;const next=()=>{seed=(Math.imul(seed,1103515245)+12345)>>>0;return seed;};
   for(let n=0;n<300;n++)sprayTray(hm,paint,1+next()%12,[[next()%144,next()%114]]);return paint;};
  const a=run();expect(sha(a)).toBe(sha(run()));expect(sha(a)).toBe(PINNED);
 });
 it('digging or heaping clears colour where the sand moved; smoothing keeps it',()=>{
  for(const tool of ['dig','mound'] as const){const hm=createStandardHeightmap(),paint=createPaint(hm);sprayTray(hm,paint,4,[[72,57]]);
   const before=hm.data.slice();strokeTrayPainted(hm,paint,tool,[[72,57]]);
   for(let k=0;k<paint.length;k++){if(hm.data[k]!==before[k])expect(paint[k]).toBe(0);}
   expect(paint[57*144+72]).toBe(0);expect(hasPaint(paint)).toBe(true);}                                                   
  const hm=createStandardHeightmap(),paint=createPaint(hm);sprayTray(hm,paint,4,[[72,57]]);strokeTrayPainted(hm,paint,'dig',[[20,20]]);
  const kept=paint.slice();strokeTrayPainted(hm,paint,'smooth',[[72,57],[20,20]]);expect(Buffer.from(paint).equals(Buffer.from(kept))).toBe(true);
 });
});

describe('client TrayModel: spray and wash replay the server exactly',()=>{
 it('optimistic puffs then in-order replay of spray, dig and wash give the authority bytes',()=>{
  const hm=createStandardHeightmap(),paint=createPaint(hm),client=new TrayModel('dry');
  client.spray('a',3,[30,30]);client.spray('a',3,[31,30]);expect(hasPaint(client.displayPaint)).toBe(true);expect(client.painted).toBe(false);
  sprayTray(hm,paint,3,[[30,30],[31,30]]);expect(client.replay({trayId:'dry',trayRevision:1,operationId:'a',spray:{color:3,points:[[30,30],[31,30]]},waterLevel:0})).toBe(true);
  strokeTrayPainted(hm,paint,'dig',[[30,30]]);client.replay({trayId:'dry',trayRevision:2,operationId:'b',stroke:{tool:'dig',points:[[30,30]]},waterLevel:0});
  expect(sha(client.confirmedPaint)).toBe(sha(paint));expect(sha(client.displayPaint)).toBe(sha(paint));expect(sha(client.confirmed.data)).toBe(sha(hm.data));expect(client.pending).toEqual([]);
  expect(client.painted).toBe(true);client.replay({trayId:'dry',trayRevision:3,operationId:'c',wash:true,waterLevel:0});
  expect(client.painted).toBe(false);expect(hasPaint(client.displayPaint)).toBe(false);expect(sha(client.confirmed.data)).toBe(sha(hm.data));
 });
 it('a refused puff disappears; a gap asks for the snapshot',()=>{
  const client=new TrayModel('wet');client.spray('x',1,[50,50]);client.drop('x');expect(hasPaint(client.displayPaint)).toBe(false);
  expect(client.replay({trayId:'wet',trayRevision:2,operationId:'y',spray:{color:1,points:[[1,1]]},waterLevel:0})).toBe(false);
 });
 it('adopts a snapshot paint map (none = clean; bytes above 12 show no colour) and refuses a wrong size',()=>{
  const hm=createStandardHeightmap(),client=new TrayModel('dry'),paint=new Uint8Array(hm.w*hm.h);paint[0]=7;paint[1]=200;
  const tray=(p?:Uint8Array,w=hm.w,h=hm.h,revision=1)=>({id:'dry',heightmap:{w:hm.w,h:hm.h,data:bytesToBase64(hm.data)},waterLevel:0,revision,...(p?{paint:{w,h,data:bytesToBase64(p)}}:{})});
  client.adopt(tray(paint));expect(client.confirmedPaint[0]).toBe(7);expect(client.confirmedPaint[1]).toBe(0);
  client.adopt(tray(undefined,hm.w,hm.h,2));expect(client.painted).toBe(false);
  expect(()=>client.adopt(tray(new Uint8Array(10),5,2,3))).toThrow();
 });
 it('local practice: spray, wash and restore of a saved paint map',()=>{
  const client=new TrayModel('dry');client.applyLocalSpray(6,[72,57]);const saved=client.confirmedPaint.slice();expect(client.painted).toBe(true);
  client.washLocal();expect(client.painted).toBe(false);client.restoreLocal(client.confirmed.data.slice(),0,saved);expect(sha(client.displayPaint)).toBe(sha(saved));
 });
});

describe('sand colour',()=>{
 it('no colour keeps the plain shade; a colour moves the shade toward that colour by SPRAY_OPACITY',()=>{
  expect(paintedShade(.9,0)).toEqual([.9,.9,.9]);
  SPRAY_TINTS.forEach((t,k)=>{const [r,g,b]=paintedShade(1,k+1);expect(r).toBeCloseTo(1-SPRAY_OPACITY+SPRAY_OPACITY*t[0]);expect(g).toBeCloseTo(1-SPRAY_OPACITY+SPRAY_OPACITY*t[1]);expect(b).toBeCloseTo(1-SPRAY_OPACITY+SPRAY_OPACITY*t[2]);});
                                                  
  const [rr,,rb]=paintedShade(1,1),[br,,bb]=paintedShade(1,7);expect(rr).toBeGreaterThan(rb);expect(bb).toBeGreaterThan(br);
 });
});
const PINNED='28d245add354d85a06d56048916cd0b2b6161a2f13d1c5a15addae59be2e3730';
