# SemanticFlowEnvelope

**Consensus-interpreted terms, conserved capacity, checkable feasibility bounds.**

Given published supply and demand terms, can all demand be matched without spending one declared unit twice? A source document supplies natural-language per-unit specifications and integer quantities. The contract independently acquires that document and asks GenLayer validators to interpret every supply-demand pairing. It computes two global capacity bounds, not a winner, score, graph update or certificate.

Experimental infrastructure. Quantities are **declared constraints**, not independently verified inventory. No delivery, real-world availability, payment, physical allocation, exclusive entitlement or legal enforceability is established. No audit or submission acceptance is guaranteed.

## Why GenLayer

Ordinary deterministic flow code cannot interpret alternatives, exclusions or underspecified capabilities in natural-language terms. Each validator independently fetches the whole source and derives a complete `YES / NO / UNKNOWN` compatibility matrix. These labels materially change the reachable allocation and deficit. The max-flow solver itself is classical deterministic code; it is not the AI contribution or an invented algorithm.

## Architecture

```text
Commit-pinned published JSON, exact SHA-256
                  ↓ independent GET + full-body hash + strict schema
Leader and validators independently interpret EVERY per-unit pair
                  ↓ exact whole-report agreement
YES edges → definite max-flow    YES + UNKNOWN → possible max-flow
                  ↓ independent primal-flow / dual-cut checks
Immutable snapshot and root-bound assured-plan view
```

Only one atomic write, `analyze(nonce, coordinate, expected_sha)`, exists. There is no administrator or persisted proposal graph. Reports contain full acquired text, all labels and source integrity fields. The deterministic section reconstructs the source binding and derives the result again after consensus.

## Decision rules

| Condition | Result | Assured plan |
| --- | --- | --- |
| Definite flow fills all demand | `TEXT_FEASIBLE` | Definite flow only |
| Possible flow cannot fill demand | `TEXT_INFEASIBLE` | Denied |
| Definite deficit, possible completion | `AMBIGUOUS` | Denied |
| Unavailable, mismatched or invalid source | `HELD` | Denied |
| Validator disagreement / malformed model output | No committed snapshot | None |

`min_unserved = demand_total - possible_flow` and `max_unserved = demand_total - definite_flow`. These are conditional on the semantic labels being correct. UNKNOWN is never silently treated as assured compatibility. Each flow preserves all supply and demand capacity limits and includes a min-cut witness whose capacity equals the flow value. The JS checker independently enumerates every cut instead of copying the augmenting-path algorithm.

## Inputs and bounds

Coordinates must be `OWNER/REPO/FULL_40_HEX_COMMIT/path.json`. URLs are derived solely under HTTPS `raw.githubusercontent.com`; mutable branch names and arbitrary hosts are rejected. Source body: 1–6000 bytes, HTTP 200, strict UTF-8 and exact SHA-256. Historical commitment is not freshness or author trust.

Schema `semantic-flow-v1`: common `unit`, 1–4 supplies, 1–4 demands, globally unique IDs, integer quantities 1–1000, 10–500-byte authored terms. Unknown fields and duplicate JSON keys are rejected. Each supply unit can be assigned to any individually YES-compatible demand, subject to shared quantity conservation. Terms must describe fungible per-unit properties; bundles, conditional batch pricing and cross-unit dependencies are unsupported.

## Workflows

- [Reroute](examples/reroute.json): one flexible PNG/SVG unit and one PNG-only unit must serve PNG plus SVG demand. A greedy flexible→PNG assignment fails; reverse residual edges recover flexible→SVG and PNG-only→PNG.
- [Bottleneck](examples/bottleneck.json): total supply equals total demand, but no supply serves SVG. The min-cut proves a deficit.
- [Ambiguous](examples/ambiguous.json): unspecified illustration format cannot assure SVG compatibility. The possible bound can fill demand, but the definite bound cannot.
- Wrong source commitment: `HELD`, no semantic matrix or assured plan.

These are developer-authored public fixtures demonstrating analysis of text. They are not independent claims about an actual provider. Actual live outputs and failed agreement, if any, belong in [LIVE_PROOFS.md](LIVE_PROOFS.md); planned outcomes are not transaction evidence.

## Install and test

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
npm ci --ignore-scripts
.\.venv\Scripts\genvm-lint.exe check contracts/SemanticFlowEnvelope.py
.\.venv\Scripts\python.exe -m pytest tests -q
node --test tests/witness.test.mjs
npm run test:sdk
```

Python tests include 1,296 ternary-matrix / quantity-profile cases against an independent exhaustive cut oracle, every unknown completion for 81 ternary 2×2 matrices, residual rerouting, source integrity, schema, replay, quota, root binding, consumer denial and the actual extracted validator callback. Direct mode executes only the leader; callback tests use isolated mocks. Neither replaces live validator consensus. A narrowly scoped Windows gltest open-temp-file cleanup shim does not suppress contract exceptions.

## Deploy and interact

Use an encrypted dedicated test account and native keystore signing, never keys in source or environment files. StudioNet is gasless; do not fund it. Pin CLI version `genlayer@0.39.2`.

```powershell
npm install -g genlayer@0.39.2
genlayer network set studionet
genlayer account use YOUR_DEDICATED_TEST_ACCOUNT
genlayer account unlock
genlayer deploy --contract contracts/SemanticFlowEnvelope.py
genlayer write ADDRESS analyze --args demo OWNER/REPO/FULL_COMMIT/examples/reroute.json FULL_SHA256
genlayer receipt TRANSACTION_HASH
genlayer code ADDRESS
genlayer call ADDRESS get_result --args SNAPSHOT_KEY
genlayer call ADDRESS assured_plan --args SNAPSHOT_KEY INPUT_ROOT
```

Check `FINALIZED`, successful leader execution, agreeing consensus and committed snapshot; finalization alone is not success. Compare Explorer/RPC source with this exact contract. `node scripts/check.mjs source ADDRESS` compares normalized source; `node scripts/check.mjs state ADDRESS KEY` verifies roots, capacities, all cuts and consumer behavior.

`scripts/complete-proofs.mjs PUBLISHED_FIXTURE_COMMIT` deploys and executes the bounded demo serially using `FLOW_TEST_ACCOUNT` (an account name, not a key). It journals hashes before waiting, suppresses raw CLI/provider logs and refuses to rebroadcast uncertain outcomes. Resume a recorded hash by rerunning; no-hash ambiguity requires a history/nonce audit first. The process-local context adapter does not change global GenLayer configuration. Set `FLOW_CLI_PATH` if the locally installed CLI differs from the workspace default.

## Security and limitations

Contract, sender, nonce, policy, exact source and full report are committed into deterministic roots. A committed nonce cannot be reused. Each sender is capped at 32 snapshots, not a Sybil-resistant global rate limit. Consumers must bind the expected input root. Anyone can read; there are no value transfers, administrators, upgrades or cross-contract writes.

Exact agreement reduces semantic divergence but may fail liveness; a shared model error can still pass consensus. Prompt injection cannot be completely prevented. Source hashes prove byte identity, not authority or physical truth. Witnesses prove optimality **relative to agreed labels and declared quantities**. This interface must not be sold as verified inventory or service settlement. See [architecture](docs/architecture.md) and [security](SECURITY.md).

Max-flow/min-cut background: [MIT OpenCourseWare](https://ocw.mit.edu/courses/6-046j-design-and-analysis-of-algorithms-spring-2015/resources/lecture-13-incremental-improvement-max-flow-min-cut/).
