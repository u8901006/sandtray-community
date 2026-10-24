import {useEffect,type MutableRefObject} from 'react';
import {useThree} from '@react-three/fiber';
import type {Transform} from '../../../packages/protocol/src/index';

export type PngCapture = () => Promise<Blob>;
export function PngCaptureBridge({capture,verify}: {capture:MutableRefObject<PngCapture|null>;verify:()=>Array<{id:string;transform:Transform}>}) {
 const {gl,scene,camera}=useThree();
 useEffect(()=>{
  const captureFrame:PngCapture=()=>new Promise((resolve,reject)=>{
   requestAnimationFrame(()=>{
    try {
     const objects=verify();
     if(gl.getContext().isContextLost()||!gl.domElement.width||!gl.domElement.height)throw new Error('3D 畫面尚未準備好，請稍後重試。');
     const found=new Set<string>();
     scene.traverse(object=>{
      const id=object.userData.sandtrayObjectId;
      if(!id)return;
      const expected=objects.find(item=>item.id===id);
      const close=(a:number[],b:number[])=>a.every((v,i)=>Math.abs(v-b[i])<0.00001);
      if(!expected||!close(object.position.toArray(),expected.transform.position)||!close(object.quaternion.toArray(),expected.transform.rotation)||!close(object.scale.toArray(),[expected.transform.scale,expected.transform.scale,expected.transform.scale]))throw new Error('物件仍在調整中，請完成操作並等待確認後匯出。');
      found.add(id);
     });
     if(found.size!==objects.length)throw new Error('模型尚未完整載入，請稍後重試。');
                                                                                    
     gl.render(scene,camera);
     gl.domElement.toBlob(blob=>blob&&blob.size>0?resolve(blob):reject(new Error('無法產生 PNG，請重試。')),'image/png');
    }catch(error){reject(error);}
   });
  });
  capture.current=captureFrame;
  return()=>{if(capture.current===captureFrame)capture.current=null;};
 },[gl,scene,camera,capture,verify]);
 return null;
}
                                                                  
export type CameraPose = {save:()=>()=>void;apply:(position:[number,number,number],target:[number,number,number])=>void;aspect:()=>number};
export function CameraPoseBridge({pose}:{pose:MutableRefObject<CameraPose|null>}){
 const {camera,controls,invalidate,size}=useThree();
 useEffect(()=>{
  const value:CameraPose={save(){
   const position=camera.position.clone(),quaternion=camera.quaternion.clone();
   const orbit=controls as unknown as {target?:{clone():any;copy(v:any):void};update?:()=>void}|null;const target=orbit?.target?.clone();
   return()=>{camera.position.copy(position);camera.quaternion.copy(quaternion);if(target&&orbit?.target){orbit.target.copy(target);orbit.update?.();}invalidate();};
  },apply(position,target){
   const orbit=controls as unknown as {target?:{set(x:number,y:number,z:number):void};update?:()=>void}|null;
   camera.position.set(...position);if(orbit?.target){orbit.target.set(...target);orbit.update?.();}else camera.lookAt(...target);invalidate();
  },aspect:()=>size.width/Math.max(1,size.height)};
  pose.current=value;return()=>{if(pose.current===value)pose.current=null;};
 },[camera,controls,invalidate,pose,size]);
 return null;
}
