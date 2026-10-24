import {readFileSync,writeFileSync,statSync,lstatSync} from 'node:fs';
import {resolve,sep} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const manifest=JSON.parse(readFileSync(resolve(root,'PUBLIC_EXPORT.json'),'utf8'));
const files=[];
for(const {path:name} of manifest.files){
 if(typeof name!=='string'||name.startsWith('/')||name.includes('\\')||name.includes(':')||name.split('/').some(p=>p===''||p==='..'))throw Error('Unsafe source path');
 if(name.split('/').some(p=>p==='.git'||p==='node_modules'||p==='.wrangler'||p==='private-assets'||p==='.npm-cache'||p==='.dev.vars'||p.startsWith('.dev.vars.')||(p.startsWith('.env')&&p!=='.env.example')))throw Error('Secret or private source path refused');
 if(/\.(glb|wav|png)$/.test(name))continue;
 let path=root;for(const segment of name.split('/')){path=resolve(path,segment);if(lstatSync(path).isSymbolicLink())throw Error('Symlink source refused');}
 if(!statSync(path).isFile())throw Error('Source must be a regular file');
 files.push(name);
}
if(new Set(files).size!==files.length)throw Error('Duplicate source entries');
files.sort();
const table=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
const crc=b=>{let c=0xffffffff;for(const n of b)c=table[(c^n)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
const local=[],central=[];let offset=0;
for(const path of files){
 const name=Buffer.from(path),data=readFileSync(resolve(root,path)),checksum=crc(data);
 const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(0x21,12);h.writeUInt32LE(checksum,14);h.writeUInt32LE(data.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(name.length,26);
 local.push(h,name,data);
 const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(0x21,14);c.writeUInt32LE(checksum,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);central.push(c,name);offset+=h.length+name.length+data.length;
}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
const out=resolve(root,'apps/web/public/source-code.zip');writeFileSync(out,Buffer.concat([...local,directory,end]));
console.log(`SOURCE_ARCHIVE files=${files.length} bytes=${statSync(out).size}`);
