import {test,expect,type Page} from '@playwright/test';
import {roomContext} from './open-panels';
const origin='http://127.0.0.1:8788';
                                                                                    
                                                                             
type Pose={position:number[];target:number[]};
const pose=async(page:Page):Promise<Pose>=>JSON.parse((await page.locator('.viewport canvas').first().getAttribute('data-camera-pose'))!);
const gap=(a:Pose,b:Pose)=>Math.max(...[...a.position,...a.target].map((v,i)=>Math.abs(v-[...b.position,...b.target][i])));
async function room(request:any,playwright:any,browser:any,nickname:string){
 const post=(api:any,path:string,data:unknown={})=>api.post(path,{data,headers:{Origin:origin}});
 await request.post('/__test/login',{data:{name:'therapist'}});
 const {id}=await (await post(request,'/api/rooms',{retentionMode:'session-only',policyVersion:'dev-v1'})).json();
 const {token}=await (await post(request,`/api/rooms/${id}/invites`)).json();
 const clientApi=await playwright.request.newContext({baseURL:origin});
 const {participantId}=await (await post(clientApi,'/api/invites/redeem',{token,nickname})).json();
 await post(request,`/api/rooms/${id}/admit`,{participantId});
 const cc=await roomContext(browser,{storageState:await clientApi.storageState()});
 const tc=await roomContext(browser,{storageState:await request.storageState()});
 return {id,cc,tc,clientApi};
}
test('看這件 moves only the seat that pressed it: the other seat\'s camera and the server tray stay as they were',async({request,playwright,browser})=>{
 test.setTimeout(90000);const {id,cc,tc,clientApi}=await room(request,playwright,browser,'看這件虛構');
 try{
  const c=await cc.newPage(),t=await tc.newPage();
  for(const p of [c,t]){await p.goto(`/?room=${id}`);await expect(p.locator('.session')).toContainText('已連線');}
  await c.getByRole('button',{name:'● 圓石 練習物件'}).click();await c.getByRole('button',{name:'放在中央'}).click();
  for(const p of [c,t]){await expect(p.getByTestId('viewport')).toHaveAttribute('data-items','1');await expect(p.locator('.viewport canvas').first()).toHaveAttribute('data-camera-pose',/target/);}
  const snapshot=async()=>{const s=await(await request.get(`/api/rooms/${id}/snapshot`)).json();return JSON.stringify({revision:s.revision,objects:s.objects});};
  const tray=await snapshot();
  for(const [press,watch] of [[c,t],[t,c]] as [Page,Page][]){
   const mine=await pose(press),theirs=await pose(watch);
   const row=press.locator('.scene-list .scene-row').first();
   await row.getByRole('button',{name:'看這件'}).click();
   await expect(press.getByRole('status').filter({hasText:'只有你的畫面改變'})).toBeVisible();
   await expect.poll(async()=>gap(await pose(press),mine),{timeout:5000}).toBeGreaterThan(0.5);
   await press.waitForTimeout(1000);                          
   expect(gap(await pose(watch),theirs),'the other seat\'s camera must not move').toBeLessThan(0.001);
   expect(await snapshot(),'看這件 must not change the shared tray').toBe(tray);
  }
 }finally{await cc.close();await tc.close();await clientApi.dispose();}
});
