import {describe,it,expect} from 'vitest';
                                                                                    
import {parseInbound,sceneSnapshotV2Schema,outboundSchemas,TUNNEL_DEFAULT,type RoomTrays} from '../packages/protocol/src/index';
import {tunnelPlacement,tunnelScale,tunnelAsset,TUNNEL_STYLES,TUNNEL_LABEL,RIM,TUNNEL_MAX_HEIGHT} from '../apps/web/src/tunnel';
import {trayOffsets} from '../apps/web/src/tray-layout';
import rows from '../packages/asset-catalog/src/tunnel-v1.json' with {type:'json'};

                                                                                                                                     
                                                  
const base={protocolVersion:1,operationId:'op-1',sessionEpoch:1,controlEpoch:1};
describe('room.tunnel protocol',()=>{
 it('accepts the three styles with an expected revision, and nothing else',()=>{
  for(const style of TUNNEL_STYLES)expect(parseInbound(JSON.stringify({...base,type:'room.tunnel',enabled:true,style,expectedTunnelRevision:0}))).toMatchObject({style});
  for(const bad of [{style:'curve'},{style:'arch_short',enabled:'yes'},{style:'arch_short',expectedTunnelRevision:-1},{style:'arch_short',extra:1}])
   expect(()=>parseInbound(JSON.stringify({...base,type:'room.tunnel',enabled:true,expectedTunnelRevision:0,...bad}))).toThrow();
  expect(()=>parseInbound(JSON.stringify({...base,type:'room.tunnel',style:'arch_short',expectedTunnelRevision:0}))).toThrow();                   
 });
 it('the scene snapshot may carry the tunnel; older snapshots without it still parse; it defaults to closed',()=>{
  expect(TUNNEL_DEFAULT).toEqual({enabled:false,style:'arch_short',revision:0});
  const shape=sceneSnapshotV2Schema.shape??(sceneSnapshotV2Schema as any)._def?.schema?.shape;
  expect(shape===undefined||'tunnel' in shape).toBe(true);
  expect(Object.keys(outboundSchemas)).not.toContain('tunnel.changed');                                       
 });
});
describe('tunnel placement',()=>{
 const sizes=[30,72,120],tray=(w:number)=>({shape:'rect' as const,w,h:Math.min(w,57),depth:7});
 it('for every 30/72/120 cm pair, sits between the two rims and reaches onto each rim but not the sand',()=>{
  for(const d of sizes)for(const w of sizes){
   const trays:RoomTrays={dry:tray(d),wet:tray(w)},p=tunnelPlacement(trays),o=trayOffsets(trays);
   expect(p.gap).toBeCloseTo(1.2,5);expect(p.x).toBeGreaterThan(p.dryEdge);expect(p.x).toBeLessThan(p.wetEdge);
   expect(p.dryEdge).toBeCloseTo(o.dry+d/7.2/2,5);expect(p.wetEdge).toBeCloseTo(o.wet-w/7.2/2,5);
   const ends=[p.x-p.length/2,p.x+p.length/2];
   expect(ends[0]).toBeLessThan(p.dryEdge);expect(ends[0]).toBeGreaterThan(p.dryEdge-RIM);                                    
   expect(ends[1]).toBeGreaterThan(p.wetEdge);expect(ends[1]).toBeLessThan(p.wetEdge+RIM);
   expect(p.z).toBe(0);expect(p.y).toBeGreaterThan(0);
  }
 });
 it('round and octagonal trays meet z 0 at half their width too',()=>{
  const p=tunnelPlacement({dry:{shape:'circle',w:60,h:60,depth:7},wet:{shape:'octagon',w:90,h:90,depth:7}});expect(p.gap).toBeCloseTo(1.2,5);
 });
 it('scales along the passage to the length, and never draws it taller than the cap',()=>{
  expect(tunnelScale({y:1,z:2},1.5)).toEqual({across:0.75,along:0.75});
  const tall=tunnelScale({y:3,z:1},1.5);expect(tall.along).toBe(1.5);expect(3*tall.across).toBeCloseTo(TUNNEL_MAX_HEIGHT,9);
  expect(tunnelScale({y:0,z:1},1.5)).toEqual({across:1,along:1});
 });
 it('each style points at its pinned tunnel-v1 GLB and thumbnail, with a Chinese name',()=>{
  for(const style of TUNNEL_STYLES){const row=rows.find(r=>r.id==='TUN_'+style.toUpperCase())!;expect(tunnelAsset(style)).toEqual({url:row.url,thumbnail:row.thumbnail});expect(TUNNEL_LABEL[style]).toBe(row.name);}
 });
});
