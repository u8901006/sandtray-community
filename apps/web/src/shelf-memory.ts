                                                                     
                                                        
export const RECENT_KEY='sandtray.recentAssets',FAVOURITE_KEY='sandtray.favouriteAssets',RECENT_MAX=8,FAVOURITE_MAX=60;
                                                       
export function pushRecent(list:readonly string[],id:string,max=RECENT_MAX){return [id,...list.filter(x=>x!==id)].slice(0,max);}
                                                                   
export function toggleFavourite(list:readonly string[],id:string,max=FAVOURITE_MAX){return list.includes(id)?list.filter(x=>x!==id):[id,...list].slice(0,max);}
                                                                                                                         
export function visibleIds(list:readonly string[],listable:ReadonlySet<string>){return list.filter(id=>listable.has(id));}
export function readIds(key:string):string[]{
 try{const raw=localStorage.getItem(key);const value=raw?JSON.parse(raw):[];return Array.isArray(value)?value.filter((x):x is string=>typeof x==='string').slice(0,FAVOURITE_MAX):[];}catch{return [];}
}
export function writeIds(key:string,list:readonly string[]){try{localStorage.setItem(key,JSON.stringify(list));}catch{/* storage blocked: the shelf still works for this page */}}
