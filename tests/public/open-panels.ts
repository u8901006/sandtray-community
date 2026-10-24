import type {Browser,BrowserContextOptions} from '@playwright/test';
                                                                                                    
                                                                                                                           
                                                                                           
export async function roomContext(browser:Browser,options?:BrowserContextOptions){
 const context=await browser.newContext(options);
 await context.addInitScript(()=>{try{for(const role of ['therapist','client'])for(const name of ['libraryOpen','inspectorOpen']){const key=`sandtray.${name}.${role}`;if(localStorage.getItem(key)===null)localStorage.setItem(key,'1');}}catch{/* storage blocked: defaults apply */}});
 return context;
}
