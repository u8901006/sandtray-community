import {describe,it,expect,beforeAll} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {resolveAsset,creditsText} from '../packages/asset-catalog/src/index';
import {coveredIds,creditAssets,COVERED_NAME} from '../apps/web/src/cloth';
import {SessionTools} from '../apps/web/src/session-tools';

                                                                                                                             
                                                                                                                    
const Q0=[0,0,0,1] as const;
const make=(id:string,assetId:string,x=0)=>({id,assetId,assetVersion:resolveAsset(assetId)!.version,trayId:'dry' as const,transform:{position:[x,0,0] as const,rotation:Q0,scale:1}});
const rock=resolveAsset('DEV_ROCK')!;
const coveredOf=(objects:readonly any[])=>coveredIds(objects,{rock:0.3,far:0.3},id=>resolveAsset(id)?.displaySize);
const resolve=(o:any)=>resolveAsset(o.assetId,o.assetVersion);
const banner=(objects:any[])=>renderToStaticMarkup(createElement(SessionTools,{roomId:'fictional-review',capturePng:async()=>new Blob(),coveredOf,
 shared:{connected:true,status:'connected',info:{role:'client',requests:{pending:{objectId:'rock',actions:['translate']}}},scene:{objects},can:()=>false} as any}));

beforeAll(()=>{Object.assign(globalThis,{location:{hash:'',search:'',pathname:'/',origin:'http://localhost'}});});

describe('objects under a cloth are not named outside the 3D view',()=>{
 it('F1: the credits file keeps the provenance of a covered object but not its name',()=>{
  const objects=[make('rock','DEV_ROCK'),make('cloth','CLT_SQUARE_CLOTH')];
  const text=creditsText(creditAssets(objects,coveredOf(objects),resolve));
  expect(coveredOf(objects).has('rock')).toBe(true);
  expect(text).not.toContain(rock.name);expect(text).toContain(COVERED_NAME);
  expect(text).toContain(rock.provenance.author);
                                                                    
  expect(text).toContain(resolveAsset('CLT_SQUARE_CLOTH')!.name);
 });
 it('F1: an object outside the cloth is still credited by name',()=>{
  const objects=[make('far','DEV_ROCK',4),make('cloth','CLT_SQUARE_CLOTH')];
  const text=creditsText(creditAssets(objects,coveredOf(objects),resolve));
  expect(text).toContain(rock.name);expect(text).not.toContain(COVERED_NAME);
 });
 it('F2: a request made before the cloth was laid shows a neutral name and no picture; grant and reject stay',()=>{
  const html=banner([make('rock','DEV_ROCK'),make('cloth','CLT_SQUARE_CLOTH')]);
  expect(html).toContain(`治療師請求操作「${COVERED_NAME}」`);
  expect(html).not.toContain(rock.name);expect(html).not.toContain('object-mark');
  expect(html).toContain('同意上述動作');expect(html).toContain('拒絕');
 });
 it('F2: once the cloth is lifted the banner names the object again',()=>{
  const html=banner([make('rock','DEV_ROCK')]);
  expect(html).toContain(`治療師請求操作「${rock.name} 1」`);expect(html).not.toContain(COVERED_NAME);
 });
});
