                                                                      
                                                  
                                      
export const BELOW_GAP=26,ABOVE_GAP=12,MARGIN=8,HYSTERESIS=8;
type Point={x:number;y:number};
export type Obstacle={left:number;right:number;top:number};
export type QuickToolsPlacement={flip:boolean;dx:number};
export type PlacementInput={base:Point;top:Point;toolbar:{width:number;height:number};canvas:{width:number;height:number};obstacles?:readonly Obstacle[]};
function shift(x:number,width:number,canvas:number){
 if(width+2*MARGIN>canvas)return canvas/2-x;
 const left=x-width/2;
 return left<MARGIN?MARGIN-left:left+width>canvas-MARGIN?canvas-MARGIN-(left+width):0;
}
                                                            
export function placeQuickTools({base,top,toolbar,canvas,obstacles=[]}:PlacementInput,previous?:QuickToolsPlacement):QuickToolsPlacement{
 const below=shift(base.x,toolbar.width,canvas.width),above=shift(top.x,toolbar.width,canvas.width);
 const left=base.x+below-toolbar.width/2,right=left+toolbar.width;
 const floor=Math.min(canvas.height,...obstacles.filter(o=>o.right>left&&o.left<right).map(o=>o.top));
 const roomBelow=floor-MARGIN-(base.y+BELOW_GAP+toolbar.height);
 const roomAbove=top.y-ABOVE_GAP-toolbar.height-MARGIN;
 const fitsBelow=previous?.flip?roomBelow>=HYSTERESIS:roomBelow>=0;
 const flip=!fitsBelow&&roomAbove>roomBelow;
 return {flip,dx:flip?above:below};
}
export function quickToolsTransform({flip,dx}:QuickToolsPlacement){
 const x=dx?`calc(-50% + ${Math.round(dx)}px)`:'-50%';
 return `translate(${x},${flip?`calc(-100% - ${ABOVE_GAP}px)`:`${BELOW_GAP}px`})`;
}
