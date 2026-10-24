import {test,expect} from '@playwright/test';
import {openCategory} from './shelf';
import {budget} from './budget';
import {assetById} from '../../packages/asset-catalog/src/index';
const same=(a:Uint8Array,b:Uint8Array)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
                                                                                                                                  
                                                                                                                               
                                                                                                                              
                                                                                                                                 
                                                                                                                                 
                                                                                                                               
                                                                                                 
const stillPair=async(page:import('@playwright/test').Page,box:NonNullable<Awaited<ReturnType<import('@playwright/test').Locator['boundingBox']>>>)=>{const a=await page.screenshot({clip:box});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(null)))));return same(a,await page.screenshot({clip:box}));};
                                                                                                                                     
                                                                                                                                      
                                                                                                                                        
                                                                         
const waitStill=async(page:import('@playwright/test').Page,canvas:import('@playwright/test').Locator,pairs=8)=>{const box=await canvas.boundingBox();if(!box)throw new Error('canvas not visible');for(let i=1;i<=pairs;i++){if(await stillPair(page,box))return;}throw new Error(`canvas not still after ${pairs} frame-pair observations (each pair separated by two rendered frames)`);};
test('all five supplied packs place real models and local character playback stops',async({page},testInfo)=>{
 test.setTimeout(budget(60000));await page.goto('/');const ids=['IMP_ARENA_tree','IMP_DUNGEON_chair','IMP_FURNITURE_bedDouble','IMP_MINI_character-female-a','IMP_ULTIMATE_Casual_Female'];
 for(const [i,id] of ids.entries()){const asset=assetById.get(id)!;await openCategory(page,asset.category);await page.getByLabel('搜尋物件').fill(asset.name);await page.getByRole('button',{name:asset.name+' 已匯入素材',exact:true}).click();await page.getByRole('button',{name:'放在中央'}).click();await expect(page.getByTestId('load-status')).toHaveText('3D 模型已載入');await page.getByLabel('左右位置').fill(String(-4+i*2));}
 await expect(page.getByTestId('viewport')).toHaveAttribute('data-items','5');const canvas=page.locator('canvas');const box=await canvas.boundingBox();if(!box)throw new Error('canvas not visible');const before=await page.screenshot({clip:box});await page.getByLabel('角色動作',{exact:true}).selectOption({label:'Walk'});await page.getByRole('button',{name:'播放角色動作'}).click();for(let i=1;i<=8;i++){if(!same(before,await page.screenshot({clip:box})))break;if(i===8)throw new Error('no rendered frame differed from the pre-play baseline after 8 captures');}await page.getByRole('button',{name:'停止角色動作'}).click();await waitStill(page,canvas);
 await page.screenshot({path:testInfo.outputPath('imported-five-packs-ui.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect.poll(async()=>(await canvas.boundingBox())?.height??Infinity).toBeLessThan(600);await page.screenshot({path:testInfo.outputPath('imported-mobile-ui.png'),fullPage:true});
});
