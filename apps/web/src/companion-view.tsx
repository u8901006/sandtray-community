                                                                                                                 
                                                                                
import {useEffect,useRef,useState,type PointerEvent as ReactPointerEvent} from 'react';
import {COMPANION_ANIMALS,ANIMAL_LABEL,COMPANION_SIZE,clampToViewport,followTarget,followStep,settled,overControl,effectiveMode,canFollow,type CompanionPrefs,type PointerEnv} from './companion';

function useMedia(query:string){
 const [on,setOn]=useState(()=>typeof matchMedia==='function'&&matchMedia(query).matches);
 useEffect(()=>{if(typeof matchMedia!=='function')return;const m=matchMedia(query),f=()=>setOn(m.matches);f();m.addEventListener('change',f);return()=>m.removeEventListener('change',f);},[query]);
 return on;
}
export function usePointerEnv():PointerEnv{
 return {fineHover:useMedia('(any-hover: hover) and (any-pointer: fine)'),reducedMotion:useMedia('(prefers-reduced-motion: reduce)'),wide:useMedia('(min-width: 640px)')};
}

                                                                                                             
function Animal({kind}:{kind:CompanionPrefs['animal']}){
 const eyes=(l:[number,number],r:[number,number])=><>
  <g className="eyes-open">{[l,r].map(([x,y])=><ellipse key={x} cx={x} cy={y} rx="2.4" ry="3" fill="#2a2620"/>)}</g>
  <g className="eyes-happy" fill="none" stroke="#2a2620" strokeWidth="2" strokeLinecap="round">{[l,r].map(([x,y])=><path key={x} d={`M${x-3} ${y} q3 -3.5 6 0`}/>)}</g></>;
 if(kind==='moss')return <svg viewBox="0 0 64 64" aria-hidden="true">
  <ellipse cx="32" cy="58" rx="19" ry="3.5" fill="#000" opacity=".12"/>
  <circle className="body" cx="32" cy="38" r="19" fill="#6f9a5c"/><circle cx="25" cy="31" r="7" fill="#82ad6c"/><circle cx="41" cy="44" r="5" fill="#5f8a4e"/>
  <path d="M32 19 q-1 -7 -7 -9 q6 -1 8 6 q2 -6 8 -6 q-6 2 -7 9" fill="#9cc47c"/>
  {eyes([26,39],[38,39])}<path d="M30 45 q2 1.6 4 0" fill="none" stroke="#2a2620" strokeWidth="1.6" strokeLinecap="round"/></svg>;
 if(kind==='heart')return <svg viewBox="0 0 64 64" aria-hidden="true">
  <ellipse cx="32" cy="59" rx="17" ry="3" fill="#000" opacity=".12"/>
  <path className="body" d="M32 56 C14 44 8 34 10 25 C12 16 24 13 32 23 C40 13 52 16 54 25 C56 34 50 44 32 56Z" fill="#e0776e"/>
  <path d="M17 24 q2 -6 8 -6" fill="none" stroke="#f2a59c" strokeWidth="3" strokeLinecap="round"/>
  {eyes([26,33],[38,33])}<path d="M30 39 q2 1.8 4 0" fill="none" stroke="#2a2620" strokeWidth="1.6" strokeLinecap="round"/></svg>;
 if(kind==='turtle')return <svg viewBox="0 0 64 64" aria-hidden="true">
  <ellipse cx="32" cy="58" rx="22" ry="3.5" fill="#000" opacity=".12"/>
  <path className="body" d="M12 50 Q12 26 32 24 Q52 26 52 50 Z" fill="#7e9a6a"/><path d="M20 49 Q22 33 32 31 Q42 33 44 49" fill="none" stroke="#5f7a4e" strokeWidth="2"/>
  <ellipse cx="50" cy="40" rx="9" ry="8" fill="#a9bf8c"/><rect x="14" y="48" width="8" height="7" rx="3" fill="#a9bf8c"/><rect x="40" y="48" width="8" height="7" rx="3" fill="#a9bf8c"/>
  {eyes([47,38],[54,38])}</svg>;
 if(kind==='bird')return <svg viewBox="0 0 64 64" aria-hidden="true">
  <ellipse cx="32" cy="58" rx="16" ry="3" fill="#000" opacity=".12"/>
  <path className="body" d="M14 40 Q14 18 34 18 Q52 20 50 40 Q48 56 30 56 Q14 54 14 40Z" fill="#e3b45a"/><path d="M20 40 Q30 34 38 44 Q30 50 20 40Z" fill="#c9953e"/>
  <path d="M50 30 l9 3 l-9 3z" fill="#d9774b"/><path d="M26 56 v5 M34 56 v5" stroke="#9a6b3f" strokeWidth="2" strokeLinecap="round"/>
  {eyes([36,30],[45,30])}</svg>;
 return <svg viewBox="0 0 64 64" aria-hidden="true">
  <ellipse cx="32" cy="58" rx="20" ry="3.5" fill="#000" opacity=".12"/>
  <path className="body" d="M14 57 Q10 30 32 28 Q54 30 50 57Z" fill="#c9a27a"/><path d="M48 52 q12 -2 10 -14" fill="none" stroke="#c9a27a" strokeWidth="5" strokeLinecap="round"/>
  <path d="M17 31 L15 14 L28 25Z M47 31 L49 14 L36 25Z" fill="#c9a27a"/><path d="M19 28 L18 19 L25 25Z M45 28 L46 19 L39 25Z" fill="#e8c9a6"/>
  {eyes([26,38],[38,38])}<path d="M30 44 q2 2 4 0" fill="none" stroke="#2a2620" strokeWidth="1.6" strokeLinecap="round"/></svg>;
}

                                                                                                                                             
export function Companion({prefs}:{prefs:CompanionPrefs}){
 const env=usePointerEnv(),mode=effectiveMode(prefs,env),ref=useRef<HTMLDivElement>(null);
 const pos=useRef<[number,number]>([0,0]),target=useRef<[number,number]>([0,0]),raf=useRef(0),last=useRef(0);
 const [patting,setPatting]=useState(false),[dragging,setDragging]=useState(false);
 const moved=useRef(false);                                                                                                           
 const place=(p:[number,number])=>{pos.current=p;const el=ref.current;if(el)el.style.transform=`translate(${p[0]}px,${p[1]}px)`;};
                                                                                                              
 useEffect(()=>{if(!prefs.enabled)return;const corner=()=>clampToViewport(innerWidth-COMPANION_SIZE-24,innerHeight-COMPANION_SIZE-96,innerWidth,innerHeight);
  moved.current=false;place(mode==='park'?corner():pos.current);const fit=()=>place(mode==='park'&&!moved.current?corner():clampToViewport(pos.current[0],pos.current[1],innerWidth,innerHeight));addEventListener('resize',fit);return()=>removeEventListener('resize',fit);},[prefs.enabled,mode]);
                                                                                                                    
 useEffect(()=>{if(!prefs.enabled||mode!=='follow')return;
  const tick=(t:number)=>{const dt=last.current?(t-last.current)/1000:1/60;last.current=t;const next=followStep(pos.current,target.current,dt);
   if(settled(next,target.current)){place(target.current);raf.current=0;last.current=0;return;}place(next);raf.current=requestAnimationFrame(tick);};
  const move=(e:PointerEvent)=>{if(e.pointerType!=='mouse')return;target.current=followTarget(e.clientX,e.clientY,innerWidth,innerHeight);
   const el=ref.current;if(el)el.style.opacity=overControl(e.target as Element)?'0.45':'1';if(!raf.current)raf.current=requestAnimationFrame(tick);};
  addEventListener('pointermove',move,{passive:true});return()=>{removeEventListener('pointermove',move);cancelAnimationFrame(raf.current);raf.current=0;last.current=0;const el=ref.current;if(el)el.style.opacity='';};
 },[prefs.enabled,mode]);
                                                                                                                        
 const drag=useRef<{id:number;dx:number;dy:number;moved:boolean}|null>(null);
 const onDown=(e:ReactPointerEvent)=>{if(mode!=='park')return;drag.current={id:e.pointerId,dx:e.clientX-pos.current[0],dy:e.clientY-pos.current[1],moved:false};e.currentTarget.setPointerCapture?.(e.pointerId);e.preventDefault();};
 const onMove=(e:ReactPointerEvent)=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;const next=clampToViewport(e.clientX-d.dx,e.clientY-d.dy,innerWidth,innerHeight);
  if(!d.moved&&Math.hypot(next[0]-pos.current[0],next[1]-pos.current[1])<4)return;d.moved=true;moved.current=true;setDragging(true);place(next);};
 const onUp=(e:ReactPointerEvent)=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;drag.current=null;setDragging(false);if(!d.moved&&e.pointerType!=='mouse'){setPatting(true);setTimeout(()=>setPatting(false),1200);}};
 if(!prefs.enabled)return null;
 return <div ref={ref} className={'companion '+mode+(patting?' patting':'')+(dragging?' dragging':'')} data-testid="companion" data-mode={mode} data-animal={prefs.animal}
  aria-hidden="true" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={()=>{drag.current=null;setDragging(false);}}
  onPointerEnter={e=>{if(mode==='park'&&e.pointerType==='mouse')setPatting(true);}} onPointerLeave={e=>{if(e.pointerType==='mouse')setPatting(false);}}><Animal kind={prefs.animal}/></div>;
}

                                                                                                                           
export function CompanionSettings({prefs,onChange}:{prefs:CompanionPrefs;onChange:(next:CompanionPrefs)=>void}){
 const env=usePointerEnv(),[open,setOpen]=useState(false),followOk=canFollow(env);
 return <div className="companion-settings">
  <button className="companion-toggle" aria-expanded={open} aria-controls="companion-panel" onClick={()=>setOpen(v=>!v)}>小夥伴{prefs.enabled?'：'+ANIMAL_LABEL[prefs.animal]:''}</button>
  {open&&<div id="companion-panel" className="companion-panel" role="group" aria-label="陪伴小夥伴">
   <label className="companion-switch"><input type="checkbox" checked={prefs.enabled} onChange={e=>onChange({...prefs,enabled:e.target.checked})}/>顯示小夥伴</label>
   <div className="companion-row animals" role="radiogroup" aria-label="選一隻">{COMPANION_ANIMALS.map(a=><button key={a} role="radio" aria-checked={prefs.animal===a} onClick={()=>onChange({...prefs,animal:a,enabled:true})}>{ANIMAL_LABEL[a]}</button>)}</div>
   <div className="companion-row" role="radiogroup" aria-label="位置">
    <button role="radio" aria-checked={prefs.mode==='park'} onClick={()=>onChange({...prefs,mode:'park'})}>停在角落</button>
    <button role="radio" aria-checked={prefs.mode==='follow'} disabled={!followOk} onClick={()=>onChange({...prefs,mode:'follow'})}>跟著游標</button>
   </div>
   <small>{followOk?'只有你看得到，不會傳給對方，也不會出現在照片裡。':'這台裝置是觸控或已開「減少動態」，小夥伴會停在角落（可以拖動）。只有你看得到。'}</small>
   <button onClick={()=>setOpen(false)}>完成</button>
  </div>}
 </div>;
}
