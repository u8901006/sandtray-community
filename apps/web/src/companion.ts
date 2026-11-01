                                                                               
                                                                           
                                                                           
                                                                      
                                       
export const COMPANION_ANIMALS=['cat','turtle','bird','moss','heart'] as const;
export type CompanionAnimal=typeof COMPANION_ANIMALS[number];
export const ANIMAL_LABEL:Record<CompanionAnimal,string>={cat:'小貓',turtle:'小烏龜',bird:'小鳥',moss:'小苔球',heart:'小愛心'};
export type CompanionMode='park'|'follow';
export type CompanionPrefs={enabled:boolean;animal:CompanionAnimal;mode:CompanionMode};
export const COMPANION_DEFAULT:CompanionPrefs={enabled:false,animal:'cat',mode:'park'};
export const COMPANION_KEY='sandtray.companion';
                                                                                                                         
export const COMPANION_SIZE=64,TRAIL=[30,26] as const;
                                                                                           
export const FOLLOW_TAU=0.08;

                                                                                                                                     
export function readCompanion(storage:Pick<Storage,'getItem'>|undefined):CompanionPrefs{
 try{
  const raw=storage?.getItem(COMPANION_KEY);if(!raw)return {...COMPANION_DEFAULT};
  const v=JSON.parse(raw) as Partial<CompanionPrefs>;
  return {enabled:v.enabled===true,animal:COMPANION_ANIMALS.includes(v.animal as CompanionAnimal)?v.animal as CompanionAnimal:COMPANION_DEFAULT.animal,mode:v.mode==='follow'?'follow':'park'};
 }catch{return {...COMPANION_DEFAULT};}
}
export function writeCompanion(storage:Pick<Storage,'setItem'>|undefined,prefs:CompanionPrefs){try{storage?.setItem(COMPANION_KEY,JSON.stringify(prefs));}catch{/* this device only; nothing to do */}}

export type PointerEnv={fineHover:boolean;reducedMotion:boolean;wide:boolean};
                                                                                                                                       
export const canFollow=(env:PointerEnv)=>env.fineHover&&env.wide&&!env.reducedMotion;
export const effectiveMode=(prefs:CompanionPrefs,env:PointerEnv):CompanionMode=>prefs.mode==='follow'&&canFollow(env)?'follow':'park';

                                                         
export function clampToViewport(x:number,y:number,vw:number,vh:number,size=COMPANION_SIZE):[number,number]{
 return [Math.min(Math.max(0,x),Math.max(0,vw-size)),Math.min(Math.max(0,y),Math.max(0,vh-size))];
}
                                                                                                    
export function followTarget(px:number,py:number,vw:number,vh:number):[number,number]{return clampToViewport(px+TRAIL[0],py+TRAIL[1],vw,vh);}
                                                                                     
export function followStep(from:readonly [number,number],to:readonly [number,number],dt:number):[number,number]{
 const k=1-Math.exp(-Math.max(0,dt)/FOLLOW_TAU);return [from[0]+(to[0]-from[0])*k,from[1]+(to[1]-from[1])*k];
}
export const settled=(a:readonly [number,number],b:readonly [number,number])=>Math.hypot(a[0]-b[0],a[1]-b[1])<0.5;
                                                                                                                        
const CONTROL='button,a[href],input,select,textarea,summary,label,[role="button"],[role="radio"],[role="tab"],[contenteditable="true"]';
export function overControl(target:{closest?:(selector:string)=>unknown}|null|undefined){return !!target?.closest?.(CONTROL);}
