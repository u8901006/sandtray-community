import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readCompanion,writeCompanion,COMPANION_ANIMALS,ANIMAL_LABEL} from '../apps/web/src/companion';
import {Companion} from '../apps/web/src/companion-view';

                                                                 
const store=()=>{const m=new Map<string,string>();return {getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>void m.set(k,v)};};
describe('companion characters',()=>{
 it('小苔球 and 小愛心 are choosable and remembered like the others',()=>{
  expect(COMPANION_ANIMALS).toEqual(['cat','turtle','bird','moss','heart']);
  expect(ANIMAL_LABEL.moss).toBe('小苔球');expect(ANIMAL_LABEL.heart).toBe('小愛心');
  for(const animal of ['moss','heart'] as const){const s=store();writeCompanion(s,{enabled:true,animal,mode:'park'});expect(readCompanion(s).animal).toBe(animal);}
 });
 it('every character draws its own picture with a breathing body, eyes that close when patted, and no text',()=>{
  const seen=new Set<string>();
  for(const animal of COMPANION_ANIMALS){
   const html=renderToStaticMarkup(createElement(Companion,{prefs:{enabled:true,animal,mode:'park'}}));
   expect(html).toContain(`data-animal="${animal}"`);expect(html).toContain('class="body"');
   expect(html).toContain('eyes-open');expect(html).toContain('eyes-happy');
   expect(html.replace(/<[^>]*>/g,'').trim()).toBe('');
   const svg=html.match(/<svg[\s\S]*<\/svg>/)![0];expect(seen.has(svg)).toBe(false);seen.add(svg);
  }
 });
 it('uses none of the campaign mascot names',()=>{
  for(const label of Object.values(ANIMAL_LABEL))for(const name of ['奔奔','抱抱'])expect(label).not.toContain(name);
 });
});
