import {describe,it,expect} from 'vitest';
import {requestObjectLabel} from '../apps/web/src/request-label';
                                                                   
describe('permission request object label',()=>{
 const objects=[{id:'aaaaaaaa-1',assetId:'DEV_HOUSE',assetVersion:'dev-v1'},{id:'bbbbbbbb-2',assetId:'DEV_HOUSE',assetVersion:'dev-v1'}];
 it('names the object and its position in the scene list',()=>{expect(requestObjectLabel(objects,'bbbbbbbb-2')).toBe('小屋 2');expect(requestObjectLabel(objects,'aaaaaaaa-1')).toBe('小屋 1');});
 it('falls back to the asset id lookup when the version is unknown',()=>{expect(requestObjectLabel([{id:'x',assetId:'DEV_HOUSE',assetVersion:'nope'}],'x')).toBe('小屋 1');});
 it('never shows the raw object id',()=>{expect(requestObjectLabel(objects,'cccccccc-3')).toBe('一件物件');expect(requestObjectLabel(undefined,'cccccccc-3')).toBe('一件物件');expect(requestObjectLabel([{id:'z',assetId:'NOPE'}],'z')).toBe('第 1 件物件');});
});
