                                                                              
                                                                    
                                                     
export const MIN_Y=-1.5;
                                                                                                                                    
export const BURY_STEPS=[0.3,0.6,0.85] as const;
const round=(v:number)=>Number(v.toFixed(3));
                                                                                                                    
export function buriedDepth(ground:number,y:number){return Math.max(0,round(ground-y));}
                                                                                        
export function buriedShare(ground:number,y:number,height:number){return height>0?Math.min(1,buriedDepth(ground,y)/height):0;}
                                                                                                             
export function buryDeeper(ground:number,y:number,height:number):number|null{
 if(!(height>0))return null;const share=buriedShare(ground,y,height);
 const step=BURY_STEPS.find(s=>s>share+0.01);if(step===undefined)return null;
 const next=Math.max(MIN_Y,round(ground-step*height));return next<y?next:null;
}
                                                                              
export function digOut(ground:number,y:number):number|null{return buriedDepth(ground,y)>0?round(ground):null;}
                                                                                                               
export function keepDepth(ground:number,depth:number){return Math.max(MIN_Y,round(ground-depth));}
