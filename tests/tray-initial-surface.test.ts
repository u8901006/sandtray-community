import {describe,it,expect} from 'vitest';
import * as protocol from '../packages/protocol/src/index';
                                                                                                                          
                                                                                                                                     
const surface=(depth:number)=>{const fn=Reflect.get(protocol,'trayInitialSurfaceU8');if(typeof fn!=='function')throw new Error('trayInitialSurfaceU8 missing');return fn(depth) as number;};
describe('REQ-016 tray initial sand surface',()=>{
 it.each([[5,159],[6,170],[7,179],[8,185],[9,191],[10,196]])('depth %i cm starts at u8 %i',(depth,expected)=>{expect(surface(depth)).toBe(expected);});
 it('rejects depths outside the 5-10 cm range and non-integers',()=>{for(const bad of [4,11,7.5,Number.NaN])expect(()=>surface(bad)).toThrow();});
 it('the v1 migration default tray (7 cm) still starts at 179',()=>{
  const migrated=protocol.migrateSceneSnapshot({schemaVersion:1,sceneId:'s',sceneRevision:0,objects:[],environment:{sandColor:'#deceac',backgroundColor:'#e9e5db'},updatedAt:1});
  const bytes=Uint8Array.from(atob(migrated.trays[0].heightmap.data),c=>c.charCodeAt(0));
  expect(new Set(bytes)).toEqual(new Set([surface(7)]));
 });
});
