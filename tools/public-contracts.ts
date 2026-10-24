import {artifacts} from './contracts';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
for(const [name,value] of Object.entries(artifacts())){
 const actual=JSON.parse(readFileSync(resolve('specs/001-sandtray/contracts',name),'utf8'));
 if(JSON.stringify(actual)!==JSON.stringify(value))throw Error('Contract drift: '+name);
}
console.log('PASS: nine executable public contracts (private traceability records excluded)');
