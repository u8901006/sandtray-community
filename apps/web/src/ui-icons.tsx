                                                                               
import type {TrayTool} from './sandtray-surface';
import type {CameraKind} from './tray-layout';
const box={width:22,height:22,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true,focusable:'false' as const};
export function ToolIcon({tool}:{tool:TrayTool|null}){
 if(tool==='spray')return <svg {...box}><rect x="5" y="10" width="9" height="11" rx="2"/><path d="M7 10V7h5v3"/><path d="M12 7h2"/><circle cx="18" cy="5" r=".6"/><circle cx="20.5" cy="7.5" r=".6"/><circle cx="18.5" cy="9.5" r=".6"/></svg>;
 if(tool==='dig')return <svg {...box}><path d="M14 4l6 6-3 3-6-6z"/><path d="M11 7L4 14c-1 1-1 3 0 4l2 2c1 1 3 1 4 0l7-7"/></svg>;
 if(tool==='mound')return <svg {...box}><path d="M2 19c3-1 4-8 10-8s7 7 10 8"/><path d="M2 19h20"/></svg>;
 if(tool==='smooth')return <svg {...box}><path d="M3 15h18"/><path d="M6 15V9h12v6"/><path d="M3 19c2-1 3 1 5 0s3 1 5 0 3 1 5 0 2 0 3 0"/></svg>;
 return <svg {...box}><path d="M8 13V5.5a1.5 1.5 0 013 0V12"/><path d="M11 11.5v-7a1.5 1.5 0 013 0V12"/><path d="M14 11.5V6a1.5 1.5 0 013 0v7"/><path d="M8 13l-1.2-1.6a1.6 1.6 0 00-2.6 1.9L7.5 18A5 5 0 0012 21h1a5 5 0 005-5v-3"/></svg>;
}
                                                     
export function ViewIcon({kind}:{kind:CameraKind|'reset'}){
 const tray={fill:'currentColor',fillOpacity:.18};
 if(kind==='top')return <svg {...box}><rect x="3" y="6" width="8" height="12" {...tray}/><rect x="13" y="6" width="8" height="12" {...tray}/></svg>;
 if(kind==='low')return <svg {...box}><path d="M2 17l3-3h14l3 3z" {...tray}/><circle cx="12" cy="9" r="2"/></svg>;
 if(kind==='dry'||kind==='wet')return <svg {...box}><path d="M5 18l3-9h8l3 9z" {...tray}/>{kind==='wet'&&<path d="M9 15c1-1 2 1 3 0s2 1 3 0"/>}</svg>;
 if(kind==='reset')return <svg {...box}><path d="M4 12a8 8 0 108-8H8"/><path d="M8 1v6h6" transform="translate(-2 0)"/></svg>;
 return <svg {...box}><path d="M2 17l4-8h5l-2 8z" {...tray}/><path d="M13 17l2-8h5l2 8z" {...tray}/></svg>;
}
                                                   
export function EyeIcon(){return <svg {...box}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/></svg>;}
export function ShelfIcon(){return <svg {...box}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 12h18"/><circle cx="8" cy="8.5" r="1.6"/><path d="M14 10V7h3v3"/><circle cx="16" cy="16" r="1.8"/><path d="M6 18v-3h3v3"/></svg>;}
                      
export function ScopeIcon(){return <svg {...box}><path d="M3 11l13-5 1.6 4.2-13 5z"/><path d="M17.6 10.2l2.6-1-1.6-4.2-2.6 1"/><path d="M9 13.6l-2 6.4M11 13l2 7"/></svg>;}
                                    
export function TunnelIcon(){return <svg {...box}><path d="M2 19h5M17 19h5"/><path d="M6 19v-5a6 6 0 0 1 12 0v5"/><path d="M9.5 19v-4a2.5 2.5 0 0 1 5 0v4"/></svg>;}
                                                       
export function RibbonIcon(){return <svg {...box}><circle cx="5" cy="16" r="2.5"/><circle cx="19" cy="16" r="2.5"/><path d="M7 14.5C9 6 15 6 17 14.5"/><path d="M12 8.2l-2 -3.2M12 8.2l2 -3.2"/></svg>;}
export function DetailIcon(){return <svg {...box}><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/><path d="M11 8.5v5M8.5 11h5"/></svg>;}
