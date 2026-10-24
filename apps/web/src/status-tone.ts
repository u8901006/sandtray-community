                                                                          
                                                
export type StatusTone='ok'|'busy'|'wait'|'problem'|'info';
const has=(text:string,words:readonly string[])=>words.some(word=>text.includes(word));
                                                                                                             
const STOPPED=['都失敗','已由另一頁接管','登入已失效','會談已結束','無法啟用'];
                                                                                                                    
const RETRY=['稍後再試','再試一次','請重新','尚未收到','未保存','無法'];
const OK=['已連線','已保存','已確認'];
                                                      
const WAIT=['自動重新連線','等候','仍有操作等待','暫時離線'];
const BUSY=['同步中','正在','連線中，','核對'];
const PROBLEM=['斷線','失效','失敗','無法','未保存','已結束','接管','授權','稍後','太快','已更新','超出','請重新','尚未','中斷'];
export function statusTone(text:string|undefined|null):StatusTone{
 const t=(text??'').trim();if(!t)return 'info';
 if(has(t,STOPPED)||has(t,RETRY))return 'problem';
 if(has(t,OK))return 'ok';
 if(has(t,WAIT))return 'wait';
 if(has(t,BUSY))return 'busy';
 if(has(t,PROBLEM))return 'problem';
 return 'info';
}
