                                                                             
                                         
export type ShelfGroup={id:string;label:string;glyph:string;categories:readonly string[]};
export const SHELF_GROUPS:readonly ShelfGroup[]=[
 {id:'people',label:'人物',glyph:'人',categories:['人物','角色與動物','奇幻人物','方塊角色','練習']},
 {id:'animals',label:'動物',glyph:'獸',categories:['動物','海洋生物','恐龍']},
 {id:'buildings',label:'建築',glyph:'屋',categories:['建築','台灣地標','城市建築','街道','城堡村莊','廢墟遺跡','中世紀牆面','中世紀門窗','中世紀屋頂','中世紀地板','中世紀樓梯','中世紀陽台','港口碼頭']},
 {id:'nature',label:'自然',glyph:'樹',categories:['自然','自然植栽','自然岩石','山丘與雲','海洋']},
 {id:'transport',label:'交通',glyph:'車',categories:['交通']},
 {id:'fantasy',label:'奇幻神話',glyph:'幻',categories:['神話','奇幻','奇幻道具','地城','骷髏','武器盾牌']},
 {id:'scifi',label:'科幻',glyph:'星',categories:['太空基地','科幻外星生物','科幻道具','科幻平台','科幻柱體','科幻牆面','科幻貼花']},
 {id:'daily',label:'日常',glyph:'物',categories:['家具','食物','廚房','節慶','探險工具','寶藏與材料','中世紀道具','競技場']},
                                                                                                                                    
 {id:'conflict',label:'衝突武器',glyph:'戈',categories:['衝突武器']},
 {id:'symbols',label:'象徵',glyph:'心',categories:['象徵','桌遊']},
                                                                                                                                 
                                                    
 {id:'religion',label:'宗教信仰',glyph:'廟',categories:['宗教信仰']},
];
export const OTHER_GROUP:ShelfGroup={id:'other',label:'其他',glyph:'…',categories:[]};
                                                           
export function categoryGroup(category:string):ShelfGroup{return SHELF_GROUPS.find(g=>g.categories.includes(category))??OTHER_GROUP;}
                                                                                                                              
export function shelfGroups(categories:Iterable<string>):{group:ShelfGroup;categories:string[]}[]{
 const present=new Set(categories),rows=[...SHELF_GROUPS,OTHER_GROUP].map(group=>({group,categories:group===OTHER_GROUP?[...present].filter(c=>categoryGroup(c)===OTHER_GROUP):group.categories.filter(c=>present.has(c))}));
 return rows.filter(row=>row.categories.length>0);
}
