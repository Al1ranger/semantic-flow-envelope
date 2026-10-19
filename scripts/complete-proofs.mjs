import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {rpc,receipt,source,state,read,denied,digest,sha} from './check.mjs';
const file='PROOFS.json',signer='0x7a413BB4AB62E31d62d4cD9efC8C8a8Dae37FB42';
let proofs;
if(fs.existsSync(file))proofs=JSON.parse(fs.readFileSync(file,'utf8'));
else{
 const commit=process.argv[2];if(!/^[0-9a-f]{40}$/.test(commit??''))throw Error('Supply published fixture commit');
 proofs={network:'studionet',chain_id:61999,signer,fixture_commit:commit,transactions:[],runs:{}};
}
const save=()=>fs.writeFileSync(file,JSON.stringify(proofs,null,2)+'\n');
proofs.final_readback_verified=false;save();
function broadcast(args,onHash){return new Promise((resolve,reject)=>{
 const proc=spawn(process.execPath,['--dns-result-order=ipv4first','scripts/run-cli.cjs',...args],{windowsHide:true,
  env:{...process.env,FLOW_TEST_ACCOUNT:process.env.FLOW_TEST_ACCOUNT||'studio-proof-deployer'},stdio:['ignore','pipe','pipe']});
 let carry='';proc.stderr.resume();proc.stdout.on('data',chunk=>{carry+=chunk.toString();const lines=carry.split(/\r?\n/);carry=lines.pop();
  for(const line of lines)if(/^BROADCAST_HASH 0x[0-9a-fA-F]{64}$/.test(line))onHash(line.split(' ')[1]);});
 proc.on('error',()=>reject(Error('CLI launch failed')));proc.on('close',resolve);
});}
async function tx(step,args,expected='SUCCESS',message){
 let entry=proofs.transactions.find(x=>x.step===step);
 if(!entry){entry={step,verified:false,broadcast_unknown:true,cli_arguments:args};proofs.transactions.push(entry);save();
  await broadcast(args,hash=>{entry.hash=hash;delete entry.broadcast_unknown;save();console.log(step+' '+hash);});}
 if(!entry.hash)throw Error('Unknown broadcast outcome; inspect signer history');
 Object.assign(entry,await receipt(entry.hash,expected,message),{verified:true});save();
 console.log(JSON.stringify({step,status:entry.status,execution:entry.execution,consensus:entry.consensus}));return entry;
}
async function analyze(name,fixture,bad=false){
 const path='examples/'+fixture+'.json',coordinate='Al1ranger/semantic-flow-envelope/'+proofs.fixture_commit+'/'+path;
 const args=[name,coordinate,bad?'0'.repeat(64):sha(fs.readFileSync(path))];
 const entry=await tx('analyze-'+name,['write',proofs.address,'analyze','--args',...args]);
 const key=digest({contract:proofs.address,creator:signer,nonce:name});
 if(!entry.committed){
  if(!await denied(proofs.address,'get_result',[key]))throw Error('Disagreement unexpectedly published');
  proofs.runs[name]={key,no_snapshot:true,consensus:entry.consensus};save();return null;
 }
 const result=await state(proofs.address,key);proofs.runs[name]=result;save();return {key,args,result};
}
try{
 if(await rpc('eth_chainId',[])!=='0xf22f')throw Error('Wrong chain');
 const deployed=await tx('deploy',['deploy','--contract','contracts/SemanticFlowEnvelope.py']);
 if(!deployed.committed)throw Error('Deploy uncommitted');
 proofs.address=deployed.address;proofs.source=await source(proofs.address);save();
 const reroute=await analyze('reroute-v1','reroute');
 await analyze('bottleneck-v1','bottleneck');
 await analyze('ambiguous-v1','ambiguous');
 await analyze('bad-source-v1','reroute',true);
 if(reroute){
  await tx('replay-nonce',['write',proofs.address,'analyze','--args',...reroute.args],'ERROR','Nonce used');
  if(!await denied(proofs.address,'assured_plan',[reroute.key,'0'.repeat(64)]))throw Error('Wrong-root consumer unguarded');
  proofs.wrong_root_consumer_denied=true;save();
 }
 await tx('reject-mutable-source',['write',proofs.address,'analyze','--args','mutable-source','Al1ranger/semantic-flow-envelope/main/examples/reroute.json','0'.repeat(64)],'ERROR','Invalid source specification');
 for(const [name,prior] of Object.entries(proofs.runs)){
  if(prior.no_snapshot){if(!await denied(proofs.address,'get_result',[prior.key]))throw Error('Uncommitted key became readable');continue;}
  const current=await state(proofs.address,prior.key);
  if(current.root!==prior.root)throw Error('Negative test altered snapshot');proofs.runs[name]=current;
 }
 if(proofs.transactions.some(t=>!t.verified||t.broadcast_unknown))throw Error('Unverified transaction remains');
 proofs.source=await source(proofs.address);proofs.final_readback_verified=true;
 proofs.expected_outcomes_matched={reroute:proofs.runs['reroute-v1']?.output?.status==='TEXT_FEASIBLE',
  bottleneck:proofs.runs['bottleneck-v1']?.output?.status==='TEXT_INFEASIBLE',ambiguous:proofs.runs['ambiguous-v1']?.output?.status==='AMBIGUOUS',bad:proofs.runs['bad-source-v1']?.output?.status==='HELD'};save();
 console.log(JSON.stringify({complete:true,address:proofs.address,outcomes:Object.fromEntries(Object.entries(proofs.runs).map(([k,v])=>[k,v.output?.status??'NO_COMMIT']))}));
}catch{console.error('Sanitized proof workflow stopped; inspect recorded hashes/state before retry');process.exitCode=1;}
