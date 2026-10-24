import {test,expect} from '@playwright/test';
test('local exploration places a real model and offers corresponding source',async({page})=>{
 await page.goto('http://127.0.0.1:5173');
 await expect(page.locator('.viewport canvas').first()).toBeVisible();
 await page.getByRole('button',{name:'● 圓石 練習物件',exact:true}).click();
 await page.getByRole('button',{name:'放在中央',exact:true}).click();
 await expect(page.getByTestId('viewport')).toHaveAttribute('data-items','1');
 await expect(page.getByRole('link',{name:'原始碼與授權'})).toHaveAttribute('href','/source.html');
 const source=await page.request.get('http://127.0.0.1:5173/source-code.zip');expect(source.status()).toBe(200);expect((await source.body()).subarray(0,2).toString()).toBe('PK');
});
test('production API keeps anonymous sessions out',async({request})=>{
 const response=await request.get('/api/rooms/anonymous-room/snapshot');
 expect(response.status()).toBe(401);expect((await response.json()).objects).toBeUndefined();
});
