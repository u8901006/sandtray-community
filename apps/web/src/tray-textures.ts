import {DataTexture,RGBAFormat,UnsignedByteType,RepeatWrapping,SRGBColorSpace,LinearMipmapLinearFilter,LinearFilter} from 'three';
                                                                                 
                                         
export function sandHeightField(size:number,seedValue=9122026){
 let seed=seedValue;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const fine=new Float32Array(size*size);for(let i=0;i<fine.length;i++)fine[i]=random();
 const cell=8,lattice=size/cell,coarse=new Float32Array(lattice*lattice);for(let i=0;i<coarse.length;i++)coarse[i]=random();
 const smooth=(t:number)=>t*t*(3-2*t),at=(i:number,j:number)=>coarse[((j+lattice)%lattice)*lattice+(i+lattice)%lattice];
 const out=new Float32Array(size*size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const gx=x/cell,gy=y/cell,i=Math.floor(gx),j=Math.floor(gy),u=smooth(gx-i),v=smooth(gy-j);
  const mid=(at(i,j)*(1-u)+at(i+1,j)*u)*(1-v)+(at(i,j+1)*(1-u)+at(i+1,j+1)*u)*v;
                                                                                       
  const ripple=.5+.5*Math.sin(2*Math.PI*(6*x/size+.35*Math.sin(2*Math.PI*2*y/size)));
  out[y*size+x]=fine[y*size+x]*.55+mid*.25+ripple*.2;
 }
 return out;
}
                                                                                                                        
export function isGlint(x:number,y:number){const h=(Math.imul(x*73856093^y*19349663,2654435761)>>>0)/4294967296;return h<1/300;}
export function createTrayTextures(){
 const size=256,sandPixels=new Uint8Array(size*size*4),normalPixels=new Uint8Array(size*size*4),woodPixels=new Uint8Array(size*size*4),height=sandHeightField(size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const index=y*size+x,offset=index*4,grain=height[index]-.5,tone=(1+grain*.09)*(isGlint(x,y)?1.12:1);
  sandPixels.set([Math.min(255,Math.round(210*tone)),Math.min(255,Math.round(194*tone)),Math.min(255,Math.round(161*tone)),255],offset);
  const dx=(height[y*size+(x+1)%size]-height[y*size+(x+size-1)%size])*.32,dy=(height[((y+1)%size)*size+x]-height[((y+size-1)%size)*size+x])*.32,length=Math.hypot(dx,dy,1);
  normalPixels.set([Math.round((.5-dx/length*.5)*255),Math.round((.5-dy/length*.5)*255),Math.round((.5+.5/length)*255),255],offset);
  const fiber=1+.065*Math.sin(x*.48+Math.sin(y*.049)*.65)+grain*.035;
  woodPixels.set([Math.round(133*fiber),Math.round(98*fiber),Math.round(66*fiber),255],offset);
 }
 const make=(pixels:Uint8Array,color:boolean,repeat:[number,number])=>{const texture=new DataTexture(pixels,size,size,RGBAFormat,UnsignedByteType);texture.wrapS=texture.wrapT=RepeatWrapping;texture.repeat.set(...repeat);texture.magFilter=LinearFilter;texture.minFilter=LinearMipmapLinearFilter;texture.generateMipmaps=true;if(color)texture.colorSpace=SRGBColorSpace;texture.needsUpdate=true;return texture;};
 const sand=make(sandPixels,true,[12,8]),normal=make(normalPixels,false,[12,8]),wood=make(woodPixels,true,[1,1]);let disposed=false;
 return {sand,normal,wood,dispose(){if(disposed)return;disposed=true;sand.dispose();normal.dispose();wood.dispose();}};
}
