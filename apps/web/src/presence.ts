                                                                                             
export type ViewerRole='therapist'|'client'|'local';
export const ROLE_COLOR:Record<ViewerRole,string>={therapist:'#2f6f73',client:'#c9773b',local:'#c9773b'};
type GrantLike={objectId?:string;active?:boolean;expiresAt?:number};
                                                                                                  
export function therapistHolds(grants:Record<string,GrantLike>|undefined,objectId:string,now=Date.now()){
 return Object.values(grants??{}).some(g=>g.objectId===objectId&&g.active===true&&typeof g.expiresAt==='number'&&g.expiresAt>now);
}
                                                                                                               
export const DROP_MS=320,DROP_HEIGHT=0.9;
export function dropOffset(elapsedMs:number,ms=DROP_MS,height=DROP_HEIGHT){
 if(!(elapsedMs>0))return height;if(elapsedMs>=ms)return 0;const t=elapsedMs/ms;return height*(1-t)*(1-t);
}
                                                                                        
export function isSoftwareRenderer(name:string|undefined|null){return !!name&&/swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);}
const rendererNames=new WeakMap<object,string>();
export function rendererName(gl:{getContext():WebGLRenderingContext|WebGL2RenderingContext}){
 const context=gl.getContext();const cached=rendererNames.get(context);if(cached!==undefined)return cached;
 let name='';try{const info=context.getExtension('WEBGL_debug_renderer_info');name=String(context.getParameter(info?info.UNMASKED_RENDERER_WEBGL:context.RENDERER)??'');}catch{/* unknown renderer: keep the animation */}
 rendererNames.set(context,name);return name;
}
                                                                                         
export const SETTLE_SINK_MS=260,SETTLE_SINK_DEPTH=0.08;
export function landingSquash(elapsedMs:number,ms=SETTLE_SINK_MS,depth=SETTLE_SINK_DEPTH){
 if(!(elapsedMs>0)||elapsedMs>=ms)return 1;const t=elapsedMs/ms;return 1-depth*Math.sin(Math.PI*1.5*t)*(1-t)**1.5;
}
                                             
export function peerStatusText(role:'therapist'|'client'|undefined,peerOnline:boolean|undefined){
 if(peerOnline===undefined||!role)return '';const peer=role==='therapist'?'案主':'治療師';
 return peerOnline?`${peer}在線`:`${peer}暫時離線，作品保留，回來後可繼續`;
}
