import contextlib
import io
import json
import os
import subprocess
import sys
import tempfile
import textwrap
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

import deploy_worker_release
from package_release import package


class WorkerDeployTests(unittest.TestCase):
    desktop = '0fe2516' + 'a' * 33
    previous = '716f1d0' + 'b' * 33
    commit = 'c' * 40
    version_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'

    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.base = Path(temporary.name)
        self.source = self.base / 'dist'
        (self.source / 'one-ip/assets').mkdir(parents=True)
        for name, body in {
            'index.html': 'desktop', 'sw.js': 'built', 'manifest.webmanifest': '{}',
            'one-ip/index.html': '<script src="/one-ip/assets/app.js"></script>',
            'one-ip/assets/app.js': 'module',
        }.items():
            (self.source / name).write_text(body)
        package(self.source, self.commit, self.base / 'release.tar.gz')
        self.state_file = self.base / 'state.json'
        self.log = self.base / 'cli.jsonl'
        self.snapshot = self.base / 'worker-recovery.json'
        self.state = {
            'desktop': self.desktop, 'worker': self.previous, 'new': self.commit,
            'recovery_commit': self.desktop, 'recovery_id': self.version_id,
            'active_id': 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        }
        self.save_state()
        executable = self.base / 'pnpm'
        executable.write_text('#!' + sys.executable + '\n' + textwrap.dedent('''\
            import json, os, sys
            from pathlib import Path
            state_file = Path(os.environ['MOCK_WORKER_STATE'])
            state = json.loads(state_file.read_text())
            args = sys.argv[5:]
            with open(os.environ['MOCK_WORKER_LOG'], 'a') as log:
                log.write(json.dumps(args) + '\\n')
            operation = args[:2]
            if state.get('cli_failure') == args[0] or state.get('cli_failure') == ' '.join(operation):
                print('fixture-secret-do-not-print', file=sys.stderr)
                sys.exit(1)
            if operation == ['versions', 'list']:
                versions = [{
                    'id': state['recovery_id'],
                    'annotations': {'workers/tag': state['recovery_commit']},
                    'metadata': {'created_on': '2026-10-30T00:00:00Z'},
                }]
                print('bad-json' if state.get('bad_versions') else json.dumps(
                    [] if state.get('missing_version') else versions))
            elif operation == ['versions', 'view']:
                print(json.dumps({
                    'id': state['recovery_id'],
                    'annotations': {'workers/tag': state['recovery_commit']},
                    'resources': {'bindings': [{
                        'name': 'RELEASE_SHA', 'type': 'plain_text',
                        'text': state.get('binding_commit', state['recovery_commit']),
                    }]},
                }))
            elif args[0] == 'deploy':
                state['worker'] = state['new']
                state['active_id'] = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
                if state.get('desktop_changes'):
                    state['desktop'] = state['new']
                state_file.write_text(json.dumps(state))
                if state.get('partial_deploy_failure'):
                    sys.exit(1)
            elif operation == ['versions', 'deploy']:
                assert args[args.index('--version-id') + 1] == state['recovery_id']
                assert args[args.index('--percentage') + 1] == '100'
                state['worker'] = state['recovery_commit']
                state['active_id'] = state['recovery_id']
                if state.get('public_recovery_mismatch'):
                    state['worker'] = state['new']
                state_file.write_text(json.dumps(state))
            elif operation == ['deployments', 'status']:
                print(json.dumps({'versions': [{
                    'version_id': state['active_id'],
                    'percentage': 50 if state.get('traffic_mismatch') else 100,
                }]}))
            else:
                raise AssertionError(args)
        '''))
        executable.chmod(0o755)
        environment = {
            'PATH': str(self.base) + os.pathsep + os.environ['PATH'],
            'MOCK_WORKER_STATE': str(self.state_file), 'MOCK_WORKER_LOG': str(self.log),
            'CLOUDFLARE_API_TOKEN': 'fixture-token', 'CLOUDFLARE_ACCOUNT_ID': 'a' * 32,
        }
        self.environment = patch.dict(os.environ, environment)
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.requests = []
        source, state_file, requests = self.source, self.state_file, self.requests

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                state = json.loads(state_file.read_text())
                path = self.path.split('?')[0]
                requests.append(path)
                status = 200
                if path == '/version.json':
                    body = json.dumps({'commit': state.get('public_desktop', state['desktop'])}).encode()
                elif path == '/one-ip/api/deployment':
                    body = json.dumps({'commit': state['worker']}).encode()
                elif path == '/one-ip/api/browser/challenges':
                    body = b'[{"configured":false}]'
                    if state.get('check_failure') and state['worker'] == state['new']:
                        status, body = 403, b'configuration unavailable'
                elif path == '/one-ip/api/ip/health':
                    body = b'{"ip":"1.1.1.1"}'
                elif path in ['/one-ip/', '/one-ip/network/ip/1.1.1.1']:
                    body = (source / 'one-ip/index.html').read_bytes()
                elif path == '/one-ip/assets/app.js':
                    body = b'module'
                else:
                    status, body = 404, b''
                self.send_response(status)
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, *_):
                pass

        self.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)
        self.origin = 'http://127.0.0.1:' + str(self.server.server_port)

    def save_state(self, **changes):
        self.state.update(changes)
        self.state_file.write_text(json.dumps(self.state))

    def cli_calls(self):
        return [json.loads(line) for line in self.log.read_text().splitlines()] if self.log.exists() else []

    def mutations(self):
        return [call for call in self.cli_calls()
                if call[0] == 'deploy' or call[:2] == ['versions', 'deploy']]

    def run_deploy(self):
        with contextlib.redirect_stdout(io.StringIO()), patch.object(deploy_worker_release.time, 'sleep'):
            deploy_worker_release.deploy(self.commit, self.source, self.snapshot, self.origin)

    def test_success_keeps_new_worker_and_records_desktop_aligned_recovery(self):
        self.run_deploy()
        self.assertEqual(len(self.mutations()), 1)
        self.assertEqual(json.loads(self.state_file.read_text())['worker'], self.commit)
        self.assertEqual(json.loads(self.snapshot.read_text()), {
            'desktop_commit': self.desktop, 'previous_worker_commit': self.previous,
            'recovery_version_id': self.version_id,
        })
        self.assertEqual(self.snapshot.stat().st_mode & 0o777, 0o600)
        self.assertIn('/one-ip/network/ip/1.1.1.1', self.requests)
        self.assertIn('/one-ip/assets/app.js', self.requests)

    def test_check_failure_restores_desktop_worker_and_still_fails(self):
        self.save_state(check_failure=True)
        with self.assertRaisesRegex(ValueError, 'recovery verified.*remains FAILED'):
            self.run_deploy()
        self.assertEqual(len(self.mutations()), 2)
        self.assertEqual(json.loads(self.state_file.read_text())['worker'], self.desktop)
        self.assertEqual(self.cli_calls()[-1][:2], ['deployments', 'status'])

    def test_failed_cli_deploy_may_have_mutated_worker_and_is_recovered(self):
        self.save_state(partial_deploy_failure=True)
        with self.assertRaisesRegex(ValueError, 'recovery verified'):
            self.run_deploy()
        self.assertEqual(json.loads(self.state_file.read_text())['worker'], self.desktop)

    def test_failed_recovery_never_claims_consistency(self):
        for changes in [
            {'cli_failure': 'versions deploy'},
            {'cli_failure': 'deployments status'},
            {'traffic_mismatch': True},
            {'public_recovery_mismatch': True},
        ]:
            with self.subTest(changes=changes):
                self.snapshot.unlink(missing_ok=True)
                self.save_state(**{key: False for key in [
                    'cli_failure', 'traffic_mismatch', 'public_recovery_mismatch',
                ]}, check_failure=True)
                self.save_state(**changes)
                with self.assertRaisesRegex(RuntimeError, 'recovery FAILED; consistency is NOT verified') as error:
                    self.run_deploy()
                self.assertNotIn('fixture-secret-do-not-print', str(error.exception))

    def test_changed_desktop_blocks_automatic_recovery(self):
        self.save_state(check_failure=True, desktop_changes=True)
        with self.assertRaisesRegex(RuntimeError, 'Desktop changed; refusing'):
            self.run_deploy()
        self.assertEqual(len(self.mutations()), 1)

    def test_missing_or_unverifiable_target_blocks_deployment(self):
        for changes in [
            {'missing_version': True},
            {'bad_versions': True},
            {'recovery_id': '--invalid'},
            {'binding_commit': self.previous},
            {'public_desktop': []},
            {'cli_failure': 'versions list'},
            {'cli_failure': 'versions view'},
        ]:
            with self.subTest(changes=changes):
                original = self.state.copy()
                self.save_state(**changes)
                try:
                    with self.assertRaises((ValueError, TypeError)):
                        self.run_deploy()
                    self.assertEqual(self.mutations(), [])
                    self.assertFalse(self.snapshot.exists())
                finally:
                    self.state = original
                    self.save_state()

    def test_configuration_and_snapshot_failures_block_mutations(self):
        for variable in ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID']:
            with self.subTest(variable=variable), patch.dict(os.environ, {variable: ''}):
                with self.assertRaisesRegex(ValueError, 'configuration'):
                    self.run_deploy()
        self.assertEqual(self.cli_calls(), [])
        with patch.object(deploy_worker_release.os, 'fsync', side_effect=OSError('snapshot disk failed')):
            with self.assertRaisesRegex(OSError, 'snapshot disk failed'):
                self.run_deploy()
        self.assertEqual(self.mutations(), [])
        self.snapshot.unlink(missing_ok=True)
        with patch.object(deploy_worker_release.json, 'load', return_value={}):
            with self.assertRaisesRegex(ValueError, 'snapshot verification'):
                self.run_deploy()
        self.assertEqual(self.mutations(), [])
        with self.assertRaises(FileExistsError):
            self.run_deploy()
        self.assertEqual(self.mutations(), [])

    def test_preflight_changes_block_deployment(self):
        for commits in [
            [self.desktop, self.previous, self.commit],
            [self.desktop, self.previous, self.desktop, self.commit],
        ]:
            with self.subTest(commits=commits):
                self.snapshot.unlink(missing_ok=True)
                with patch.object(deploy_worker_release, 'public_commit', side_effect=commits):
                    with self.assertRaisesRegex(ValueError, 'changed during preflight'):
                        self.run_deploy()
                self.assertEqual(self.mutations(), [])

    def test_tampered_build_and_invalid_commit_block_even_preflight_requests(self):
        with self.assertRaisesRegex(ValueError, 'Invalid release SHA'):
            deploy_worker_release.deploy('--invalid', self.source, self.snapshot, self.origin)
        (self.source / 'one-ip/assets/app.js').write_text('tampered')
        with self.assertRaisesRegex(ValueError, 'checksum'):
            self.run_deploy()
        self.assertEqual(self.cli_calls(), [])
        self.assertEqual(self.requests, [])

    def test_cli_reports_failure_even_after_verified_recovery(self):
        self.save_state(check_failure=True)
        result = subprocess.run([
            sys.executable, str(Path(deploy_worker_release.__file__).resolve()),
            self.commit, str(self.source), '--snapshot', str(self.snapshot), '--origin', self.origin,
        ], capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 1)
        self.assertIn('recovery verified', result.stderr)
        self.assertIn('remains FAILED', result.stderr)
        self.assertNotIn('fixture-token', result.stdout + result.stderr)
        self.assertEqual(json.loads(self.state_file.read_text())['worker'], self.desktop)


if __name__ == '__main__':
    unittest.main()
