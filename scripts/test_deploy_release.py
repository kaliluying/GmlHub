import io
import json
import select
import signal
import subprocess
import sys
import tarfile
import tempfile
import threading
import unittest
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import urlopen
from unittest.mock import patch

import deploy_release

from deploy_release import activate, deploy, parse_command, unpack, validate_release
from package_release import package


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.base = Path(self.temporary.name)
        self.root = self.base / 'server'
        self.root.mkdir()
        (self.root / 'shared' / 'well-known').mkdir(parents=True)

    def bundle(self, commit, text='first', asset='app-first.js'):
        source = self.base / ('build-' + commit)
        source.mkdir(exist_ok=True)
        (source / 'assets').mkdir(exist_ok=True)
        (source / 'index.html').write_text('<html>' + text + '</html>')
        (source / 'sw.js').write_text('const CACHE_NAME = "gmlhub-shell-built"')
        (source / 'manifest.webmanifest').write_text('{}')
        (source / 'assets' / asset).write_text(text)
        archive = self.base / (commit + '.tar.gz')
        return archive, package(source, commit, archive)

    @staticmethod
    def healthy(directory, commit):
        validate_release(directory, commit)

    def test_success_switches_to_a_complete_release_and_keeps_previous_assets(self):
        first, second = 'a' * 40, 'b' * 40
        for commit, text in [(first, 'first'), (second, 'second')]:
            archive, digest = self.bundle(commit, text, 'app-' + text + '.js')
            deploy(self.root, commit, digest, archive, self.healthy)
        self.assertEqual((self.root / 'current' / 'index.html').read_text(), '<html>second</html>')
        self.assertEqual((self.root / 'shared/assets/app-first.js').read_text(), 'first')
        self.assertEqual((self.root / 'shared/assets/app-second.js').read_text(), 'second')
        self.assertTrue((self.root / 'releases' / first).is_dir())
        self.assertTrue((self.root / 'current/.well-known').is_symlink())
        activate(self.root, first, self.healthy)
        self.assertEqual((self.root / 'current/index.html').read_text(), '<html>first</html>')

    def test_failed_probe_restores_the_previous_release(self):
        first, second = 'a' * 40, 'b' * 40
        archive, digest = self.bundle(first)
        deploy(self.root, first, digest, archive, self.healthy)
        before = (self.root / 'current').resolve()
        archive, digest = self.bundle(second, 'second', 'app-second.js')
        def unavailable(directory, commit):
            raise RuntimeError('origin is unavailable')
        with self.assertRaisesRegex(RuntimeError, 'unavailable'):
            deploy(self.root, second, digest, archive, unavailable)
        self.assertEqual((self.root / 'current').resolve(), before)

    def test_initial_failed_probe_leaves_no_active_release(self):
        archive, digest = self.bundle('a' * 40)
        with self.assertRaises(RuntimeError):
            deploy(self.root, 'a' * 40, digest, archive,
                   lambda *_: (_ for _ in ()).throw(RuntimeError('failed')))
        self.assertFalse((self.root / 'current').exists())
        self.assertFalse((self.root / 'current').is_symlink())

    def test_repeated_packaging_is_identical_and_deployment_is_idempotent(self):
        commit = 'a' * 40
        archive, digest = self.bundle(commit)
        deploy(self.root, commit, digest, archive, self.healthy)
        repeated = package(self.base / ('build-' + commit), commit, archive)
        self.assertEqual(digest, repeated)
        deploy(self.root, commit, repeated, archive, self.healthy)

    def test_same_commit_cannot_be_replaced_with_different_bytes(self):
        commit = 'a' * 40
        archive, digest = self.bundle(commit)
        deploy(self.root, commit, digest, archive, self.healthy)
        archive, changed = self.bundle(commit, 'changed')
        with self.assertRaisesRegex(ValueError, 'different build'):
            deploy(self.root, commit, changed, archive, self.healthy)
        self.assertEqual((self.root / 'current/index.html').read_text(), '<html>first</html>')

    def test_bad_archive_digest_is_rejected_before_extraction(self):
        archive, _ = self.bundle('a' * 40)
        with self.assertRaisesRegex(ValueError, 'checksum'):
            deploy(self.root, 'a' * 40, '0' * 64, archive, self.healthy)
        self.assertFalse((self.root / 'current').is_symlink())

    def test_modified_files_block_rollback(self):
        commit = 'a' * 40
        archive, digest = self.bundle(commit)
        deploy(self.root, commit, digest, archive, self.healthy)
        (self.root / 'current/index.html').write_text('modified')
        with self.assertRaisesRegex(ValueError, 'checksum'):
            activate(self.root, commit, self.healthy)

    def test_shared_asset_collision_cannot_overwrite_an_old_asset(self):
        first, second = 'a' * 40, 'b' * 40
        archive, digest = self.bundle(first)
        deploy(self.root, first, digest, archive, self.healthy)
        archive, digest = self.bundle(second, 'conflicting')
        with self.assertRaisesRegex(ValueError, 'collision'):
            deploy(self.root, second, digest, archive, self.healthy)
        self.assertEqual((self.root / 'shared/assets/app-first.js').read_text(), 'first')

    def test_unsafe_tar_entries_are_rejected(self):
        for name, kind in [('../escape', tarfile.REGTYPE), ('/escape', tarfile.REGTYPE),
                           ('assets/link', tarfile.SYMTYPE), ('.ssh/key', tarfile.REGTYPE)]:
            with self.subTest(name=name):
                archive = self.base / 'unsafe.tar.gz'
                with tarfile.open(archive, 'w:gz') as stream:
                    entry = tarfile.TarInfo(name)
                    entry.type = kind
                    entry.size = 1 if kind == tarfile.REGTYPE else 0
                    stream.addfile(entry, io.BytesIO(b'x') if entry.size else None)
                with self.assertRaisesRegex(ValueError, 'unsafe'):
                    unpack(archive, self.root)

    def test_ssh_commands_do_not_accept_shell_or_path_injection(self):
        good = 'a' * 40
        self.assertEqual(parse_command('rollback ' + good), ['rollback', good])
        for command in ['', 'bash', 'rollback ../../etc', 'rollback ' + good + '; id',
                        'deploy ' + good, 'rollback ' + good + ' extra']:
            with self.subTest(command=command), self.assertRaises(ValueError):
                parse_command(command)

    def test_manifest_cannot_traverse_outside_release(self):
        directory = self.base / 'unsafe-manifest'
        directory.mkdir()
        files = {'index.html': '0', 'sw.js': '0', 'manifest.webmanifest': '0', '../secret': '0'}
        (directory / 'version.json').write_text(json.dumps({'commit': 'a' * 40, 'files': files}))
        with self.assertRaises(ValueError):
            validate_release(directory, 'a' * 40)

    def test_baota_control_files_do_not_change_the_application_manifest(self):
        commit = 'a' * 40
        archive, digest = self.bundle(commit)
        deploy(self.root, commit, digest, archive, self.healthy)
        for name in ['.user.ini', '.htaccess']:
            (self.root / 'current' / name).write_text('server-managed')
        validate_release(self.root / 'current', commit)
        (self.root / 'current/unexpected.txt').write_text('unexpected')
        with self.assertRaisesRegex(ValueError, 'file list'):
            validate_release(self.root / 'current', commit)

    def test_publish_and_rollback_through_a_real_http_server(self):
        root = self.root
        class Handler(SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, directory=str(root / 'current'), **kwargs)
            def log_message(self, *_):
                pass
        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        def cleanup():
            server.shutdown()
            server.server_close()
            thread.join()
        self.addCleanup(cleanup)
        origin = 'http://127.0.0.1:' + str(server.server_port)
        def http_probe(directory, commit):
            manifest = validate_release(directory, commit)
            for name in ['version.json', *manifest['files']]:
                with urlopen(origin + '/' + name, timeout=3) as response:
                    self.assertEqual(response.read(), (directory / name).read_bytes())
        first, second = 'a' * 40, 'b' * 40
        for commit, text in [(first, 'first'), (second, 'second')]:
            archive, digest = self.bundle(commit, text, 'app-' + text + '.js')
            deploy(self.root, commit, digest, archive, http_probe)
        activate(self.root, first, http_probe)
        with urlopen(origin + '/version.json', timeout=3) as response:
            self.assertEqual(json.load(response)['commit'], first)

    def test_gzip_corruption_or_truncation_is_rejected(self):
        archive, _ = self.bundle('a' * 40)
        original = archive.read_bytes()
        wrong_crc = bytearray(original)
        wrong_crc[-8] ^= 1
        for content in [bytes(wrong_crc), original[:-8]]:
            archive.write_bytes(content)
            with self.assertRaises((OSError, EOFError)):
                unpack(archive, self.root)

    def test_nested_version_json_is_packaged_and_verified(self):
        commit = 'a' * 40
        archive, _ = self.bundle(commit)
        source = self.base / ('build-' + commit)
        (source / 'assets/version.json').write_text('{"asset":true}')
        digest = package(source, commit, archive)
        deploy(self.root, commit, digest, archive, self.healthy)
        manifest = validate_release(self.root / 'current', commit)
        self.assertIn('assets/version.json', manifest['files'])
        (self.root / 'current/assets/version.json').write_text('changed')
        with self.assertRaisesRegex(ValueError, 'checksum'):
            validate_release(self.root / 'current', commit)

    def test_termination_during_probe_restores_the_old_release(self):
        first, second = 'a' * 40, 'b' * 40
        for commit, text in [(first, 'first'), (second, 'second')]:
            archive, digest = self.bundle(commit, text, 'app-' + text + '.js')
            deploy(self.root, commit, digest, archive, self.healthy)
        code = '''
import sys, time
from pathlib import Path
sys.path.insert(0, sys.argv[1])
import deploy_release as module
module.ROOT = Path(sys.argv[2])
activate = module.activate
def slow_check(*args):
    print('CHECKING', flush=True)
    time.sleep(60)
module.activate = lambda root, commit: activate(root, commit, slow_check)
module.main()
'''
        for signum in [signal.SIGTERM, signal.SIGHUP]:
            activate(self.root, first, self.healthy)
            child = subprocess.Popen(
                [sys.executable, '-c', code, str(Path(__file__).parent), str(self.root)],
                env={'SSH_ORIGINAL_COMMAND': 'rollback ' + second},
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
            )
            try:
                self.assertTrue(select.select([child.stdout], [], [], 5)[0])
                self.assertEqual(child.stdout.readline().strip(), 'CHECKING')
                child.send_signal(signum)
                child.communicate(timeout=5)
                self.assertNotEqual(child.returncode, 0)
                self.assertEqual((self.root / 'current').resolve().parent.name, first)
            finally:
                if child.poll() is None:
                    child.kill()
                    child.communicate()

    def test_interruption_immediately_after_switch_also_rolls_back(self):
        first, second = 'a' * 40, 'b' * 40
        for commit, text in [(first, 'first'), (second, 'second')]:
            archive, digest = self.bundle(commit, text, 'app-' + text + '.js')
            deploy(self.root, commit, digest, archive, self.healthy)
        activate(self.root, first, self.healthy)
        original = deploy_release.switch
        def interrupted(root, target):
            original(root, target)
            if target.parent.name == second:
                raise InterruptedError('signal at switch boundary')
        with patch.object(deploy_release, 'switch', interrupted):
            with self.assertRaises(InterruptedError):
                activate(self.root, second, self.healthy)
        self.assertEqual((self.root / 'current').resolve().parent.name, first)


if __name__ == '__main__':
    unittest.main()
