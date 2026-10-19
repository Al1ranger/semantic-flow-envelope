import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyWitness,minCut,verifyEnvelope} from '../scripts/check.mjs';
test('residual reroute witness and semantic bottleneck verified independently',()=>{
 const s=[1,1],d=[1,1];
 assert.equal(minCut(s,d,[[true,true],[true,false]]),2);
 assert(verifyWitness(s,d,[[true,true],[true,false]],{value:2,flow:[[0,1],[1,0]],source_side_supplies:[],source_side_demands:[],cut_capacity:2})===undefined);
 assert.equal(minCut(s,d,[[true,false],[true,false]]),1);
 assert.throws(()=>verifyWitness(s,d,[[true,true],[true,false]],{value:2,flow:[[1,1],[0,0]],source_side_supplies:[],source_side_demands:[],cut_capacity:2}));
});
test('UNKNOWN envelope cannot be promoted to assured feasibility',()=>{
 const terms={unit:'files',supplies:[{quantity:1}],demands:[{quantity:1}]};
 const result={status:'AMBIGUOUS',unit:'files',demand_total:1,supply_total:1,min_unserved:0,max_unserved:1,unknown_cells:[[0,0]],
  lower:{value:0,flow:[[0]],source_side_supplies:[0],source_side_demands:[],cut_capacity:0},
  upper:{value:1,flow:[[1]],source_side_supplies:[],source_side_demands:[],cut_capacity:1}};
 assert(verifyEnvelope(terms,[['UNKNOWN']],result));
 assert.throws(()=>verifyEnvelope(terms,[['UNKNOWN']],{...result,status:'TEXT_FEASIBLE'}));
});
test('all binary 2x2 capacity networks have monotone cut bounds',()=>{
 for(let mask=0;mask<16;mask++)for(let quantities=0;quantities<16;quantities++){
  const s=[1+(quantities&1),1+((quantities>>1)&1)],d=[1+((quantities>>2)&1),1+((quantities>>3)&1)];
  const a=[[!!(mask&1),!!(mask&2)],[!!(mask&4),!!(mask&8)]];
  assert(minCut(s,d,a)<=Math.min(s[0]+s[1],d[0]+d[1]));
  for(let bit=0;bit<4;bit++){const b=a.map(r=>r.slice());b[Math.floor(bit/2)][bit%2]=true;assert(minCut(s,d,b)>=minCut(s,d,a));}
 }
});
