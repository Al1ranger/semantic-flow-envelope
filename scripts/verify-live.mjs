// Read-only: no wallet, signatures or transaction sends.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {rpc,receipt,source,state,denied} from './check.mjs';
try{
 const p=JSON.parse(fs.readFileSync('PROOFS.json','utf8'));
 assert(p.final_readback_verified);assert.equal(await rpc('eth_chainId',[]),'0xf22f');
 const code=await source(p.address);assert.equal(code.sha256,p.source.sha256);
 for(const t of p.transactions){
  const expected=t.step==='replay-nonce'?'Nonce used':['reject-mutable-source','analyze-bad-source-v1'].includes(t.step)?'Invalid source specification':undefined;
  const current=await receipt(t.hash,t.execution,expected);
  assert.equal(current.consensus,t.consensus);assert.equal(current.committed,t.committed);
  const tx=await rpc('eth_getTransactionByHash',[t.hash]);
  assert.equal((tx.from_address??tx.from).toLowerCase(),p.signer.toLowerCase());
  assert.equal((tx.to_address??tx.to).toLowerCase(),p.address.toLowerCase());
  await new Promise(r=>setTimeout(r,2100));
 }
 for(const prior of Object.values(p.runs)){
  if(prior.no_snapshot)assert(await denied(p.address,'get_result',[prior.key]));
  else{const current=await state(p.address,prior.key);assert.equal(current.root,prior.root);}
 }
 const definite=Object.values(p.runs).find(r=>r.output?.status==='TEXT_FEASIBLE');
 if(definite)assert(await denied(p.address,'assured_plan',[definite.key,'0'.repeat(64)]));
 console.log(JSON.stringify({verified:true,address:p.address,finalized_transactions:p.transactions.length,snapshots:Object.values(p.runs).filter(r=>!r.no_snapshot).length,source_sha256:code.sha256}));
}catch{console.error('Read-only live verification failed; no transaction was sent');process.exitCode=1;}
