# Live StudioNet proofs

Contract: [0x83d33b4b26E19BE63C7Ddd08462dc967f36833f6](https://explorer-studio.genlayer.com/address/0x83d33b4b26E19BE63C7Ddd08462dc967f36833f6)

Source SHA-256: `821ac44f0cc28e687f32ee164edef02b4cd1a136dc3dc61599914fe1a7ff1456`. RPC-retrieved source matches contracts/SemanticFlowEnvelope.py after CRLF normalization.
Fixtures pinned at [0709466f63e7c9d475ebeaf0b80c992a916cbb6b](https://github.com/Al1ranger/semantic-flow-envelope/tree/0709466f63e7c9d475ebeaf0b80c992a916cbb6b/examples). Declared text fixtures, not evidence of physical supply.

| Case | Lifecycle | Execution | Consensus | Effect | Explorer |
| --- | --- | --- | --- | --- | --- |
| deploy | FINALIZED | SUCCESS | MAJORITY_AGREE | Committed | [transaction](https://explorer-studio.genlayer.com/tx/0xafedff74688c9f059cb50a11bad151e8d7b38bb4126efc5be6a0738591e56aa1) |
| analyze-reroute-v1 | FINALIZED | SUCCESS | MAJORITY_AGREE | Committed | [transaction](https://explorer-studio.genlayer.com/tx/0xee08f9a16e5b7f1478e4ca1951fca289d77b375f3d2a41aff649d64dbb58924c) |
| analyze-bottleneck-v1 | FINALIZED | SUCCESS | MAJORITY_AGREE | Committed | [transaction](https://explorer-studio.genlayer.com/tx/0x7b439dbc5a51505f6b6b975abf896165e67638a7c1dc1487644c1a99db08687d) |
| analyze-ambiguous-v1 | FINALIZED | SUCCESS | MAJORITY_AGREE | Committed | [transaction](https://explorer-studio.genlayer.com/tx/0x78d6f7fea0fc8cd0a2f2f747f65c4674ca6c4a4ec801d7bdd5f34faca3b9bb90) |
| analyze-bad-source-v1 | FINALIZED | ERROR | MAJORITY_AGREE | Expected guard error; no mutation | [transaction](https://explorer-studio.genlayer.com/tx/0x1b1094fa2c1d3dc35a66533e5d746099c21b4e89feec571b3acbad86bf02b3be) |
| analyze-bad-source-v2 | FINALIZED | SUCCESS | MAJORITY_AGREE | Committed | [transaction](https://explorer-studio.genlayer.com/tx/0xbcb9be37637e3640e63549a644584a68360d7a8c3d62f9dd930877940bef133d) |
| replay-nonce | FINALIZED | ERROR | MAJORITY_AGREE | Expected guard error; no mutation | [transaction](https://explorer-studio.genlayer.com/tx/0xa45c787c404d7d8105faf864caa480f4d9aa728fecddc6734226020a23878512) |
| reject-mutable-source | FINALIZED | ERROR | MAJORITY_AGREE | Expected guard error; no mutation | [transaction](https://explorer-studio.genlayer.com/tx/0x8c7c6f68684f1fdd624657d5f5585099b3bbbbb24c196d942883c0d5049d88ba) |

## Snapshot matrix

| Case | Status | Definite / possible / demand | Assurance |
| --- | --- | --- | --- |
| reroute-v1 | TEXT_FEASIBLE | 2 / 2 / 2 | Root-bound lower flow |
| bottleneck-v1 | TEXT_INFEASIBLE | 1 / 1 / 2 | Consumer denied |
| ambiguous-v1 | AMBIGUOUS | 0 / 1 / 1 | Consumer denied |
| bad-source-v2 | HELD | — / — / — | Consumer denied |

### reroute-v1

Key: `4de1a2e132d36a666f5426814d4a10cc79851862e3ba9167f213ea44ad46c0d7`

Input root: `1216ba7fd6c0e9329c4ac062d5f71842accefce84484328e08ea0fd88d1299b8`

Snapshot root: `9b7c26b9b7f7f2645002ef19bf1bec5423156221c9dbff74635378440c6f26f5`

```json
{
  "matrix": [
    [
      "YES",
      "YES"
    ],
    [
      "YES",
      "NO"
    ]
  ],
  "output": {
    "demand_total": 2,
    "lower": {
      "cut_capacity": 2,
      "flow": [
        [
          0,
          1
        ],
        [
          1,
          0
        ]
      ],
      "source_side_demands": [],
      "source_side_supplies": [],
      "value": 2
    },
    "max_unserved": 0,
    "min_unserved": 0,
    "status": "TEXT_FEASIBLE",
    "supply_total": 2,
    "unit": "files",
    "unknown_cells": [],
    "upper": {
      "cut_capacity": 2,
      "flow": [
        [
          0,
          1
        ],
        [
          1,
          0
        ]
      ],
      "source_side_demands": [],
      "source_side_supplies": [],
      "value": 2
    }
  }
}
```

### bottleneck-v1

Key: `f46a98b7a761c46a33b50591de19367c9dd0d5d8a98785e82d65c6d235da25d1`

Input root: `9e00f98fdb963ce21ebf3946d804d87a80335167532591c675c48cc3e8a8d93b`

Snapshot root: `6e6cd2cbdee5132f444f14cb92c60e7a17afdeebadb6e6e2c32ee8bcb5b851b9`

```json
{
  "matrix": [
    [
      "YES",
      "NO"
    ],
    [
      "YES",
      "NO"
    ]
  ],
  "output": {
    "demand_total": 2,
    "lower": {
      "cut_capacity": 1,
      "flow": [
        [
          1,
          0
        ],
        [
          0,
          0
        ]
      ],
      "source_side_demands": [
        0
      ],
      "source_side_supplies": [
        0,
        1
      ],
      "value": 1
    },
    "max_unserved": 1,
    "min_unserved": 1,
    "status": "TEXT_INFEASIBLE",
    "supply_total": 2,
    "unit": "files",
    "unknown_cells": [],
    "upper": {
      "cut_capacity": 1,
      "flow": [
        [
          1,
          0
        ],
        [
          0,
          0
        ]
      ],
      "source_side_demands": [
        0
      ],
      "source_side_supplies": [
        0,
        1
      ],
      "value": 1
    }
  }
}
```

### ambiguous-v1

Key: `e0f89be2938580eaf182295f1e24eea9493ea97627b8cfc320f0be837fa489fc`

Input root: `f52f6a034e19554073ba9697f7f263cf5e527aaba6e2c2b37e90ca60ab3650a1`

Snapshot root: `acd488e33b309b7285120ee155642b392479098a9b3085706d8ba3e9e3a4220a`

```json
{
  "matrix": [
    [
      "UNKNOWN"
    ]
  ],
  "output": {
    "demand_total": 1,
    "lower": {
      "cut_capacity": 0,
      "flow": [
        [
          0
        ]
      ],
      "source_side_demands": [],
      "source_side_supplies": [
        0
      ],
      "value": 0
    },
    "max_unserved": 1,
    "min_unserved": 0,
    "status": "AMBIGUOUS",
    "supply_total": 1,
    "unit": "files",
    "unknown_cells": [
      [
        0,
        0
      ]
    ],
    "upper": {
      "cut_capacity": 1,
      "flow": [
        [
          1
        ]
      ],
      "source_side_demands": [],
      "source_side_supplies": [],
      "value": 1
    }
  }
}
```

### bad-source-v2

Key: `32373e8ad80840ebf63c00d2d30076a7fa7df8d3289d783b0452b69e5e9bd80d`

Input root: `f8fe7848730b61ad4a568bb9bf8dd14ff671c166da2bc542855e1cb54174555f`

Snapshot root: `a7173a90f9a2ec54167c07c0ad93d3aa78ced895d0c5fdf8e6d318c7689cff82`

```json
{
  "matrix": [],
  "output": {
    "demand_total": null,
    "lower": null,
    "status": "HELD",
    "upper": null
  }
}
```

## Validation and boundaries

- 38 Python tests, 3 Node tests and 3 SDK calldata roundtrips pass; GenVM lint and SDK validation pass. Runner remains concretely pinned; the linter notes a newer version is available.
- Python exhaustively checks 1,296 ternary matrix/quantity combinations against all cuts and every UNKNOWN completion for 81 ternary 2×2 matrices. Node independently verifies primal feasibility and enumerates all dual cuts, not another augmenting-path implementation.
- Direct mode exercises only the leader. Extracted callback tests verify independent reacquisition and exact label agreement, including different matrices with the same max-flow. Live transactions exercise actual StudioNet validator consensus.
- All committed records were reread after negative tests; roots were unchanged. Wrong input-root consumer rejection was verified: true. Non-feasible and HELD consumer paths deny plans.
- Expected ERROR transactions are rejection proofs, not successful business operations. Disagreeing transactions, if present, do not publish snapshots and are not counted as success.
- The initial bad-source-v1 call used an all-numeric digest argument and finalized with Invalid source specification. It is retained as an input-guard error, not a fetched hash-mismatch proof. The alphabetic-hex bad-source-v2 call separately tests actual acquisition with a wrong commitment.
- Shared model mistakes and prompt injection remain risks. Max-flow/min-cut optimality is relative to agreed semantic labels and declared quantities. Sources are the exact artifacts analyzed, not proof of service delivery, inventory or source-author truth.
- No funds, exclusive allocations, certificates or graph-head rights exist. Do not infer real-world capacity from TEXT_FEASIBLE. Experimental, unaudited; no universal novelty or submission acceptance claim.

Machine-readable, sanitized transaction ledger and complete acquired reports: [PROOFS.json](PROOFS.json). Raw provider configuration, keys and CLI logs are excluded.
