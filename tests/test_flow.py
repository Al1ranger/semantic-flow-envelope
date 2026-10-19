import ast
import copy
import hashlib
import itertools
import json
from pathlib import Path
import re
from types import SimpleNamespace
import pytest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'contracts/SemanticFlowEnvelope.py'
TREE = ast.parse(SOURCE.read_text())
NS = {'hashlib': hashlib, 'json': json, 're': re}
exec(compile(ast.Module(body=[n for n in TREE.body if isinstance(n, (ast.FunctionDef, ast.Assign))], type_ignores=[]), str(SOURCE), 'exec'), NS)
COORD = 'Al1ranger/semantic-flow-envelope/' + 'a' * 40 + '/examples/reroute.json'


def fixture(name):
    return (ROOT / 'examples' / (name + '.json')).read_bytes()


def source_row(raw, sha=None):
    sha = sha or hashlib.sha256(raw).hexdigest()
    spec = NS['source_spec'](COORD, sha)
    return spec, {'url': spec['url'], 'http': 200, 'status': 'OK' if hashlib.sha256(raw).hexdigest() == sha else 'HASH_MISMATCH',
                  'body': raw.decode(), 'hash': hashlib.sha256(raw).hexdigest()}


def minimum_cut(supplies, demands, allowed):
    # Independent exhaustive dual oracle, NOT another augmenting-path solver.
    n, m = len(supplies), len(demands)
    infinity = sum(supplies) + sum(demands) + 1
    cuts = []
    for bits in itertools.product((False, True), repeat=n + m):
        cuts.append(sum(q for i, q in enumerate(supplies) if not bits[i])
                    + sum(q for j, q in enumerate(demands) if bits[n + j])
                    + sum(infinity for i in range(n) for j in range(m) if allowed[i][j] and bits[i] and not bits[n + j]))
    return min(cuts)


def test_residual_rerouting():
    terms = NS['parse_terms'](fixture('reroute'))
    result = NS['envelope'](terms, [['YES', 'YES'], ['YES', 'NO']])
    assert result['status'] == 'TEXT_FEASIBLE'
    assert result['lower']['flow'] == [[0, 1], [1, 0]]
    assert result['lower']['value'] == result['lower']['cut_capacity'] == 2


def test_bottleneck_despite_equal_total_capacity():
    result = NS['envelope'](NS['parse_terms'](fixture('bottleneck')), [['YES', 'NO'], ['YES', 'NO']])
    assert result['supply_total'] == result['demand_total'] == 2
    assert result['status'] == 'TEXT_INFEASIBLE'
    assert result['min_unserved'] == result['max_unserved'] == 1


def test_unknown_is_not_assured():
    result = NS['envelope'](NS['parse_terms'](fixture('ambiguous')), [['UNKNOWN']])
    assert result['status'] == 'AMBIGUOUS'
    assert result['lower']['value'] == 0 and result['upper']['value'] == 1
    assert result['unknown_cells'] == [[0, 0]]


def test_exhaustive_ternary_matrices_and_quantity_profiles():
    terms = NS['parse_terms'](fixture('reroute'))
    checked = 0
    for quantities in itertools.product((1, 2), repeat=4):
        for i, q in enumerate(quantities[:2]):
            terms['supplies'][i]['quantity'] = q
        for j, q in enumerate(quantities[2:]):
            terms['demands'][j]['quantity'] = q
        for labels in itertools.product(('YES', 'NO', 'UNKNOWN'), repeat=4):
            matrix = [list(labels[:2]), list(labels[2:])]
            result = NS['envelope'](terms, matrix)
            for bound, predicate in [('lower', lambda v: v == 'YES'), ('upper', lambda v: v != 'NO')]:
                assert result[bound]['value'] == minimum_cut(list(quantities[:2]), list(quantities[2:]), [[predicate(v) for v in row] for row in matrix])
            assert result['lower']['value'] <= result['upper']['value']
            checked += 1
    assert checked == 1296


def test_every_unknown_completion_inside_bounds():
    terms = NS['parse_terms'](fixture('reroute'))
    for labels in itertools.product(('YES', 'NO', 'UNKNOWN'), repeat=4):
        result = NS['envelope'](terms, [list(labels[:2]), list(labels[2:])])
        unknown = [i for i, v in enumerate(labels) if v == 'UNKNOWN']
        values = []
        for completion in itertools.product((False, True), repeat=len(unknown)):
            edges = [v == 'YES' for v in labels]
            for i, yes in zip(unknown, completion):
                edges[i] = yes
            values.append(minimum_cut([1, 1], [1, 1], [edges[:2], edges[2:]]))
        assert min(values) == result['lower']['value']
        assert max(values) == result['upper']['value']


@pytest.mark.parametrize('allowed,expected', [(True, 4000), (False, 0)])
def test_maximum_network(allowed, expected):
    result = NS['max_flow']([1000] * 4, [1000] * 4, [[allowed] * 4 for _ in range(4)])
    assert result['value'] == expected == result['cut_capacity']


@pytest.mark.parametrize('matrix', [[], [['YES']], [['YES', 'NO'], ['YES', True]], [['YES', 'NO'], ['YES', 'PASS']], [['YES', 'NO'], ['YES', 'NO'], ['NO', 'NO']]])
def test_matrix_requires_complete_coverage(matrix):
    with pytest.raises(ValueError):
        NS['parse_matrix']({'matrix': matrix}, 2, 2)


def test_duplicate_matrix_keys_rejected():
    with pytest.raises(ValueError):
        NS['parse_matrix']('{"matrix":[["YES"]],"matrix":[["NO"]]}', 1, 1)


@pytest.mark.parametrize('q', [True, 0, -1, 1001, 1.0, '1'])
def test_quantity_bounds(q):
    terms = NS['parse_terms'](fixture('reroute'))
    terms['supplies'][0]['quantity'] = q
    with pytest.raises(ValueError):
        NS['parse_terms'](json.dumps(terms))


def test_invalid_terms_and_caller_labels_rejected():
    terms = NS['parse_terms'](fixture('reroute'))
    for mutate in [lambda x: x.update(matrix=[['YES']]), lambda x: x['demands'][0].update(id='flex'),
                   lambda x: x['supplies'][0].update(terms=' '), lambda x: x.update(unit='USD/token')]:
        candidate = copy.deepcopy(terms)
        mutate(candidate)
        with pytest.raises(ValueError):
            NS['parse_terms'](json.dumps(candidate))
    with pytest.raises(ValueError):
        NS['parse_terms']('{"schema":"semantic-flow-v1","schema":"semantic-flow-v1"}')


@pytest.mark.parametrize('coordinate', ['https://evil.test/x.json', COORD.replace('a' * 40, 'main'), COORD.replace('examples/', '../'), COORD + '?x=y'])
def test_only_immutable_safe_coordinates(coordinate):
    with pytest.raises(ValueError):
        NS['source_spec'](coordinate, 'b' * 64)


def test_evidence_reconstruction_and_binding():
    spec, row = source_row(fixture('reroute'))
    binding = {'key': 'key', 'input_root': 'root', 'policy': NS['POLICY']}
    report = {'binding': binding, 'source': row, 'document_status': 'READY', 'matrix': [['YES', 'YES'], ['YES', 'NO']]}
    assert NS['validate_report'](report, binding, spec)['status'] == 'TEXT_FEASIBLE'
    for mutate in [lambda r: r['binding'].update(key='other'), lambda r: r['source'].update(body='{}'),
                   lambda r: r['source'].update(url='https://evil.test'), lambda r: r.update(document_status='INVALID_TERMS')]:
        bad = copy.deepcopy(report)
        mutate(bad)
        with pytest.raises(ValueError):
            NS['validate_report'](bad, binding, spec)


def test_hash_mismatch_and_schema_fail_closed():
    for raw, sha, status in [(fixture('reroute'), '0' * 64, 'ACQUISITION_FAILED'), (b'{}', None, 'INVALID_TERMS')]:
        spec, row = source_row(raw, sha)
        report = {'binding': {}, 'source': row, 'document_status': status, 'matrix': []}
        assert NS['validate_report'](report, {}, spec)['status'] == 'HELD'
        report['matrix'] = [['YES']]
        with pytest.raises(ValueError):
            NS['validate_report'](report, {}, spec)


def mock(direct_vm, raw, matrix):
    direct_vm.clear_mocks()
    direct_vm.mock_web(r'https://raw\.githubusercontent\.com/.*', {'response': {'status': 200, 'headers': {}, 'body': raw}, 'method': 'GET'})
    direct_vm.mock_llm(r'.*SEMANTIC FLOW PER-UNIT COMPATIBILITY.*', json.dumps({'matrix': matrix}))


def test_direct_assured_plan_replay_and_principal_separation(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(str(SOURCE))
    direct_vm.sender = direct_alice
    raw = fixture('reroute')
    mock(direct_vm, raw, [['YES', 'YES'], ['YES', 'NO']])
    sha = hashlib.sha256(raw).hexdigest()
    key = contract.analyze('demo', COORD, sha)
    record = contract.get_result(key)
    assert record['output']['status'] == 'TEXT_FEASIBLE'
    assert contract.assured_plan(key, record['input_root'])['flow'] == [[0, 1], [1, 0]]
    with direct_vm.expect_revert('Nonce used'):
        contract.analyze('demo', COORD, sha)
    with direct_vm.expect_revert('Input root mismatch'):
        contract.assured_plan(key, '0' * 64)
    from genlayer import Address
    direct_vm.sender = Address(direct_bob)
    other = contract.analyze('demo', COORD, sha)
    assert other != key
    assert contract.get_result(key) == record


@pytest.mark.parametrize('name,matrix,status', [('bottleneck', [['YES', 'NO'], ['YES', 'NO']], 'TEXT_INFEASIBLE'), ('ambiguous', [['UNKNOWN']], 'AMBIGUOUS'), ('reroute', [], 'HELD')])
def test_direct_closed_consumer(direct_vm, direct_deploy, direct_alice, name, matrix, status):
    contract = direct_deploy(str(SOURCE))
    direct_vm.sender = direct_alice
    raw = fixture(name)
    mock(direct_vm, raw, matrix)
    sha = '0' * 64 if status == 'HELD' else hashlib.sha256(raw).hexdigest()
    key = contract.analyze('case', COORD, sha)
    record = contract.get_result(key)
    assert record['output']['status'] == status
    with direct_vm.expect_revert('No assured textual plan'):
        contract.assured_plan(key, record['input_root'])


def test_direct_bad_input_and_unknown_snapshot(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(str(SOURCE))
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert('Invalid nonce'):
        contract.analyze('', COORD, '0' * 64)
    with direct_vm.expect_revert('Invalid source specification'):
        contract.analyze('valid', 'mutable', '0' * 64)
    with direct_vm.expect_revert('Unknown snapshot'):
        contract.get_result('missing')


def test_direct_creator_quota(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(str(SOURCE))
    direct_vm.sender = direct_alice
    raw = fixture('ambiguous')
    mock(direct_vm, raw, [['UNKNOWN']])
    for i in range(32):
        contract.analyze('quota_' + str(i), COORD, hashlib.sha256(raw).hexdigest())
    with direct_vm.expect_revert('Creator limit'):
        contract.analyze('quota_32', COORD, hashlib.sha256(raw).hexdigest())


def test_real_validator_callback_reacquires_and_rejects_opposite_labels():
    analyze = next(n for c in TREE.body if isinstance(c, ast.ClassDef) for n in c.body if isinstance(n, ast.FunctionDef) and n.name == 'analyze')
    callbacks = [n for n in analyze.body if isinstance(n, ast.FunctionDef)]
    spec, row = source_row(fixture('reroute'))
    binding = {'key': 'key', 'input_root': 'root', 'policy': NS['POLICY']}
    class Returned:
        def __init__(self, calldata):
            self.calldata = calldata
    calls = []
    labels = [['YES', 'YES'], ['YES', 'NO']]
    def web(url):
        calls.append(url)
        return SimpleNamespace(status=200, body=fixture('reroute'))
    def llm(*args, **kwargs):
        return {'matrix': labels}
    ns = dict(NS, spec=spec, binding=binding, gl=SimpleNamespace(vm=SimpleNamespace(Return=Returned), nondet=SimpleNamespace(web=SimpleNamespace(get=web), exec_prompt=llm)))
    exec(compile(ast.Module(body=[n for n in TREE.body if isinstance(n, ast.FunctionDef)], type_ignores=[]), str(SOURCE), 'exec'), ns)
    exec(compile(ast.Module(body=callbacks, type_ignores=[]), str(SOURCE), 'exec'), ns)
    leader = ns['observe']()
    assert ns['validator'](Returned(leader)) is True
    assert len(calls) == 2
    labels = [['NO', 'NO'], ['NO', 'NO']]
    assert ns['validator'](Returned(leader)) is False
    assert len(calls) == 3
    labels = [['YES', 'YES'], ['YES', 'YES']]
    assert ns['validator'](Returned(leader)) is False  # Same aggregate max-flow is not enough.
    assert len(calls) == 4
    bad = copy.deepcopy(leader)
    bad['binding']['key'] = 'substitution'
    assert ns['validator'](Returned(bad)) is False
    assert ns['validator'](object()) is False


@pytest.mark.parametrize('http,raw,status', [(404, b'not found', 'HTTP_ERROR'), (200, b'', 'SIZE_ERROR'),
                                         (200, b'x' * 6001, 'SIZE_ERROR'), (200, b'\xff', 'ENCODING_ERROR')])
def test_actual_acquisition_failures(http, raw, status):
    spec, _ = source_row(fixture('reroute'))
    ns = dict(NS, gl=SimpleNamespace(nondet=SimpleNamespace(web=SimpleNamespace(get=lambda url: SimpleNamespace(status=http, body=raw)))))
    exec(compile(ast.Module(body=[n for n in TREE.body if isinstance(n, ast.FunctionDef)], type_ignores=[]), str(SOURCE), 'exec'), ns)
    row = ns['fetch_source'](spec)
    assert row['status'] == status
    assert row['body'] == row['hash'] == ''
    assert ns['source_ok'](spec, row) is False


def test_post_consensus_revalidation_prevents_forged_evidence():
    class Expected(Exception):
        pass
    analyze = copy.deepcopy(next(n for c in TREE.body if isinstance(c, ast.ClassDef) for n in c.body if isinstance(n, ast.FunctionDef) and n.name == 'analyze'))
    analyze.decorator_list = []
    spec, row = source_row(fixture('reroute'))
    def forged_run(observe, validator):
        record = observe()
        record['source']['body'] = '{}'
        return record
    vm = SimpleNamespace(UserError=Expected, run_nondet_unsafe=forged_run)
    gl = SimpleNamespace(message=SimpleNamespace(sender_address='creator', contract_address='contract'), vm=vm,
                         nondet=SimpleNamespace(web=SimpleNamespace(get=lambda url: SimpleNamespace(status=200, body=fixture('reroute'))),
                                                exec_prompt=lambda *args, **kwargs: {'matrix': [['YES', 'YES'], ['YES', 'NO']]}))
    ns = dict(NS, gl=gl)
    exec(compile(ast.Module(body=[n for n in TREE.body if isinstance(n, ast.FunctionDef)] + [analyze], type_ignores=[]), str(SOURCE), 'exec'), ns)
    state = SimpleNamespace(snapshots={}, creator_counts={})
    with pytest.raises(Expected, match='Invalid consensus report'):
        ns['analyze'](state, 'forgery', COORD, spec['sha256'])
    assert not state.snapshots and not state.creator_counts
