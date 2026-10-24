import {objectLook} from './request-label';
import type {ColorVariant} from '../../../packages/protocol/src/index';
                                                           
export function ObjectMark({object}:{object:{assetId:string;assetVersion?:string;colorVariant?:ColorVariant}}){
 const look=objectLook(object);if(!look)return null;
 return <span className="object-mark" aria-hidden="true" data-testid="object-mark">{look.thumbnail?<img src={look.thumbnail} alt="" loading="lazy" draggable={false}/>:<span className="object-symbol" style={{color:look.color}}>{look.symbol}</span>}{look.swatch&&<i className="object-swatch" data-swatch={look.swatch} style={{background:look.swatch}}/>}</span>;
}
