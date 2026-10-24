import {BackSide,Color,Mesh,MeshBasicMaterial,PMREMGenerator,Scene,SphereGeometry,type Texture,type WebGLRenderer} from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
                                                                                                                     
                                                                                                                   
                                                                                                                        
export const SKY_PARAMETERS={turbidity:5,rayleigh:1.7,mieCoefficient:.007,mieDirectionalG:.8} as const;
export function configureSky(sky:Sky,sun:readonly number[]){
 const u=sky.material.uniforms;u.turbidity.value=SKY_PARAMETERS.turbidity;u.rayleigh.value=SKY_PARAMETERS.rayleigh;u.mieCoefficient.value=SKY_PARAMETERS.mieCoefficient;u.mieDirectionalG.value=SKY_PARAMETERS.mieDirectionalG;u.sunPosition.value.fromArray(sun);
}
export function createSkyEnvironment(renderer:WebGLRenderer,sun:readonly number[],ground:string):{texture:Texture;dispose():void}{
 const scene=new Scene(),sky=new Sky();sky.scale.setScalar(60);configureSky(sky,sun);scene.add(sky);
                                                                                                                         
                                                                                                      
 sky.material.uniforms.showSunDisc.value=0;sky.material.uniforms.mieCoefficient.value=.0015;sky.material.uniforms.mieDirectionalG.value=.55;
 const groundGeometry=new SphereGeometry(50,32,12,0,Math.PI*2,Math.PI/2+.015,Math.PI/2),groundMaterial=new MeshBasicMaterial({color:new Color(ground),side:BackSide});
 scene.add(new Mesh(groundGeometry,groundMaterial));
 const generator=new PMREMGenerator(renderer);const target=generator.fromScene(scene,.035,.1,200);generator.dispose();
 sky.geometry.dispose();sky.material.dispose();groundGeometry.dispose();groundMaterial.dispose();
 let disposed=false;return {texture:target.texture,dispose(){if(disposed)return;disposed=true;target.dispose();}};
}
