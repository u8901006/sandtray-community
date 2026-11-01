                                                                                                                                    
                                                                                                                                           
                                                                                                                      
import {ribbonsWithoutObject,type Ribbon} from '../../../packages/protocol/src/index';
export const RIBBON_HISTORY_TABLE='CREATE TABLE IF NOT EXISTS ribbon_history (step INTEGER PRIMARY KEY, before_state TEXT NOT NULL, after_state TEXT NOT NULL)';
export type Ribbons=Record<string,Ribbon>;
type Sql=DurableObjectStorage['sql'];
                                                                                                        
export function withoutObject(ribbons:Ribbons,objectId:string):Ribbons{return Object.fromEntries(ribbonsWithoutObject(Object.values(ribbons),objectId).map(ribbon=>[ribbon.id,ribbon]));}
export function recordRibbonStep(sql:Sql,step:number,before:string,after:string){if(before!==after)sql.exec('INSERT OR REPLACE INTO ribbon_history VALUES(?,?,?)',step,before,after);}
                                                                                                                                      
export function ribbonStepState(sql:Sql,step:number,side:'before'|'after'):Ribbons|undefined{
 const row=sql.exec<{before_state:string;after_state:string}>('SELECT before_state,after_state FROM ribbon_history WHERE step=?',step).toArray()[0];
 return row?JSON.parse(side==='before'?row.before_state:row.after_state) as Ribbons:undefined;
}
