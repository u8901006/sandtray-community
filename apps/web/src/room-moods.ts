                                                                      
                                                                
export type RoomMood='day'|'golden'|'night';
export const ROOM_MOODS:readonly RoomMood[]=['day','golden','night'];
export const MOOD_LABEL:Record<RoomMood,string>={day:'日光',golden:'夕照',night:'月夜'};
type Lights={ambient:number;ambientColor:string;sun:number;sunColor:string;environment:number};
export type MoodLook={background:string;sunPosition:[number,number,number];
                                                                                                     
 rich:Lights;plain:Lights;
                                                            
 skyZenith:string;skyHorizon:string;
                                                                                
 motes:boolean;glow:boolean;moteColor:string};
export const MOOD_LOOK:Record<RoomMood,MoodLook>={
 day:{background:'#e9e5db',sunPosition:[5,10,3],
  rich:{ambient:1.0,ambientColor:'#fff4e8',sun:2.3,sunColor:'#fff1de',environment:.25},
  plain:{ambient:1.8,ambientColor:'#ffffff',sun:2.5,sunColor:'#ffffff',environment:0},
  skyZenith:'#eef3f2',skyHorizon:'#c3d2d4',motes:false,glow:false,moteColor:'#fff1c8'},
 golden:{background:'#e4cfb2',sunPosition:[9,4,2],
  rich:{ambient:.8,ambientColor:'#ffd8ae',sun:2.6,sunColor:'#ffc58a',environment:.2},
  plain:{ambient:1.35,ambientColor:'#ffe2c2',sun:2.6,sunColor:'#ffc58a',environment:0},
  skyZenith:'#f6dcb8',skyHorizon:'#e9a979',motes:true,glow:true,moteColor:'#ffd890'},
 night:{background:'#262d3d',sunPosition:[-4,9,6],
  rich:{ambient:.55,ambientColor:'#7b8fc0',sun:1.1,sunColor:'#aebdf0',environment:.1},
  plain:{ambient:.9,ambientColor:'#8a9cc8',sun:1.1,sunColor:'#aebdf0',environment:0},
  skyZenith:'#2c3b5c',skyHorizon:'#4a5a7c',motes:true,glow:true,moteColor:'#cfe8ff'},
};
const KEY='sandtray.roomMood';
                                                                                                                            
                                                                                                               
export function readMood(storage?:Pick<Storage,'getItem'>|null):RoomMood{
 try{const s=storage===undefined?globalThis.localStorage:storage;const v=s?.getItem(KEY);return (ROOM_MOODS as readonly string[]).includes(v??'')?v as RoomMood:'day';}catch{return 'day';}
}
export function writeMood(mood:RoomMood,storage?:Pick<Storage,'setItem'>|null){try{const s=storage===undefined?globalThis.localStorage:storage;s?.setItem(KEY,mood);}catch{/* private window or blocked storage: the mood just is not remembered */}}
                                                                                                                             
                                                                              
                                                                                                                             
export type Glow={color:string;at:number;size:number};
const GLOWS:readonly [RegExp,Glow][]=[
 [/燭台|蠟燭/,{color:'#ffb35a',at:.92,size:1.6}],
 [/火把/,{color:'#ff9a3c',at:.95,size:2.0}],
 [/營火/,{color:'#ff9a3c',at:.35,size:2.6}],
 [/燈塔/,{color:'#fff0c8',at:.9,size:1.4}],
 [/燈籠|提燈|吊燈|路燈/,{color:'#ffc06a',at:.75,size:2.0}],
 [/粉紅寶石/,{color:'#ff8ccf',at:.5,size:1.8}],[/綠寶石/,{color:'#6dffb0',at:.5,size:1.8}],[/藍寶石/,{color:'#6fb6ff',at:.5,size:1.8}],
 [/水晶/,{color:'#b9dcff',at:.5,size:1.8}],
];
export function glowFor(name:string|undefined):Glow|undefined{
 if(!name)return undefined;for(const [pattern,glow] of GLOWS)if(pattern.test(name))return glow;return undefined;
}
                                                                                             
export function haloAlpha(t:number){const k=Math.min(1,Math.max(0,t));return Math.max(0,(1-k)**2*.7+Math.exp(-k*k*18)*.3);}
                                                                                                                                  
export const MOTE_COUNT=40,MOTE_BOX={x:11,yMin:.4,yMax:3.6,z:4.6};
export function motePosition(i:number,t:number):[number,number,number]{
 const h=(n:number)=>{const s=Math.sin(i*127.1+n*311.7)*43758.5453;return s-Math.floor(s);};
 const x=(h(1)*2-1)*MOTE_BOX.x+Math.sin(t*.13+h(2)*6.3)*.6,z=(h(3)*2-1)*MOTE_BOX.z+Math.cos(t*.11+h(4)*6.3)*.4;
 const y=MOTE_BOX.yMin+(MOTE_BOX.yMax-MOTE_BOX.yMin)*h(5)+Math.sin(t*.21+h(6)*6.3)*.25;
 return [Math.max(-MOTE_BOX.x,Math.min(MOTE_BOX.x,x)),Math.max(MOTE_BOX.yMin,Math.min(MOTE_BOX.yMax,y)),Math.max(-MOTE_BOX.z,Math.min(MOTE_BOX.z,z))];
}
