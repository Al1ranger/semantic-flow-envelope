import fs from 'node:fs';
import crypto from 'node:crypto';
import dns from 'node:dns';
import assert from 'node:assert/strict';
import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
dns.setDefaultResultOrder('ipv4first');
export const canonical=x=>x===null||typeof x!=='object'?JSON.stringify(x).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')):
 Array.isArray(x)?'['+x.map(canonical).join(',')+']':'{'+Object.keys(x).sort().map(k=>canonical(k)+':'+canonical(x[k])).join(',')+'}';
export const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
export const digest=x=>sha(canonical(x));
export async function rpc(method,params){
 const r=await fetch('https://studio.genlayer.com/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error('HTTP failure');const p=await r.json();if(p.error||p.result==null)throw Error('RPC failure');return p.result;
}
const client=createClient({chain:studionet});
export const read=(address,functionName,args)=>client.readContract({address,functionName,args});
export async function receipt(hash,expected='SUCCESS',message){
 let tx=await rpc('eth_getTransactionByHash',[hash]);
 for(let i=0;tx.status!=='FINALIZED'&&i<15;i++){await new Promise(r=>setTimeout(r,4000));tx=await rpc('eth_getTransactionByHash',[hash]);}
 const leader=tx.consensus_data?.leader_receipt?.find(x=>x.mode==='leader');
 const raw=leader?.genvm_result?.stderr||leader?.result;
 const decoded=typeof raw!=='string'?'':(/^[A-Za-z0-9+/]*={0,2}$/.test(raw)&&raw.length%4===0?Buffer.from(raw,'base64').toString('utf8'):raw);
 const result={hash,address:tx.to_address??tx.to,status:tx.status,execution:leader?.execution_result,consensus:tx.result_name,
  ...(message?{expected_error_matched:decoded.includes(message)}:{})};
 if(tx.status==='FINALIZED'&&expected==='SUCCESS'&&leader?.execution_result==='SUCCESS'&&tx.result_name==='MAJORITY_DISAGREE')return {...result,committed:false};
 if(tx.status!=='FINALIZED'||leader?.execution_result!==expected||tx.result_name!=='MAJORITY_AGREE'||(message&&!decoded.includes(message)))throw Error('Receipt unverified');
 return {...result,committed:expected==='SUCCESS'};
}
export async function source(address){
 const norm=x=>x.replace(/\r\n/g,'\n').trimEnd()+'\n';
 const actual=norm(Buffer.from(await rpc('gen_getContractCode',[address]),'base64').toString('utf8'));
 if(actual!==norm(fs.readFileSync('contracts/SemanticFlowEnvelope.py','utf8')))throw Error('Source mismatch');
 return {address,source_match:true,sha256:sha(actual)};
}
export function cutCapacity(supply,demand,allowed,leftSupply,leftDemand){
 const infinity=supply.reduce((a,b)=>a+b,0)+demand.reduce((a,b)=>a+b,0)+1;
 return supply.reduce((s,q,i)=>s+(leftSupply.includes(i)?0:q),0)+demand.reduce((s,q,j)=>s+(leftDemand.includes(j)?q:0),0)
  +allowed.reduce((s,row,i)=>s+row.reduce((v,yes,j)=>v+(yes&&leftSupply.includes(i)&&!leftDemand.includes(j)?infinity:0),0),0);
}
export function minCut(supply,demand,allowed){
 const n=supply.length,m=demand.length;let best=Infinity;
 for(let bits=0;bits<2**(n+m);bits++){
  const a=Array.from({length:n},(_,i)=>i).filter(i=>bits&(1<<i));
  const b=Array.from({length:m},(_,j)=>j).filter(j=>bits&(1<<(n+j)));
  best=Math.min(best,cutCapacity(supply,demand,allowed,a,b));
 }return best;
}
export function verifyWitness(supply,demand,allowed,witness){
 const n=supply.length,m=demand.length,{value,flow,source_side_supplies:a,source_side_demands:b,cut_capacity:cut}=witness;
 assert(Number.isSafeInteger(value)&&value>=0);assert.equal(flow.length,n);
 flow.forEach((row,i)=>{assert.equal(row.length,m);row.forEach((v,j)=>assert(Number.isSafeInteger(v)&&v>=0&&(allowed[i][j]||v===0)));assert(row.reduce((s,v)=>s+v,0)<=supply[i]);});
 for(let j=0;j<m;j++)assert(flow.reduce((s,row)=>s+row[j],0)<=demand[j]);
 assert.equal(flow.flat().reduce((s,v)=>s+v,0),value);
 for(const [indexes,size] of [[a,n],[b,m]])assert(new Set(indexes).size===indexes.length&&indexes.every(i=>Number.isInteger(i)&&i>=0&&i<size));
 assert.equal(cutCapacity(supply,demand,allowed,a,b),cut);assert.equal(value,cut);
 assert.equal(value,minCut(supply,demand,allowed)); // independent dual enumeration; no augmenting paths
}
export function verifyEnvelope(terms,matrix,output){
 const s=terms.supplies.map(x=>x.quantity),d=terms.demands.map(x=>x.quantity),target=d.reduce((a,b)=>a+b,0);
 assert.equal(matrix.length,s.length);matrix.forEach(row=>assert(row.length===d.length&&row.every(x=>['YES','NO','UNKNOWN'].includes(x))));
 verifyWitness(s,d,matrix.map(r=>r.map(x=>x==='YES')),output.lower);
 verifyWitness(s,d,matrix.map(r=>r.map(x=>x!=='NO')),output.upper);
 const l=output.lower.value,u=output.upper.value;
 assert(l<=u&&u<=target);assert.equal(output.status,l===target?'TEXT_FEASIBLE':u<target?'TEXT_INFEASIBLE':'AMBIGUOUS');
 assert.equal(output.demand_total,target);assert.equal(output.supply_total,s.reduce((a,b)=>a+b,0));assert.equal(output.unit,terms.unit);
 assert.equal(output.min_unserved,target-u);assert.equal(output.max_unserved,target-l);
 assert.equal(canonical(output.unknown_cells),canonical(matrix.flatMap((row,i)=>row.flatMap((x,j)=>x==='UNKNOWN'?[[i,j]]:[]))));
 return true;
}
export function verifyRecord(address,key,record){
 const {root,...body}=record,{inputs,input_root,report:r,output}=record,s=r.source;
 assert.equal(inputs.contract,address);assert.equal(inputs.policy,'semantic-flow-envelope-v1');assert.equal(digest(inputs),input_root);
 assert.equal(digest({contract:address,creator:inputs.creator,nonce:inputs.nonce}),key);assert.equal(digest(body),root);
 assert.equal(canonical(r.binding),canonical({key,input_root,policy:inputs.policy}));assert.equal(s.url,inputs.source.url);
 let ready=false;
 if(['OK','HASH_MISMATCH'].includes(s.status)){
  assert(s.http===200&&Buffer.byteLength(s.body)>=1&&Buffer.byteLength(s.body)<=6000);assert.equal(sha(s.body),s.hash);
  assert.equal(s.status,s.hash===inputs.source.sha256?'OK':'HASH_MISMATCH');ready=s.status==='OK';
 }else assert(['UNAVAILABLE','HTTP_ERROR','SIZE_ERROR','ENCODING_ERROR'].includes(s.status)&&!s.body&&!s.hash);
 if(ready&&r.document_status==='READY'){
  const terms=JSON.parse(s.body);assert.equal(terms.schema,'semantic-flow-v1');
  assert(/^[a-z][a-z0-9_]{0,23}$/.test(terms.unit));
  const ids=[];
  for(const side of [terms.supplies,terms.demands]){assert(side.length>=1&&side.length<=4);for(const row of side){
   assert(Number.isInteger(row.quantity)&&row.quantity>=1&&row.quantity<=1000&&typeof row.terms==='string');ids.push(row.id);
  }}assert.equal(new Set(ids).size,ids.length);verifyEnvelope(terms,r.matrix,output);
 }else{assert(!ready||r.document_status==='INVALID_TERMS');assert.equal(canonical(r.matrix),'[]');assert.equal(canonical(output),canonical({status:'HELD',lower:null,upper:null,demand_total:null}));}
 return true;
}
export async function denied(address,method,args){
 try{await read(address,method,args);return false;}catch(e){if(e.code===-32000&&e.details==='execution failed')return true;throw Error('Read failed without verified contract revert');}
}
export async function state(address,key){
 const record=await read(address,'get_result',[key]);verifyRecord(address,key,record);
 if(record.output.status==='TEXT_FEASIBLE'){
  const plan=await read(address,'assured_plan',[key,record.input_root]);
  assert.equal(canonical(plan),canonical({input_root:record.input_root,root:record.root,unit:record.output.unit,flow:record.output.lower.flow,declared_terms_only:true}));
 }else assert(await denied(address,'assured_plan',[key,record.input_root]));
 return {key,...record,verified:true};
}
if(process.argv[1]?.endsWith('check.mjs'))try{
 const [mode,value,extra]=process.argv.slice(2);
 const result=mode==='source'?await source(value):mode==='state'?await state(value,extra):['success','error'].includes(mode)?await receipt(value,mode==='error'?'ERROR':'SUCCESS',extra):null;
 if(!result)throw Error('Unknown mode');console.log(JSON.stringify(result));
}catch{console.error('Sanitized verification failure; inspect recorded hashes before retry');process.exitCode=1;}
