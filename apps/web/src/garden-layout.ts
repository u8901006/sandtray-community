import navigation from './garden-colliders-v2.json';
                                                                                                                      
                                                                                                                   
                                                             
export type GardenTier='low'|'high'|'cinema';
export type PlantKind='tree'|'bush'|'ground'|'reed';
export type Placement={variant:string;x:number;z:number;scale:number;rotation:number};

                                                                                                                  
export const TRAY_FOCUS={halfX:16,minZ:-10,maxZ:18};
                                                                                
export const DECK={halfX:9,halfZ:7.2};
export const POND={x:-23,z:10,radiusX:11.7,radiusZ:8.7};
export const MEDITATION_CIRCLE={x:8,z:-18,radius:4.4};
export const TEA_HOUSE={minX:14,maxX:28.5,minZ:-22,maxZ:-9.5};
export const GRAVEL_PATH={minX:6,maxX:24,minZ:-11.6,maxZ:-5};
export const BRIDGE={minX:-36,maxX:-10,minZ:8.4,maxZ:11.6};
                                                                
export const GARDEN_STOPS={entry:{position:[3,1.4,8],yaw:0},water:{position:[-10,1.4,10],yaw:Math.PI/2},cabin:{position:[21,1.4,-9],yaw:0},circle:{position:[9,1.4,-13],yaw:Math.atan2(1,5)}} as const;
const STOPS=Object.values(GARDEN_STOPS).map(s=>[s.position[0],s.position[2]] as const);
                                                                                          
const PATHS:[number,number,number,number][]=[[-8,6,-11.5,9.6],[3,7,3,12],[7,-5,9,-13],[8,-5,15,-8.5],[-1,-7,8,-13.5]];
const trunks=(navigation.colliders as {name:string;x:number;z:number}[]).filter(c=>c.name==='Tree_trunk');
const boulders=(navigation.colliders as {name:string;x:number;z:number;radiusX?:number}[]).filter(c=>c.name==='Boulder');

function hash(ix:number,iz:number,seed:number){let h=Math.imul(ix,374761393)^Math.imul(iz,668265263)^Math.imul(seed,2246822519);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
const smooth=(t:number)=>t*t*(3-2*t);
                                                                                                                          
export function noise(x:number,z:number,seed=1){const ix=Math.floor(x),iz=Math.floor(z),fx=smooth(x-ix),fz=smooth(z-iz);const a=hash(ix,iz,seed),b=hash(ix+1,iz,seed),c=hash(ix,iz+1,seed),d=hash(ix+1,iz+1,seed);return a+(b-a)*fx+(c-a)*fz+(a-b-c+d)*fx*fz;}
const fbm=(x:number,z:number)=>noise(x,z,1)*.55+noise(x*2.1,z*2.1,2)*.3+noise(x*4.3,z*4.3,3)*.15;
const step=(a:number,b:number,v:number)=>{const t=Math.min(1,Math.max(0,(v-a)/(b-a)));return smooth(t);};
function segmentDistance(x:number,z:number,[ax,az,bx,bz]:[number,number,number,number]){const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));return Math.hypot(x-ax-t*dx,z-az-t*dz);}
export const pathDistance=(x:number,z:number)=>Math.min(...PATHS.map(p=>segmentDistance(x,z,p)));
const pondValue=(x:number,z:number)=>((x-POND.x)/POND.radiusX)**2+((z-POND.z)/POND.radiusZ)**2;
const inRect=(x:number,z:number,r:{minX:number;maxX:number;minZ:number;maxZ:number},m=0)=>x>r.minX-m&&x<r.maxX+m&&z>r.minZ-m&&z<r.maxZ+m;
                                                                                                                             
                                                                                                                    
                                                                                 
export const TRAYS={halfX:10.85,halfZ:4.21};
                                                                                         
export const BRIDGE_WALK={minX:-35,maxX:-10.8,z:10,halfWidth:1.3};
                                                                                                 
export const BRIDGE_POSTS:readonly {x:number;z:number;top:number}[]=[11.25,8.75].flatMap(z=>Array.from({length:9},(_,i)=>({x:-35+i*3,z,top:-.33+1.1*Math.sin(i/8*Math.PI)+1.1})));
                                                                                 
export const POND_MIRROR={x:POND.x,y:-.697,z:POND.z,radiusX:POND.radiusX-.2,radiusZ:POND.radiusZ-.2};
                                                                                           
export const PAVILION_POSTS:readonly (readonly [number,number])[]=[-7.5,7.5].flatMap(x=>[-5.8,0,5.8].map(z=>[x,z] as const));
                                                                                                           
export const LANTERNS:readonly (readonly [number,number,number])[]=[...([[-12,8],[-35,8],[11,-5],[16,-9],[25,-9],[-10,-8],[5,-12]] as const).map(([x,z])=>[x,1.4,z] as const),[21,2.6,-16]];
                                                                                                                                        
export function sunVector(azimuth:number,elevation:number,distance=100):[number,number,number]{const a=azimuth*Math.PI/180,e=elevation*Math.PI/180;return [-Math.sin(a)*Math.cos(e)*distance,Math.sin(e)*distance,-Math.cos(a)*Math.cos(e)*distance];}
export const azimuthOf=(v:readonly number[])=>Math.atan2(-v[0],-v[2])*180/Math.PI;
export const elevationOf=(v:readonly number[])=>Math.atan2(v[1],Math.hypot(v[0],v[2]))*180/Math.PI;
export type GardenMoodName='day'|'sunset'|'evening';
                                                                                                             
export const MOOD_SUN:Record<GardenMoodName,readonly [number,number,number]>={day:[24,38,12],sunset:[-35,12,18],evening:[-25,4,-25]};
                                                                                                                                 
                                                                                                                       
export const VISIBLE_SUN:Record<GardenMoodName,readonly [number,number,number]>={day:MOOD_SUN.day,sunset:sunVector(azimuthOf(MOOD_SUN.sunset),8),evening:MOOD_SUN.evening};
                                                                                                                      
                                                                                                            
                                                    
export const WATER_Y=POND_MIRROR.y;
                                                                                                                                      
export const LILY_ZONE={minR:.25,maxR:.85,bridgeHalfWidth:2.2};
                                                                           
export const KOI_ZONE={minR:.3,maxR:.75};
                                                                                            
export const GATE={x:0,z:-30,width:4.2,height:4.6,yaw:0};
                                               
export const BAMBOO_GROVE={minX:30.5,maxX:37,minZ:-25,maxZ:-9};
                                                                                                      
export const PAGODA={x:35,z:-95,height:28};
                                                                                            
export const POND_TORO:readonly (readonly [number,number])[]=[[-24,20.2],[-28,.6]];
                                                                                                  
export const FINIAL_POSTS=BRIDGE_POSTS.filter(p=>!(Math.abs(p.x)<TRAY_FOCUS.halfX&&p.z>TRAY_FOCUS.minZ&&p.z<TRAY_FOCUS.maxZ));
                                                                                                        
export function gardenFloor(x:number,z:number){const y=-z,r=Math.hypot(x,y);let h=-.48+Math.max(0,r-24)*.019+Math.max(0,r-43)**1.25*.065*(1+.35*Math.sin(x*.13)*Math.cos(y*.11));h+=Math.min(1,Math.max(0,r-13)/16)*(.35*Math.sin(x*.17)*Math.cos(y*.14));const d=((x+23)/12)**2+((y+10)/9)**2;if(d<1.2)h-=1.6*Math.max(0,1-d/1.2);if(Math.abs(x)<7.9&&Math.abs(y)<6.4)h=Math.max(h,-.35);if(Math.abs(x-21)<5.1&&Math.abs(y-16)<4.1)h=Math.max(h,-.21);if(x>=-35&&x<=-10.8&&Math.abs(y+10)<1.3)h=Math.max(h,-.265+1.1*Math.sin(Math.min(1,(x+35)/24.12)*Math.PI));return h;}
export const inTrayFocus=(x:number,z:number)=>Math.abs(x)<TRAY_FOCUS.halfX&&z>TRAY_FOCUS.minZ&&z<TRAY_FOCUS.maxZ;

                                                                                                    
export function builtGround(x:number,z:number,margin=0){
 return (Math.abs(x)<DECK.halfX+margin&&Math.abs(z)<DECK.halfZ+margin)||pondValue(x,z)<1.04+margin*.1||inRect(x,z,BRIDGE,margin)||inRect(x,z,TEA_HOUSE,margin)||inRect(x,z,GRAVEL_PATH,margin)||Math.abs(Math.hypot(x-MEDITATION_CIRCLE.x,z-MEDITATION_CIRCLE.z)-MEDITATION_CIRCLE.radius)<.9+margin;
}
                                                                                                               
export function grassDensity(x:number,z:number){
 if(builtGround(x,z))return 0;
 const r=Math.hypot(x,z);let g=step(.36,.6,fbm(x*.07+11,z*.07-7));
 g=Math.max(g,.85*step(36,52,r));
 const bank=pondValue(x,z);if(bank<1.5)g=Math.max(g,step(1.5,1.12,bank));
 g*=step(.8,2.2,pathDistance(x,z));
 for(const [sx,sz] of STOPS)g*=step(.4,1.6,Math.hypot(x-sx,z-sz));
 return Math.min(1,g);
}
                                                                                     
export const wornPath=(x:number,z:number)=>1-step(.6,2,pathDistance(x,z));

                                                                                                                      
export const TIER_SHARE:Record<GardenTier,number>={low:.4,high:.7,cinema:1};
                                                                                              
export const VARIANTS:Record<PlantKind,{id:string;height:number;scale:[number,number]}[]>={
 tree:[{id:'MK_SN_CommonTree_1',height:7.02,scale:[1.3,1.6]},{id:'MK_SN_CommonTree_2',height:7.4,scale:[1.3,1.6]},{id:'MK_SN_CommonTree_3',height:9.18,scale:[1.1,1.4]},{id:'MK_SN_CommonTree_4',height:9.2,scale:[1.1,1.4]},{id:'MK_SN_CommonTree_5',height:6.76,scale:[1.3,1.7]}],
 bush:[{id:'MK_SN_Bush_Common',height:1.35,scale:[.9,1.4]},{id:'MK_SN_Bush_Common_Flowers',height:1.35,scale:[.9,1.3]},{id:'MK_SN_Fern_1',height:2.44,scale:[.28,.4]},{id:'MK_SN_Plant_1_Big',height:3.7,scale:[.3,.42]}],
 ground:[{id:'MK_SN_Flower_3_Group',height:2.02,scale:[.26,.36]},{id:'MK_SN_Flower_4_Group',height:2.43,scale:[.24,.32]},{id:'MK_SN_Clover_1',height:1.13,scale:[.35,.5]},{id:'MK_SN_Plant_7_Big',height:0.3,scale:[.7,1]},{id:'MK_SN_Mushroom_Common',height:0.45,scale:[.5,.8]}],
 reed:[{id:'MK_SN_Grass_Wispy_Tall',height:1.64,scale:[.45,.65]},{id:'MK_SN_Grass_Common_Tall',height:1.84,scale:[.4,.6]}]
};
                                                                                       
export const MAX_GROUND_COVER_HEIGHT=.8;

function rng(seed:number){let s=seed>>>0;return()=>{s=(s+0x6d2b79f5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const near=(list:{x:number;z:number}[],x:number,z:number,d:number)=>list.some(p=>Math.hypot(p.x-x,p.z-z)<d);

function plantAllowed(kind:PlantKind,x:number,z:number){
 const r=Math.hypot(x,z);if(r>62)return false;
 if(kind==='reed'){const v=pondValue(x,z);return v>1.06&&v<1.4&&!inRect(x,z,BRIDGE,1.2)&&!inTrayFocus(x,z);}
 if(builtGround(x,z,kind==='ground'?.4:1.2))return false;
 if(kind!=='ground'&&inTrayFocus(x,z))return false;
 if(kind==='tree'){if(near(trunks,x,z,5)||STOPS.some(([sx,sz])=>Math.hypot(x-sx,z-sz)<6)||pathDistance(x,z)<3.5||builtGround(x,z,3))return false;}
 if(kind==='bush'){if(STOPS.some(([sx,sz])=>Math.hypot(x-sx,z-sz)<2.5)||pathDistance(x,z)<1.6||near(boulders,x,z,1.2))return false;}
 if(kind==='ground'&&(pathDistance(x,z)<.7||STOPS.some(([sx,sz])=>Math.hypot(x-sx,z-sz)<1)))return false;
 return true;
}
let full:Record<PlantKind,Placement[]>|undefined;
                                                                                                
function fullPlanting():Record<PlantKind,Placement[]>{
 if(full)return full;
 const random=rng(20261010),out:Record<PlantKind,Placement[]>={tree:[],bush:[],ground:[],reed:[]};
 const pick=(kind:PlantKind,x:number,z:number)=>{const list=VARIANTS[kind],v=list[Math.floor(random()*list.length)];out[kind].push({variant:v.id,x,z,scale:v.scale[0]+random()*(v.scale[1]-v.scale[0]),rotation:random()*Math.PI*2});};
 const scatter=(kind:PlantKind,target:number,sample:()=>[number,number],spacing:number)=>{
  for(let attempt=0;attempt<target*40&&out[kind].length<target;attempt++){const [x,z]=sample();if(plantAllowed(kind,x,z)&&!near(out[kind],x,z,spacing)&&(kind!=='bush'||!near(out.tree,x,z,2.2)))pick(kind,x,z);}
 };
 const annulus=(min:number,max:number)=>():[number,number]=>{const a=random()*Math.PI*2,r=Math.sqrt(min*min+random()*(max*max-min*min));return [Math.cos(a)*r,Math.sin(a)*r];};
 const aroundTrunk=(min:number,max:number)=>():[number,number]=>{const t=trunks[Math.floor(random()*trunks.length)],a=random()*Math.PI*2,r=min+random()*(max-min);return [t.x+Math.cos(a)*r,t.z+Math.sin(a)*r];};
 scatter('tree',26,annulus(17,60),7);
 scatter('bush',80,aroundTrunk(1.8,4.5),2.4);scatter('bush',160,annulus(10,58),2.4);
 const meadow=()=>{for(let i=0;i<30;i++){const [x,z]=annulus(9,50)();if(grassDensity(x,z)>.5)return [x,z] as [number,number];}return annulus(9,50)();};
 scatter('ground',270,meadow,1.1);
 scatter('reed',90,()=>{const a=random()*Math.PI*2,s=1.05+random()*.17;return [POND.x+Math.cos(a)*POND.radiusX*s,POND.z+Math.sin(a)*POND.radiusZ*s];},.9);
 full=out;return out;
}
                                                                                                          
export function gardenPlanting(tier:GardenTier):Record<PlantKind,Placement[]>{
 const all=fullPlanting(),keep=(list:Placement[])=>list.filter((_,i)=>hash(i,7,99)<TIER_SHARE[tier]);
 return {tree:all.tree,bush:keep(all.bush),ground:keep(all.ground),reed:keep(all.reed)};
}
                                                                                                                
export type PlantedTrunk={x:number;z:number;radius:number;variant:string};
export const plantedTrunks=():PlantedTrunk[]=>fullPlanting().tree.map(t=>({x:t.x,z:t.z,radius:.3*t.scale,variant:t.variant}));
