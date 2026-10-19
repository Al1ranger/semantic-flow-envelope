import fs from 'node:fs';
const p=JSON.parse(fs.readFileSync('PROOFS.json','utf8'));
if(!p.final_readback_verified||p.transactions.some(t=>!t.verified||t.status!=='FINALIZED'))throw Error('Incomplete proofs');
const repo='https://github.com/Al1ranger/semantic-flow-envelope',explorer='https://explorer-studio.genlayer.com';
const lines=['# Live StudioNet proofs','',`Contract: [${p.address}](${explorer}/address/${p.address})`,'',
 `Source SHA-256: \`${p.source.sha256}\`. RPC-retrieved source matches contracts/SemanticFlowEnvelope.py after CRLF normalization.`,
 `Fixtures pinned at [${p.fixture_commit}](${repo}/tree/${p.fixture_commit}/examples). Declared text fixtures, not evidence of physical supply.`,
 '', '| Case | Lifecycle | Execution | Consensus | Effect | Explorer |','| --- | --- | --- | --- | --- | --- |'];
for(const t of p.transactions)lines.push(`| ${t.step} | ${t.status} | ${t.execution} | ${t.consensus} | ${t.committed?'Committed':t.execution==='ERROR'?'Expected guard error; no mutation':'No committed result'} | [transaction](${explorer}/tx/${t.hash}) |`);
lines.push('','## Snapshot matrix','', '| Case | Status | Definite / possible / demand | Assurance |','| --- | --- | --- | --- |');
for(const [name,r] of Object.entries(p.runs))lines.push(r.no_snapshot?`| ${name} | NO_COMMIT | — | Denied: no snapshot |`:
 `| ${name} | ${r.output.status} | ${r.output.lower?.value??'—'} / ${r.output.upper?.value??'—'} / ${r.output.demand_total??'—'} | ${r.output.status==='TEXT_FEASIBLE'?'Root-bound lower flow':'Consumer denied'} |`);
for(const [name,r] of Object.entries(p.runs))if(!r.no_snapshot)lines.push('',`### ${name}`,'',`Key: \`${r.key}\``,'',`Input root: \`${r.input_root}\``,'',`Snapshot root: \`${r.root}\``,
 '', '```json',JSON.stringify({matrix:r.report.matrix,output:r.output},null,2),'```');
lines.push('','## Validation and boundaries','',
 '- 38 Python tests, 3 Node tests and 3 SDK calldata roundtrips pass; GenVM lint and SDK validation pass. Runner remains concretely pinned; the linter notes a newer version is available.',
 '- Python exhaustively checks 1,296 ternary matrix/quantity combinations against all cuts and every UNKNOWN completion for 81 ternary 2×2 matrices. Node independently verifies primal feasibility and enumerates all dual cuts, not another augmenting-path implementation.',
 '- Direct mode exercises only the leader. Extracted callback tests verify independent reacquisition and exact label agreement, including different matrices with the same max-flow. Live transactions exercise actual StudioNet validator consensus.',
 '- All committed records were reread after negative tests; roots were unchanged. Wrong input-root consumer rejection was verified: '+p.wrong_root_consumer_denied+'. Non-feasible and HELD consumer paths deny plans.',
 '- Expected ERROR transactions are rejection proofs, not successful business operations. Disagreeing transactions, if present, do not publish snapshots and are not counted as success.',
 '- The initial bad-source-v1 call used an all-numeric digest argument and finalized with Invalid source specification. It is retained as an input-guard error, not a fetched hash-mismatch proof. The alphabetic-hex bad-source-v2 call separately tests actual acquisition with a wrong commitment.',
 '- Shared model mistakes and prompt injection remain risks. Max-flow/min-cut optimality is relative to agreed semantic labels and declared quantities. Sources are the exact artifacts analyzed, not proof of service delivery, inventory or source-author truth.',
 '- No funds, exclusive allocations, certificates or graph-head rights exist. Do not infer real-world capacity from TEXT_FEASIBLE. Experimental, unaudited; no universal novelty or submission acceptance claim.',
 '', 'Machine-readable, sanitized transaction ledger and complete acquired reports: [PROOFS.json](PROOFS.json). Raw provider configuration, keys and CLI logs are excluded.','');
fs.writeFileSync('LIVE_PROOFS.md',lines.join('\n'));
const title='SemanticFlowEnvelope — Consensus-Bounded Capacity Feasibility';
const outcomes=Object.entries(p.runs).map(([name,r])=>`${name.split('-v1')[0]}: ${r.output?.status??'NO_COMMIT'}`).join('; ');
const description=`SemanticFlowEnvelope analyzes published supply/demand terms using independent document acquisition and AI compatibility judgments. Leader and validators fetch the full commit-pinned source, verify SHA-256 and schema, and classify every pair YES, NO or UNKNOWN. Exact report equality is required.\n\nYES-only and YES+UNKNOWN max-flows give definite and possible bounds while conserving shared capacity. Each includes a flow and equal-capacity min-cut witness, independently checked by exhaustive cut enumeration. Only full definite flow enables a root-bound plan; uncertainty or source failure cannot. Immutable sender/contract/nonce bindings prevent overwrite and replay.\n\nLive StudioNet: ${outcomes}. Tests: 38 Python + 3 Node; 3 SDK roundtrips. Source matches deployment.\n\nDeclared terms and quantities are analyzed, not verified inventory or service delivery. No funds or exclusive rights are allocated.`;
if(title.length>80||description.length>1000)throw Error('Submission length limit');
const evidence=[repo,repo+'/blob/main/contracts/SemanticFlowEnvelope.py',repo+'/blob/main/README.md',repo+'/blob/main/LIVE_PROOFS.md',explorer+'/address/'+p.address,
 ...p.transactions.map(t=>explorer+'/tx/'+t.hash)];
fs.writeFileSync('SUBMISSION.md',`Contribution type: Builder → Intelligent Contracts\n\nTitle:\n${title}\n\nNotes / Description (${description.length}/1000):\n\n${description}\n\nEvidence URLs:\n\n${evidence.map(x=>'- '+x).join('\n')}\n`);
console.log(JSON.stringify({proofs:p.transactions.length,title_chars:title.length,description_chars:description.length}));
