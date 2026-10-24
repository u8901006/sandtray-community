import type {Page} from '@playwright/test';
import {categoryGroup} from '../../apps/web/src/shelf-groups';
                                                                     
export async function openCategory(page:Page,category:string){
 await page.getByRole('button',{name:categoryGroup(category).label+'類',exact:true}).click();
 await page.getByRole('button',{name:category,exact:true}).click();
}
