import io
import json
import os
import subprocess
import tarfile
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

import check_one_ip_release
from package_release import package
from prepare_worker_assets import prepare
from select_worker_version import select_version


class OneIpReleaseTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.base = Path(temporary.name)
        self.source = self.base / 'build'
        (self.source / 'one-ip/assets').mkdir(parents=True)
        self.commit = 'a' * 40
        for name, body in {
            'index.html': 'desktop', 'sw.js': 'built', 'manifest.webmanifest': '{}',
            'one-ip/index.html': '<script src="/one-ip/assets/app.js"></script>',
            'one-ip/assets/app.js': 'module',
        }.items():
            (self.source / name).write_text(body)
        self.archive = self.base / 'release.tar.gz'
        package(self.source, self.commit, self.archive)

    def test_extraction_reuses_exact_artifact_and_never_overwrites_a_directory(self):
        destination = self.base / 'dist'
        prepare(self.archive, self.commit, destination)
        self.assertEqual((destination / 'one-ip/assets/app.js').read_bytes(), b'module')
        with self.assertRaises(FileExistsError):
            prepare(self.archive, self.commit, destination)
        with self.assertRaisesRegex(ValueError, 'commit'):
            prepare(self.archive, 'b' * 40, self.base / 'wrong')

    def test_duplicate_sha_tags_resolve_to_the_latest_version_id(self):
        versions = [{
            'id': f'{letter * 8}-{letter * 4}-{letter * 4}-{letter * 4}-{letter * 12}',
            'annotations': {'workers/tag': self.commit},
            'metadata': {'created_on': f'2026-10-{day}T00:00:00Z'},
        } for letter, day in [('a', '20'), ('b', '21')]]
        self.assertEqual(select_version(versions, self.commit), versions[1]['id'])
        self.assertEqual(select_version(list(reversed(versions)), self.commit), versions[1]['id'])
        with self.assertRaisesRegex(ValueError, 'not found'):
            select_version(versions, 'c' * 40)
        with self.assertRaisesRegex(ValueError, 'invalid release SHA'):
            select_version(versions, '--bad')

    def test_deploy_preflight_fails_without_credentials_and_has_no_external_effects(self):
        script = Path(__file__).with_name('deploy.sh').resolve()
        environment = {
            'PATH': os.environ['PATH'], 'DEPLOY_HOST': 'example.invalid', 'DEPLOY_PORT': '22',
            'DEPLOY_USER': 'gmlhub-deploy', 'DEPLOY_SSH_KEY': 'fixture-private-key',
            'DEPLOY_KNOWN_HOSTS': 'fixture-host-key', 'OPERATION': 'deploy', 'RELEASE_SHA': self.commit,
        }
        for name in ['DEPLOY_HOST', 'DEPLOY_PORT', 'DEPLOY_USER', 'DEPLOY_SSH_KEY', 'DEPLOY_KNOWN_HOSTS']:
            env = environment.copy()
            del env[name]
            result = subprocess.run(['bash', str(script), '--check-only'], env=env, cwd=self.base, capture_output=True)
            self.assertNotEqual(result.returncode, 0, name)
            self.assertNotIn(b'fixture-private-key', result.stderr)
        result = subprocess.run(['bash', str(script), '--check-only'], env=environment, cwd=self.base, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_extraction_rejects_traversal_and_tampered_builds(self):
        with tarfile.open(self.archive, 'w:gz') as stream:
            entry = tarfile.TarInfo('../escape')
            entry.size = 1
            stream.addfile(entry, io.BytesIO(b'x'))
        with self.assertRaisesRegex(ValueError, 'unsafe'):
            prepare(self.archive, self.commit, self.base / 'unsafe')
        self.assertFalse((self.base / 'escape').exists())
        package(self.source, self.commit, self.archive)
        (self.source / 'one-ip/assets/app.js').write_text('tampered')
        with self.assertRaisesRegex(ValueError, 'checksum'), patch.object(check_one_ip_release, 'get') as get:
            check_one_ip_release.check(self.commit, self.source)
        get.assert_not_called()

    def test_real_http_probe_requires_correct_revision_api_shapes_and_exact_assets(self):
        responses = {
            '/one-ip/api/deployment': json.dumps({'commit': self.commit}).encode(),
            '/one-ip/api/browser/challenges': b'[{"configured":false}]',
            '/one-ip/api/ip/health': b'{"ip":"1.1.1.1"}',
            '/one-ip/': (self.source / 'one-ip/index.html').read_bytes(),
            '/one-ip/network/ip/1.1.1.1': (self.source / 'one-ip/index.html').read_bytes(),
            '/one-ip/assets/app.js': b'module',
        }
        seen = []
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                path = self.path.split('?')[0]
                seen.append((path, self.headers.get('Accept')))
                body = responses.get(path, (404, b''))
                status, body = body if isinstance(body, tuple) else (200, body)
                self.send_response(status)
                if status == 302:
                    self.send_header('Location', '/one-ip/')
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, *_):
                pass

        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        origin = 'http://127.0.0.1:' + str(server.server_port)
        check_one_ip_release.check(self.commit, self.source, origin)
        self.assertIn(('/one-ip/network/ip/1.1.1.1', 'text/html'), seen)
        cases = [
            ('/one-ip/api/deployment', b'{"commit":"wrong"}'),
            ('/one-ip/api/deployment', b'[]'),
            ('/one-ip/api/browser/challenges', b'[null]'),
            ('/one-ip/api/browser/challenges', b'[]'),
            ('/one-ip/api/ip/health', b'{"ip":"8.8.8.8"}'),
            ('/one-ip/api/ip/health', b'null'),
            ('/one-ip/', b'desktop'),
            ('/one-ip/network/ip/1.1.1.1', (302, b'')),
            ('/one-ip/assets/app.js', (404, b'not found')),
        ]
        for path, body in cases:
            with self.subTest(path=path, body=body):
                previous = responses[path]
                responses[path] = body
                try:
                    with self.assertRaises(ValueError):
                        check_one_ip_release.check(self.commit, self.source, origin)
                finally:
                    responses[path] = previous


if __name__ == '__main__':
    unittest.main()
