import assert from 'node:assert/strict';
import {abi} from 'genlayer-js';
const {calldata}=abi;
for(const [method,args] of [
 ['analyze',['demo','Al1ranger/semantic-flow-envelope/'+'a'.repeat(40)+'/examples/reroute.json','b'.repeat(64)]],
 ['get_result',['a'.repeat(64)]],['assured_plan',['a'.repeat(64),'b'.repeat(64)]]]){
 const bytes=calldata.encode(calldata.makeCalldataObject(method,args,{}));assert.deepEqual(calldata.encode(calldata.decode(bytes)),bytes);
}
console.log('3 SDK calldata roundtrips passed');
